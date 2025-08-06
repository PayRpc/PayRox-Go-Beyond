// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../utils/GasOptimizationUtils.sol";

/// @notice Minimal interface to query routes from the ManifestDispatcher (optional convenience)
interface IManifestDispatcherView {
    struct Route { address facet; bytes32 codehash; }
    function routes(bytes4 selector) external view returns (address facet, bytes32 codehash);
    function activeRoot() external view returns (bytes32);
    function frozen() external view returns (bool);
}

library PayRoxProxyRouterEvents {
    event PayRoxProxyRouterInitialized(address owner, address dispatcher, bytes32 dispatcherCodehash, bool strictCodehash);
    event DispatcherUpdated(address oldDispatcher, address newDispatcher, bytes32 codehash);
    event DispatcherCodehashSet(bytes32 oldCodehash, bytes32 newCodehash);
    event StrictCodehashSet(bool enabled);
    event PausedSet(bool paused);
    event SelectorsForbidden(bytes4[] selectors, bool forbidden);
    event Frozen();
    
    // Additional events for PayRox ecosystem integration
    event ProxyRouteResolved(bytes4 indexed selector, address indexed dispatcher, address indexed facet);
    event EmergencyAction(string action, address indexed actor, uint256 timestamp);
    event BatchExecuted(uint256 callCount, uint256 gasUsed, uint256 timestamp);
}

library ProxyRouterErrors {
    error AlreadyInitialized();
    error NotOwner();
    error Paused();
    error Frozen();
    error DispatcherZero();
    error DispatcherCodehashMismatch(bytes32 expected, bytes32 actual);
    error ForbiddenSelector(bytes4 selector);
    error IncompatibleDispatcher(address dispatcher);
    error BatchTooLarge(uint256 size, uint256 maxSize);
    error EmptyBatch();
}

/// @notice Batch call structure for gas-optimized operations
struct BatchCall {
    bytes4 selector;
    bytes data;
}

