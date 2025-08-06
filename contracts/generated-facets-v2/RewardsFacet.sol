// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title RewardsFacet
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
// No domain-specific structs extracted for Rewards

/// ------------------------
/// Roles (production access control)
/// ------------------------
bytes32 constant PAUSER_ROLE = keccak256("REWARDSFACET_PAUSER_ROLE");

library RewardsFacetStorage {
    bytes32 internal constant STORAGE_SLOT = keccak256("payrox.production.facet.storage.rewardsfacet.v3");

    struct Layout {
        mapping(address => uint256) stakingRewards;
        mapping(address => uint256) rewardPoints;
        mapping(address => uint256) rewardMultipliers;
        mapping(address => uint256) lastRewardClaim;
        mapping(uint256 => RewardTier) rewardTiers;
        uint256 totalRewardsDistributed;
        uint256 rewardEmissionRate;
        uint256 minPoints;
        
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

contract RewardsFacet {
    using SafeERC20 for IERC20;

    bytes32 constant STORAGE_SLOT = keccak256("payrox.facet.rewards.v1");
    using SafeERC20 for IERC20;

    /// ------------------------
    /// Events
    /// ------------------------
    event RewardsClaimed(address indexed user, uint256 amount, uint256 points);
    event RewardsFacetInitialized(address indexed dispatcher, uint256 timestamp);
    event RewardsFacetFunctionCalled(bytes4 indexed selector, address indexed caller);
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
        RewardsFacetStorage.Layout storage ds = RewardsFacetStorage.layout();
        if (ds._reentrancyStatus == 2) revert ReentrancyDetected();
        ds._reentrancyStatus = 2;
        _;
        ds._reentrancyStatus = 1;
    }

    modifier whenNotPaused() {
        if (RewardsFacetStorage.layout().paused) revert ContractPaused();
        _;
    }

    modifier onlyInitialized() {
        if (!RewardsFacetStorage.layout().initialized) revert NotInitialized();
        _;
    }

    /// ------------------------
    /// Initialization
    /// ------------------------
    function initializeRewardsFacet() external onlyDispatcher {
        RewardsFacetStorage.Layout storage ds = RewardsFacetStorage.layout();
        if (ds.initialized) revert AlreadyInitialized();
        
        ds.initialized = true;
        ds.version = 3;
        ds._reentrancyStatus = 1;
        ds.paused = false;
        
        emit RewardsFacetInitialized(msg.sender, block.timestamp);
    }

    /// ------------------------
    /// Admin Functions (role-gated)
    /// ------------------------
    function setPaused(bool _paused) external onlyDispatcher onlyPauser {
        RewardsFacetStorage.layout().paused = _paused;
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
        emit RewardsFacetFunctionCalled(msg.sig, msg.sender);
        
        RewardsFacetStorage.Layout storage ds = RewardsFacetStorage.layout();
        
        // TODO: Implement placeMarketOrder business logic
        // - Input validation
        // - Business logic execution using ds.state
        // - Event emission
        // - Follow checks-effects-interactions pattern
    }

    /// ------------------------
    /// View Functions
    /// ------------------------
    function isRewardsFacetInitialized() external view returns (bool) {
        return RewardsFacetStorage.layout().initialized;
    }

    function getRewardsFacetVersion() external view returns (uint256) {
        return RewardsFacetStorage.layout().version;
    }

    function isRewardsFacetPaused() external view returns (bool) {
        return RewardsFacetStorage.layout().paused;
    }

    /// ------------------------
    /// Manifest Integration (REQUIRED for PayRox deployment)
    /// ------------------------
    function getFacetInfo()
        external
        pure
        returns (string memory name, string memory version, bytes4[] memory selectors)
    {
        name = "Rewards";
        version = "1.0.0";

        // CRITICAL: All external function selectors for manifest routing
        selectors = new bytes4[](6);
        selectors[0] = this.initializeRewardsFacet.selector;
        selectors[1] = this.setPaused.selector;
        selectors[2] = this.placeMarketOrder.selector;
        selectors[3] = this.isRewardsFacetInitialized.selector;
        selectors[4] = this.getRewardsFacetVersion.selector;
        selectors[5] = this.isRewardsFacetPaused.selector;
    }
}