// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Template: Facet.Core@2.0.0
// Hash: {{TEMPLATE_HASH}}
// Generated: {{TIMESTAMP}}

import "../utils/LibDiamond.sol";

/// ---------- Standard Errors (gas-efficient) ----------
error NotInitialized();
error AlreadyInitialized();
error Paused();
error Unauthorized();
error InvalidParam();
error Reentrancy();

/// ---------- Storage (namespaced, collision-safe) ----------
bytes32 constant {{FACET_NAME_UPPER}}_SLOT = keccak256("payrox.facet.{{FACET_NAME_LOWER}}.v1");

struct {{FacetName}}Layout {
    // Custom storage fields (filled by generator)
    {{CUSTOM_STORAGE_FIELDS}}
    
    // Standard lifecycle & security (always present)
    bool initialized;
    bool paused;
    address operator;
    uint8 version;
    uint256 _reentrancy; // 1=unlocked, 2=locked
    uint256 nonce;       // For unique ID generation
}

function _s() pure returns ({{FacetName}}Layout storage l) {
    bytes32 slot = {{FACET_NAME_UPPER}}_SLOT;
    assembly { l.slot := slot }
}

/**
 * @title {{FacetName}}
 * @notice {{FACET_DESCRIPTION}}
 * @dev Facet-safe: namespaced storage, custom reentrancy, dispatcher gating
 * @custom:archetype core
 * @custom:version 2.0.0
 */
contract {{FacetName}} {
    
    /// ---------- Events ----------
    event {{FacetName}}Initialized(address indexed operator, uint256 timestamp);
    event PauseStatusChanged(bool paused);
    {{CUSTOM_EVENTS}}

    /// ---------- Modifiers (security-first) ----------
    modifier onlyDispatcher() {
        LibDiamond.enforceManifestCall();
        _;
    }
    
    modifier onlyOperator() {
        if (msg.sender != _s().operator) revert Unauthorized();
        _;
    }
    
    modifier whenInitialized() {
        if (!_s().initialized) revert NotInitialized();
        _;
    }
    
    modifier whenNotPaused() {
        if (_s().paused) revert Paused();
        _;
    }
    
    modifier nonReentrant() {
        {{FacetName}}Layout storage l = _s();
        if (l._reentrancy == 2) revert Reentrancy();
        l._reentrancy = 2;
        _;
        l._reentrancy = 1;
    }

    /// ---------- Initialization (no constructor pattern) ----------
    function initialize{{FacetName}}(
        address operator_
        {{CUSTOM_INIT_PARAMS}}
    ) external onlyDispatcher {
        if (operator_ == address(0)) revert Unauthorized();
        
        {{FacetName}}Layout storage l = _s();
        if (l.initialized) revert AlreadyInitialized();

        l.initialized = true;
        l.operator = operator_;
        l.version = 1;
        l.paused = false;
        l._reentrancy = 1;
        
        {{CUSTOM_INIT_LOGIC}}

        emit {{FacetName}}Initialized(operator_, block.timestamp);
    }

    /// ---------- Admin Functions (operator-gated via dispatcher) ----------
    function setPaused(bool paused_) external onlyDispatcher onlyOperator whenInitialized {
        _s().paused = paused_;
        emit PauseStatusChanged(paused_);
    }

    {{CUSTOM_ADMIN_FUNCTIONS}}

    /// ---------- Core Business Logic (filled by generator) ----------
    {{CUSTOM_CORE_FUNCTIONS}}

    /// ---------- View Functions ----------
    function is{{FacetName}}Initialized() external view returns (bool) {
        return _s().initialized;
    }
    
    function get{{FacetName}}Version() external view returns (uint8) {
        return _s().version;
    }
    
    function is{{FacetName}}Paused() external view returns (bool) {
        return _s().paused;
    }

    {{CUSTOM_VIEW_FUNCTIONS}}

    /// ---------- Manifest Integration (REQUIRED) ----------
    function getFacetInfo()
        external
        pure
        returns (string memory name, string memory version, bytes4[] memory selectors)
    {
        name = "{{FACET_NAME_CLEAN}}";
        version = "2.0.0";

        // Exact selector count (no zeros, prevents manifest failures)
        selectors = new bytes4[]({{SELECTOR_COUNT}});
        uint256 i = 0;
        
        // Standard selectors (always present)
        selectors[i++] = this.initialize{{FacetName}}.selector;
        selectors[i++] = this.setPaused.selector;
        selectors[i++] = this.is{{FacetName}}Initialized.selector;
        selectors[i++] = this.get{{FacetName}}Version.selector;
        selectors[i++] = this.is{{FacetName}}Paused.selector;
        
        {{CUSTOM_SELECTORS}}
    }
}