/// @title PayRoxProxyRouter
/// @notice Compatibility shim that lets an existing proxy instance route calls to the PayRox ManifestDispatcher.
/// @dev Deploy this as a new implementation and upgrade your proxy to it. Then initialize with a dispatcher.
contract PayRoxProxyRouter {

    // ─────────────────────────────────────────────────────────────────────────────
    // Constants
    // ─────────────────────────────────────────────────────────────────────────────
    
    uint256 public constant MAX_BATCH_SIZE = 50; // Prevent DoS via large batches

    // ─────────────────────────────────────────────────────────────────────────────
    // Storage layout (lives in the proxy's storage when used as implementation)
    // ─────────────────────────────────────────────────────────────────────────────

    // slot 0
    address private _owner;
    // slot 1
    address private _dispatcher;
    // slot 2
    bytes32 private _dispatcherCodehash; // expected EXTCODEHASH of dispatcher
    // slot 3
    bool private _strictCodehash;        // if true, check dispatcher codehash on every call
    // slot 4
    bool private _paused;                // emergency pause
    // slot 5
    bool private _frozen;                // one-way freeze of admin mutators

    // mapping(bytes4 => bool) forbiddenSelectors
    mapping(bytes4 => bool) private _forbidden;

    // ─────────────────────────────────────────────────────────────────────────────
    // Modifiers
    // ─────────────────────────────────────────────────────────────────────────────

    modifier onlyOwner() {
        if (msg.sender != _owner) revert ProxyRouterErrors.NotOwner();
        _;
    }

    modifier notFrozen() {
        if (_frozen) revert ProxyRouterErrors.Frozen();
        _;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Admin / setup
    // ─────────────────────────────────────────────────────────────────────────────

    /// @notice One-time initializer. Must be called after your proxy is upgraded to this implementation.
    /// @param owner_ New owner of the router’s admin functions.
    /// @param dispatcher_ Address of the ManifestDispatcher to route to.
    /// @param expectedCodehash EXTCODEHASH(dispatcher_) you intend to enforce.
    /// @param strictCodehash_ If true, every call checks dispatcher codehash before delegatecall.
    function initializeProxyRouter(
        address owner_,
        address dispatcher_,
        bytes32 expectedCodehash,
        bool strictCodehash_
    ) external {
        if (_owner != address(0)) revert ProxyRouterErrors.AlreadyInitialized();
        if (dispatcher_ == address(0)) revert ProxyRouterErrors.DispatcherZero();

        // Validate dispatcher supports PayRox ManifestDispatcher interface
        _validateDispatcherCompatibility(dispatcher_);

        _owner = owner_ == address(0) ? msg.sender : owner_;
        _dispatcher = dispatcher_;
        _dispatcherCodehash = expectedCodehash;
        _strictCodehash = strictCodehash_;
        _paused = false;
        _frozen = false;

        emit PayRoxProxyRouterEvents.PayRoxProxyRouterInitialized(_owner, _dispatcher, _dispatcherCodehash, _strictCodehash);
    }

    /// @notice Set a new dispatcher. Requires not frozen.
    function setDispatcher(address dispatcher_, bytes32 expectedCodehash) external onlyOwner notFrozen {
        if (dispatcher_ == address(0)) revert ProxyRouterErrors.DispatcherZero();
        
        // Validate dispatcher supports PayRox ManifestDispatcher interface
        _validateDispatcherCompatibility(dispatcher_);
        
        address old = _dispatcher;
        _dispatcher = dispatcher_;
        _dispatcherCodehash = expectedCodehash;
        emit PayRoxProxyRouterEvents.DispatcherUpdated(old, dispatcher_, expectedCodehash);
    }

    /// @notice Update expected dispatcher codehash (e.g., after dispatcher redeploy).
    function setDispatcherCodehash(bytes32 expected) external onlyOwner notFrozen {
        bytes32 old = _dispatcherCodehash;
        _dispatcherCodehash = expected;
        emit PayRoxProxyRouterEvents.DispatcherCodehashSet(old, expected);
    }

    /// @notice Toggle strict per-call codehash checks.
    function setStrictCodehash(bool enabled) external onlyOwner notFrozen {
        _strictCodehash = enabled;
        emit PayRoxProxyRouterEvents.StrictCodehashSet(enabled);
    }

    /// @notice Pause/unpause routing.
    function setPaused(bool paused_) external onlyOwner {
        _paused = paused_;
        emit PayRoxProxyRouterEvents.PausedSet(paused_);
    }

    /// @notice Forbid/allow a batch of selectors (hot kill-switch).
    function setForbiddenSelectors(bytes4[] calldata selectors, bool forbidden) external onlyOwner {
        for (uint256 i = 0; i < selectors.length; i++) {
            _forbidden[selectors[i]] = forbidden;
        }
        emit PayRoxProxyRouterEvents.SelectorsForbidden(selectors, forbidden);
    }

    /// @notice One-way freeze of all mutating admin functions (except pause and forbidden set).
    /// @dev After freeze, you cannot change dispatcher/codehash/strict flags. Pause and selector blocks still work.
    function freeze() external onlyOwner {
        _frozen = true;
        emit PayRoxProxyRouterEvents.Frozen();
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Routing
    // ─────────────────────────────────────────────────────────────────────────────

    receive() external payable {}
    fallback() external payable {
        if (_paused) revert ProxyRouterErrors.Paused();

        bytes4 sel;
        assembly {
            sel := calldataload(0)
        }
        if (_forbidden[sel]) revert ProxyRouterErrors.ForbiddenSelector(sel);

        address target = _dispatcher;
        if (_strictCodehash) {
            bytes32 got = _extcodehash(target);
            if (got != _dispatcherCodehash) {
                revert ProxyRouterErrors.DispatcherCodehashMismatch(_dispatcherCodehash, got);
            }
        }

        // Optional: Emit route resolution event for monitoring
        // Note: This adds gas cost but provides valuable integration tracking
        // Uncomment if you need detailed routing analytics
        // try IManifestDispatcherView(target).routes(sel) returns (address facet, bytes32) {
        //     emit PayRoxProxyRouterEvents.ProxyRouteResolved(sel, target, facet);
        // } catch {}

        // delegatecall to dispatcher with full calldata; bubble exact returndata
        assembly {
            let ptr := mload(0x40)
            calldatacopy(ptr, 0, calldatasize())
            let result := delegatecall(gas(), target, ptr, calldatasize(), 0, 0)
            let size := returndatasize()
            returndatacopy(ptr, 0, size)
            switch result
            case 0 { revert(ptr, size) }
            default { return(ptr, size) }
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Batch Operations - Gas Optimization
    // ─────────────────────────────────────────────────────────────────────────────

    /// @notice Execute multiple calls in a single transaction with gas optimization
    /// @dev Uses GasOptimizationUtils for efficient batch processing
    /// @param calls Array of BatchCall structs containing selector and data
    /// @return results Array of return data from each call
    function batchExecute(BatchCall[] calldata calls) 
        external 
        returns (bytes[] memory results) 
    {
        if (_paused) revert ProxyRouterErrors.Paused();
        
        uint256 callCount = calls.length;
        if (callCount == 0) revert ProxyRouterErrors.EmptyBatch();
        if (callCount > MAX_BATCH_SIZE) revert ProxyRouterErrors.BatchTooLarge(callCount, MAX_BATCH_SIZE);
        
        address dispatcherAddr = _dispatcher;
        if (dispatcherAddr == address(0)) revert ProxyRouterErrors.DispatcherZero();
        
        // Validate codehash if strict mode enabled
        if (_strictCodehash) {
            bytes32 actualHash = _extcodehash(dispatcherAddr);
            if (actualHash != _dispatcherCodehash) {
                revert ProxyRouterErrors.DispatcherCodehashMismatch(_dispatcherCodehash, actualHash);
            }
        }
        
        // Prepare batch data
        address[] memory targets = new address[](callCount);
        bytes[] memory callData = new bytes[](callCount);
        
        for (uint256 i = 0; i < callCount; i++) {
            bytes4 selector = calls[i].selector;
            
            // Check forbidden selectors
            if (_forbidden[selector]) {
                revert ProxyRouterErrors.ForbiddenSelector(selector);
            }
            
            targets[i] = dispatcherAddr;
            callData[i] = abi.encodePacked(selector, calls[i].data);
        }
        
        // Execute batch through GasOptimizationUtils
        uint256 gasBefore = gasleft();
        results = GasOptimizationUtils.batchCall(targets, callData);
        uint256 gasUsed = gasBefore - gasleft();
        
        emit PayRoxProxyRouterEvents.BatchExecuted(callCount, gasUsed, block.timestamp);
        
        return results;
    }

    /// @notice Execute a batch of identical calls to different facets
    /// @dev Optimized for cases where the same function is called on multiple facets
    /// @param selector The function selector to call
    /// @param targets Array of facet addresses
    /// @param data The calldata (without selector) to send to each facet
    /// @return results Array of return data from each call
    function batchCallSameFunction(
        bytes4 selector,
        address[] calldata targets,
        bytes calldata data
    ) external returns (bytes[] memory results) {
        if (_paused) revert ProxyRouterErrors.Paused();
        
        uint256 callCount = targets.length;
        if (callCount == 0) revert ProxyRouterErrors.EmptyBatch();
        if (callCount > MAX_BATCH_SIZE) revert ProxyRouterErrors.BatchTooLarge(callCount, MAX_BATCH_SIZE);
        
        // Check forbidden selector
        if (_forbidden[selector]) {
            revert ProxyRouterErrors.ForbiddenSelector(selector);
        }
        
        // Prepare batch data
        bytes[] memory callData = new bytes[](callCount);
        bytes memory fullCallData = abi.encodePacked(selector, data);
        
        for (uint256 i = 0; i < callCount; i++) {
            callData[i] = fullCallData;
        }
        
        // Execute batch through GasOptimizationUtils
        uint256 gasBefore = gasleft();
        results = GasOptimizationUtils.batchCall(targets, callData);
        uint256 gasUsed = gasBefore - gasleft();
        
        emit PayRoxProxyRouterEvents.BatchExecuted(callCount, gasUsed, block.timestamp);
        
        return results;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Views / convenience
    // ─────────────────────────────────────────────────────────────────────────────

    function owner() external view returns (address) { return _owner; }
    function dispatcher() external view returns (address) { return _dispatcher; }
    function dispatcherCodehash() external view returns (bytes32) { return _dispatcherCodehash; }
    function strictCodehash() external view returns (bool) { return _strictCodehash; }
    function paused() external view returns (bool) { return _paused; }
    function frozen() external view returns (bool) { return _frozen; }
    function isForbidden(bytes4 selector) external view returns (bool) { return _forbidden[selector]; }

    /// @notice Convenience helper to read current route from the dispatcher (if it supports the view).
    function getRoute(bytes4 selector) external view returns (address facet, bytes32 codehash) {
        (facet, codehash) = IManifestDispatcherView(_dispatcher).routes(selector);
    }

    /// @notice Get the active manifest root from the dispatcher
    function getActiveManifestRoot() external view returns (bytes32) {
        return IManifestDispatcherView(_dispatcher).activeRoot();
    }

    /// @notice Check if the dispatcher is frozen
    function isDispatcherFrozen() external view returns (bool) {
        return IManifestDispatcherView(_dispatcher).frozen();
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Internals
    // ─────────────────────────────────────────────────────────────────────────────

    function _extcodehash(address a) internal view returns (bytes32 h) {
        assembly { h := extcodehash(a) }
    }

    /// @notice Validate that the dispatcher supports PayRox ManifestDispatcher interface
    function _validateDispatcherCompatibility(address dispatcher_) internal view {
        try IManifestDispatcherView(dispatcher_).activeRoot() returns (bytes32) {
            // Successfully called activeRoot, likely compatible
            return;
        } catch {
            revert ProxyRouterErrors.IncompatibleDispatcher(dispatcher_);
        }
    }
}
