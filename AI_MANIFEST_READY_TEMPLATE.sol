// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title [FACET_NAME]
 * @notice PayRox facet following native patterns with manifest integration
 * @dev Standalone contract for manifest-dispatcher routing
 */

/// ------------------------
/// Errors (gas-efficient custom errors)
/// ------------------------
error NotInitialized();
error AlreadyInitialized();
error Paused();
error Unauthorized();

/// ------------------------
/// Storage (native pattern: direct slots, no LibDiamond)
/// ------------------------
bytes32 constant STORAGE_SLOT = keccak256("payrox.facet.[facet_name].v1");

struct Layout {
    bool initialized;
    bool paused;
    address operator;
    uint8 version;
    // Add facet-specific state here
}

contract [FACET_NAME] {
    using SafeERC20 for IERC20;

    function _layout() private pure returns (Layout storage l) {
        bytes32 slot = STORAGE_SLOT;
        assembly { l.slot := slot }
    }

    /// ------------------------
    /// Events (indexed for manifest monitoring)
    /// ------------------------
    event [FACET_NAME]Initialized(address indexed operator, uint256 timestamp);
    event [FACET_NAME]ActionExecuted(address indexed user, bytes32 indexed actionHash);

    /// ------------------------
    /// Modifiers (native PayRox pattern - facet-owned)
    /// ------------------------
    modifier whenInitialized() {
        if (!_layout().initialized) revert NotInitialized();
        _;
    }

    modifier whenNotPaused() {
        if (_layout().paused) revert Paused();
        _;
    }

    modifier onlyOperator() {
        if (msg.sender != _layout().operator) revert Unauthorized();
        _;
    }

    /// ------------------------
    /// Initialization (manifest-compatible)
    /// ------------------------
    function initialize[FACET_NAME](address operator_) external {
        if (operator_ == address(0)) revert Unauthorized();
        
        Layout storage l = _layout();
        if (l.initialized) revert AlreadyInitialized();
        
        l.initialized = true;
        l.operator = operator_;
        l.version = 1;
        l.paused = false;
        
        emit [FACET_NAME]Initialized(operator_, block.timestamp);
    }

    /// ------------------------
    /// Core Business Logic (native security patterns)
    /// ------------------------
    function executeAction(bytes32 actionData)
        external
        whenInitialized
        whenNotPaused
    {
        Layout storage l = _layout();
        
        // Implement business logic using l.state
        
        emit [FACET_NAME]ActionExecuted(msg.sender, actionData);
    }

    /// ------------------------
    /// View Functions
    /// ------------------------
    function is[FACET_NAME]Initialized() external view returns (bool) {
        return _layout().initialized;
    }

    function get[FACET_NAME]Version() external view returns (uint8) {
        return _layout().version;
    }

    /// ------------------------
    /// Manifest Integration (REQUIRED for PayRox deployment)
    /// ------------------------
    function getFacetInfo()
        external
        pure
        returns (string memory name, string memory version, bytes4[] memory selectors)
    {
        name = "[FACET_NAME]";
        version = "1.0.0";

        // CRITICAL: All external function selectors for manifest routing
        selectors = new bytes4[](4);
        selectors[0] = this.initialize[FACET_NAME].selector;
        selectors[1] = this.executeAction.selector;
        selectors[2] = this.is[FACET_NAME]Initialized.selector;
        selectors[3] = this.get[FACET_NAME]Version.selector;
        // Add all other external function selectors
    }
}