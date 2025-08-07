// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title [FACET_NAME]
 * @notice PayRox facet following native patterns from ExampleFacetA/B
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
    // Add facet-specific state here
}

function _layout() private pure returns (Layout storage l) {
    bytes32 slot = STORAGE_SLOT;
    assembly { l.slot := slot }
}

contract [FACET_NAME] {
    using SafeERC20 for IERC20;

    /// ------------------------
    /// Events
    /// ------------------------
    event [FACET_NAME]Initialized(address indexed operator, uint256 timestamp);

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
    /// Initialization (no dispatcher enforcement like natives)
    /// ------------------------
    function initialize[FACET_NAME](address operator_) external {
        if (operator_ == address(0)) revert Unauthorized();
        
        Layout storage l = _layout();
        if (l.initialized) revert AlreadyInitialized();
        
        l.initialized = true;
        l.operator = operator_;
        l.paused = false;
        
        emit [FACET_NAME]Initialized(operator_, block.timestamp);
    }

    /// ------------------------
    /// Admin Functions (operator-gated like ExampleFacetB)
    /// ------------------------
    function setPaused(bool _paused) external onlyOperator {
        _layout().paused = _paused;
    }

    /// ------------------------
    /// Core Business Logic (native security patterns)
    /// ------------------------
    function exampleFunction(uint256 param)
        external
        whenInitialized
        whenNotPaused
    {
        // Implement business logic
        Layout storage l = _layout();
        // Use l.state for storage access
    }

    /// ------------------------
    /// View Functions
    /// ------------------------
    function is[FACET_NAME]Initialized() external view returns (bool) {
        return _layout().initialized;
    }

    function is[FACET_NAME]Paused() external view returns (bool) {
        return _layout().paused;
    }
}