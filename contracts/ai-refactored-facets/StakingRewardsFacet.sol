// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// ------------------------
// Errors (gas-efficient custom errors)
// ------------------------
error NotInitialized();
error AlreadyInitialized();
error Paused();
error Unauthorized();
error InvalidAmount();
error InsufficientBalance();
error InvalidTokenAddress();

// ------------------------
// Enums
// ------------------------
enum StakeStatus { ACTIVE, UNSTAKING, WITHDRAWN }
enum RewardType { TOKEN, ETH, POINTS }

// ------------------------
// Structs and Types (no visibility keywords)
// ------------------------
struct StakingTier {
    uint256 tier;
    uint256 multiplier;
    uint256 minStake;
    bool active;
}

// ------------------------
// Storage (native pattern: direct slots, no LibDiamond)
// ------------------------
bytes32 constant STORAGE_SLOT = keccak256("payrox.facet.stakingrewards.v1");

struct Layout {
    // Staking state
    mapping(address => uint256) stakingBalances;
    mapping(address => uint256) stakingRewards;
    mapping(address => uint256) lastStakeTime;
    mapping(address => StakingTier) userTiers;
    uint256 totalStaked;
    uint256 stakingAPY;
    uint256 stakingPenalty;
    
    // Lifecycle management
    bool initialized;
    bool paused;
    address operator;
    uint8 version;
}

/**
 * @title StakingRewardsFacet
 * @notice Multi-tier staking system with reward distribution
 * @dev Standalone PayRox facet with manifest integration
 */
contract StakingRewardsFacet is ReentrancyGuard {
    using SafeERC20 for IERC20;

    function _layout() private pure returns (Layout storage l) {
        bytes32 slot = STORAGE_SLOT;
        assembly { l.slot := slot }
    }

    // ------------------------
    // Events
    // ------------------------
    event StakingRewardsFacetInitialized(address indexed operator, uint256 timestamp);
    event PauseStatusChanged(bool paused);
    event Staked(address indexed user, uint256 amount, uint256 tier);
    event Unstaked(address indexed user, uint256 amount, uint256 penalty);
    event StakingRewardClaimed(address indexed user, uint256 reward);

    // ------------------------
    // Modifiers (native PayRox pattern - facet-owned)
    // ------------------------
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

    // ------------------------
    // Initialization (manifest-compatible, no constructor)
    // ------------------------
    function initializeStakingRewardsFacet(address operator_) external {
        if (operator_ == address(0)) revert Unauthorized();
        
        Layout storage l = _layout();
        if (l.initialized) revert AlreadyInitialized();
        
        l.initialized = true;
        l.operator = operator_;
        l.version = 1;
        l.paused = false;
        
        emit StakingRewardsFacetInitialized(operator_, block.timestamp);
    }

    // ------------------------
    // Core Business Logic
    // ------------------------
    function stake(uint256 amount) external nonReentrant whenInitialized whenNotPaused {
        if (amount == 0) revert InvalidAmount();
        
        Layout storage l = _layout();
        
        // Calculate and distribute existing rewards before updating stake
        if (l.stakingBalances[msg.sender] > 0) {
            uint256 rewards = calculateRewards(msg.sender);
            if (rewards > 0) {
                l.stakingRewards[msg.sender] += rewards;
            }
        }
        
        l.stakingBalances[msg.sender] += amount;
        l.totalStaked += amount;
        l.lastStakeTime[msg.sender] = block.timestamp;
        
        // Update tier based on new stake amount
        _updateStakingTier(msg.sender);
        
        emit Staked(msg.sender, amount, l.userTiers[msg.sender].tier);
    }

    function _updateStakingTier(address user) internal {
        Layout storage l = _layout();
        uint256 stakedAmount = l.stakingBalances[user];
        
        // Simple tier logic - can be expanded
        if (stakedAmount >= 1000 ether) {
            l.userTiers[user] = StakingTier({
                tier: 3,
                multiplier: 200, // 2x multiplier
                minStake: 1000 ether,
                active: true
            });
        } else if (stakedAmount >= 100 ether) {
            l.userTiers[user] = StakingTier({
                tier: 2,
                multiplier: 150, // 1.5x multiplier
                minStake: 100 ether,
                active: true
            });
        } else {
            l.userTiers[user] = StakingTier({
                tier: 1,
                multiplier: 100, // 1x multiplier
                minStake: 0,
                active: true
            });
        }
    }

    function calculateRewards(address user) public view returns (uint256) {
        Layout storage l = _layout();
        if (l.stakingBalances[user] == 0) return 0;
        
        uint256 timeStaked = block.timestamp - l.lastStakeTime[user];
        uint256 baseReward = (l.stakingBalances[user] * l.stakingAPY * timeStaked) / (365 days * 100);
        uint256 multiplier = l.userTiers[user].multiplier;
        
        return (baseReward * multiplier) / 100;
    }

    // ------------------------
    // Admin Functions (operator-gated)
    // ------------------------
    function setPaused(bool _paused) external onlyOperator {
        _layout().paused = _paused;
        emit PauseStatusChanged(_paused);
    }

    // ------------------------
    // View Functions
    // ------------------------
    function isStakingRewardsFacetInitialized() external view returns (bool) {
        return _layout().initialized;
    }

    function getStakingRewardsFacetVersion() external view returns (uint8) {
        return _layout().version;
    }

    function isStakingRewardsFacetPaused() external view returns (bool) {
        return _layout().paused;
    }

    // ------------------------
    // Manifest Integration (REQUIRED for PayRox deployment)
    // ------------------------
    function getFacetInfo()
        external
        pure
        returns (string memory name, string memory version, bytes4[] memory selectors)
    {
        name = "StakingRewards";
        version = "1.0.0";

        // CRITICAL: All external function selectors for manifest routing
        selectors = new bytes4[](12);
        uint256 index = 0;
        
        // Core function selectors
        selectors[index++] = this.stake.selector;
        selectors[index++] = this.calculateRewards.selector;
        
        // Standard selectors
        selectors[index++] = this.initializeStakingRewardsFacet.selector;
        selectors[index++] = this.setPaused.selector;
        selectors[index++] = this.isStakingRewardsFacetInitialized.selector;
        selectors[index++] = this.getStakingRewardsFacetVersion.selector;
        selectors[index++] = this.isStakingRewardsFacetPaused.selector;
    }
}