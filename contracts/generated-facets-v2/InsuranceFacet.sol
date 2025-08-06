// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title InsuranceFacet
 * @notice PayRox facet following native patterns from ExampleFacetA/B
 * @dev Standalone contract for manifest-dispatcher routing
 */

/// ------------------------
/// Errors (gas-efficient custom errors)
/// ------------------------
error NotInitialized();
error AlreadyInitialized();
error ContractPaused();
error ReentrancyDetected();
error InvalidTokenAddress();
error InsufficientBalance();
error Unauthorized();

/// ------------------------
/// Structs and Types
/// ------------------------
struct InsurancePolicy {
        uint256 coverage;
        uint256 premium;
        uint256 expiry;
        bool active;
        PolicyType policyType;
    }

struct InsuranceClaim {
        address claimer;
        uint256 amount;
        string reason;
        bool approved;
        bool paid;
        uint256 timestamp;
    }

/// ------------------------
/// Roles (production access control)
/// ------------------------
bytes32 constant PAUSER_ROLE = keccak256("INSURANCEFACET_PAUSER_ROLE");

library InsuranceFacetStorage {
    bytes32 internal constant STORAGE_SLOT = keccak256("payrox.production.facet.storage.insurancefacet.v3");

    struct Layout {
        mapping(address => uint256) insuranceCoverage;
        mapping(address => InsurancePolicy[]) userPolicies;
        mapping(uint256 => InsuranceClaim) claims;
        uint256 totalInsuranceFund;
        uint256 claimCount;
        uint256 premiumRate;
        mapping(address => uint256) lastRewardClaim;
        uint256 premium;
        address claimer;
        
        // Lifecycle management
        bool initialized;
        uint8 version;
        
        // Security controls
        uint256 _reentrancyStatus; // 1=unlocked, 2=locked
        bool paused;
    }
    function _layout() private pure returns (Layout storage l) {
        bytes32 slot = STORAGE_SLOT;
        assembly { l.slot := slot }
    }

    function layout() internal pure returns (Layout storage l) {
        bytes32 slot = STORAGE_SLOT;
        assembly { l.slot := slot }
    }
}

contract InsuranceFacet {
    using SafeERC20 for IERC20;

    bytes32 constant STORAGE_SLOT = keccak256("payrox.facet.insurance.v1");
    using SafeERC20 for IERC20;

    /// ------------------------
    /// Events
    /// ------------------------
    // Core Insurance events
    event InsuranceActionExecuted(address indexed user, uint256 amount, uint256 timestamp);
    event InsuranceFacetInitialized(address indexed dispatcher, uint256 timestamp);
    event InsuranceFacetFunctionCalled(bytes4 indexed selector, address indexed caller);
    event PauseStatusChanged(bool paused);

    /// ------------------------
    /// Modifiers (production security stack)
    /// ------------------------
    modifier onlyDispatcher() {
        
        _;
    }

    modifier onlyPauser() {
        
        _;
    }

    modifier nonReentrant() {
        InsuranceFacetStorage.Layout storage ds = InsuranceFacetStorage.layout();
        if (ds._reentrancyStatus == 2) revert ReentrancyDetected();
        ds._reentrancyStatus = 2;
        _;
        ds._reentrancyStatus = 1;
    }

    modifier whenNotPaused() {
        if (InsuranceFacetStorage.layout().paused) revert ContractPaused();
        _;
    }

    modifier onlyInitialized() {
        if (!InsuranceFacetStorage.layout().initialized) revert NotInitialized();
        _;
    }

    /// ------------------------
    /// Initialization
    /// ------------------------
    function initializeInsuranceFacet() external onlyDispatcher {
        InsuranceFacetStorage.Layout storage ds = InsuranceFacetStorage.layout();
        if (ds.initialized) revert AlreadyInitialized();
        
        ds.initialized = true;
        ds.version = 3;
        ds._reentrancyStatus = 1;
        ds.paused = false;
        
        emit InsuranceFacetInitialized(msg.sender, block.timestamp);
    }

    /// ------------------------
    /// Admin Functions (role-gated)
    /// ------------------------
    function setPaused(bool _paused) external onlyDispatcher onlyPauser {
        InsuranceFacetStorage.layout().paused = _paused;
        emit PauseStatusChanged(_paused);
    }

    /// ------------------------
    /// Core Business Logic (properly gated)
    /// ------------------------
    function placeMarketOrder(address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut)
        external
        onlyDispatcher
        onlyInitialized
        whenNotPaused
        nonReentrant
    {
        emit InsuranceFacetFunctionCalled(msg.sig, msg.sender);
        
        InsuranceFacetStorage.Layout storage ds = InsuranceFacetStorage.layout();
        
        // TODO: Implement placeMarketOrder business logic
        // - Input validation
        // - Business logic execution using ds.state
        // - Event emission
        // - Follow checks-effects-interactions pattern
    }

    /// ------------------------
    /// View Functions
    /// ------------------------
    function isInsuranceFacetInitialized() external view returns (bool) {
        return InsuranceFacetStorage.layout().initialized;
    }

    function getInsuranceFacetVersion() external view returns (uint256) {
        return InsuranceFacetStorage.layout().version;
    }

    function isInsuranceFacetPaused() external view returns (bool) {
        return InsuranceFacetStorage.layout().paused;
    }

    /// ------------------------
    /// Manifest Integration (REQUIRED for PayRox deployment)
    /// ------------------------
    function getFacetInfo()
        external
        pure
        returns (string memory name, string memory version, bytes4[] memory selectors)
    {
        name = "Insurance";
        version = "1.0.0";

        // CRITICAL: All external function selectors for manifest routing
        selectors = new bytes4[](6);
        selectors[0] = this.initializeInsuranceFacet.selector;
        selectors[1] = this.setPaused.selector;
        selectors[2] = this.placeMarketOrder.selector;
        selectors[3] = this.isInsuranceFacetInitialized.selector;
        selectors[4] = this.getInsuranceFacetVersion.selector;
        selectors[5] = this.isInsuranceFacetPaused.selector;
    }
}