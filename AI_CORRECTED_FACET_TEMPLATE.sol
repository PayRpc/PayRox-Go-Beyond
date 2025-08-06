// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../utils/LibDiamond.sol";

/**
 * @title [FACET_NAME]
 * @notice Production-ready PayRox facet following native patterns
 * @dev Generated using AI-learned patterns from native contracts
 */

/// ------------------------
/// Errors (gas-efficient custom errors)
/// ------------------------
error NotInitialized();
error AlreadyInitialized();
error ContractPaused();
error ReentrancyDetected();
error UnauthorizedAccess();

/// ------------------------
/// Structs and Types (define before usage)
/// ------------------------
// Define any structs HERE before using in mappings
// struct ExampleType {
//     uint256 value;        // NO visibility keywords in struct members
//     address account;      // NO public/private/internal/external
// }

/// ------------------------
/// Storage Library (isolated per-facet storage)
/// ------------------------
library [FACET_NAME]Storage {
    bytes32 internal constant STORAGE_SLOT = keccak256("payrox.production.facet.storage.[facet_name].v1");

    struct Layout {
        // Define state variables here
        mapping(address => uint256) balances;
        // mapping(uint256 => ExampleType) examples;  // Use defined structs
        uint256 totalSupply;
        
        // Lifecycle management
        bool initialized;
        uint8 version;
        
        // Security controls
        uint256 _reentrancyStatus; // 1=unlocked, 2=locked
        bool paused;
    }

    function layout() internal pure returns (Layout storage l) {
        bytes32 slot = STORAGE_SLOT;
        assembly { l.slot := slot }
    }
}

contract [FACET_NAME] {
    using SafeERC20 for IERC20;

    /// ------------------------
    /// Events
    /// ------------------------
    event [FACET_NAME]Initialized(address indexed dispatcher, uint256 timestamp);
    event [FACET_NAME]FunctionCalled(bytes4 indexed selector, address indexed caller);

    /// ------------------------
    /// Modifiers (native PayRox security stack)
    /// ------------------------
    modifier onlyDispatcher() {
        LibDiamond.enforceManifestCall();  // CORRECT: Function exists
        _;
    }

    modifier onlyRole(bytes32 role) {
        LibDiamond.requireRole(role);      // CORRECT: Function exists
        _;
    }

    modifier nonReentrant() {
        [FACET_NAME]Storage.Layout storage ds = [FACET_NAME]Storage.layout();
        if (ds._reentrancyStatus == 2) revert ReentrancyDetected();
        ds._reentrancyStatus = 2;
        _;
        ds._reentrancyStatus = 1;
    }

    modifier whenNotPaused() {
        if ([FACET_NAME]Storage.layout().paused) revert ContractPaused();
        _;
    }

    modifier onlyInitialized() {
        if (![FACET_NAME]Storage.layout().initialized) revert NotInitialized();
        _;
    }

    /// ------------------------
    /// Initialization (dispatcher-gated)
    /// ------------------------
    function initialize[FACET_NAME]() external onlyDispatcher {
        [FACET_NAME]Storage.Layout storage ds = [FACET_NAME]Storage.layout();
        if (ds.initialized) revert AlreadyInitialized();
        
        ds.initialized = true;
        ds.version = 1;
        ds._reentrancyStatus = 1;  // Initialize reentrancy guard
        ds.paused = false;
        
        emit [FACET_NAME]Initialized(msg.sender, block.timestamp);
    }

    /// ------------------------
    /// Core Business Logic (full security stack)
    /// ------------------------
    function exampleFunction(uint256 amount)
        external
        onlyDispatcher           // REQUIRED: All state-changing functions
        onlyInitialized          // REQUIRED: Check initialization
        whenNotPaused           // RECOMMENDED: Pause control
        nonReentrant            // REQUIRED: Reentrancy protection
    {
        emit [FACET_NAME]FunctionCalled(msg.sig, msg.sender);
        
        [FACET_NAME]Storage.Layout storage ds = [FACET_NAME]Storage.layout();
        
        // Implement business logic using ds.state
        // Follow checks-effects-interactions pattern
    }

    /// ------------------------
    /// View Functions (minimal modifiers)
    /// ------------------------
    function is[FACET_NAME]Initialized() external view returns (bool) {
        return [FACET_NAME]Storage.layout().initialized;
    }

    function get[FACET_NAME]Version() external view returns (uint256) {
        return [FACET_NAME]Storage.layout().version;
    }
}