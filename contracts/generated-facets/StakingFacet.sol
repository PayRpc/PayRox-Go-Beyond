// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Template: Facet.Core@2.0.0
// Hash: a9b76ab3494936c7
// Generated: 2025-08-07T10:36:10.759Z

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../utils/LibDiamond.sol";

/// ---------- Standard Errors (gas-efficient) ----------
error NotInitialized();
error AlreadyInitialized();
error Paused();
error Unauthorized();
error InvalidParam();
error Reentrancy();
error DiamondFrozen();

/// ---------- Custom Staking Errors ----------
error InvalidAmount();
error InsufficientBalance();
error InsufficientStake();
error NothingToClaim();

/// ---------- Storage (namespaced, collision-safe) ----------
bytes32 constant STAKING_SLOT = keccak256("payrox.facet.staking.v1");

struct StakingFacetLayout {
    // Custom storage fields
    mapping(address => uint256) stakes;
    mapping(address => uint256) rewards;
    IERC20 stakingToken;
    uint256 totalStaked;
    uint256 rewardRate; // Example: rewards per second

    // Standard lifecycle & security (always present)
    bool initialized;
    bool paused;
    address operator;
    uint8 version;
    uint256 _reentrancy; // 1=unlocked, 2=locked
    uint256 nonce;       // For unique ID generation
}

function _s() pure returns (StakingFacetLayout storage l) {
    bytes32 slot = STAKING_SLOT;
    assembly { l.slot := slot }
}

/**
 * @title StakingFacet
 * @notice Minimal facet archetype with initialization, pause, and reentrancy protection
 * @dev Facet-safe: namespaced storage, custom reentrancy, dispatcher gating
 * @custom:archetype core
 * @custom:version 2.0.0
 */
contract StakingFacet {
    
    /// ---------- Events ----------
    event StakingFacetInitialized(address indexed operator, address indexed stakingToken, uint256 timestamp);
    event PauseStatusChanged(bool paused);
    event Staked(address indexed user, uint256 amount, uint256 stakeId);
    event Unstaked(address indexed user, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 amount);
    event RewardRateChanged(uint256 newRate);

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
        StakingFacetLayout storage l = _s();
        if (l._reentrancy == 2) revert Reentrancy();
        l._reentrancy = 2;
        _;
        l._reentrancy = 1;
    }

    /// ---------- Initialization (no constructor pattern) ----------
    function initializeStakingFacet(
        address operator_,
        address stakingToken_
    ) external onlyDispatcher {
        StakingFacetLayout storage l = _s();
        if (l.initialized) revert AlreadyInitialized();
        if (LibDiamond.diamondStorage().frozen) revert DiamondFrozen();
        if (operator_ == address(0)) revert Unauthorized();
        if (stakingToken_ == address(0)) revert InvalidParam();

        l.initialized = true;
        l.operator = operator_;
        l.stakingToken = IERC20(stakingToken_);
        l.version = 2;
        l.paused = false;
        l._reentrancy = 1; // Initialize reentrancy guard
        l.nonce = 1;       // Start nonce at 1 to avoid zero-nonce issues

        emit StakingFacetInitialized(operator_, stakingToken_, block.timestamp);
    }

    /// ---------- External Functions (Staking Logic) ----------

    function stake(uint256 amount) external whenInitialized whenNotPaused nonReentrant {
        if (amount == 0) revert InvalidAmount();
        
        StakingFacetLayout storage l = _s();
        
        uint256 allowance = l.stakingToken.allowance(msg.sender, address(this));
        if (allowance < amount) revert InsufficientBalance();
        
        bool success = l.stakingToken.transferFrom(msg.sender, address(this), amount);
        if (!success) revert InsufficientBalance();

        l.stakes[msg.sender] += amount;
        l.totalStaked += amount;
        
        uint256 stakeId = _generateUniqueId();
        emit Staked(msg.sender, amount, stakeId);
    }

    function unstake(uint256 amount) external whenInitialized nonReentrant {
        if (amount == 0) revert InvalidAmount();
        
        StakingFacetLayout storage l = _s();
        if (l.stakes[msg.sender] < amount) revert InsufficientStake();

        l.stakes[msg.sender] -= amount;
        l.totalStaked -= amount;

        bool success = l.stakingToken.transfer(msg.sender, amount);
        if (!success) revert InsufficientBalance(); // Should not fail if balance is sufficient

        emit Unstaked(msg.sender, amount);
    }

    function claimRewards() external whenInitialized nonReentrant {
        StakingFacetLayout storage l = _s();
        uint256 reward = _calculateRewards(msg.sender);
        if (reward == 0) revert NothingToClaim();

        l.rewards[msg.sender] = 0; // Reset rewards before transfer
        
        // This assumes the contract holds reward tokens. 
        // In a real scenario, rewards might be minted or transferred from a treasury.
        bool success = l.stakingToken.transfer(msg.sender, reward);
        if (!success) revert InsufficientBalance();

        emit RewardsClaimed(msg.sender, reward);
    }

    /// ---------- Operator Functions ----------

    function setPaused(bool paused_) external onlyOperator {
        _s().paused = paused_;
        emit PauseStatusChanged(paused_);
    }

    function setRewardRate(uint256 newRate_) external onlyOperator {
        _s().rewardRate = newRate_;
        emit RewardRateChanged(newRate_);
    }

    /// ---------- View Functions ----------

    function getStake(address user) external view returns (uint256) {
        return _s().stakes[user];
    }

    function getReward(address user) external view returns (uint256) {
        return _calculateRewards(user);
    }

    function paused() external view returns (bool) {
        return _s().paused;
    }

    function version() external view returns (uint8) {
        return _s().version;
    }

    /// ---------- Internal Functions ----------

    function _calculateRewards(address user) internal view returns (uint256) {
        StakingFacetLayout storage l = _s();
        // This is a simplified reward calculation. A real implementation would be more complex.
        uint256 quote = _quote(l.stakes[user], l.rewardRate);
        return l.rewards[user] + quote;
    }

    function _quote(uint256 amount, uint256 rate) internal pure returns (uint256) {
        // Example: simple linear reward calculation (e.g., rate is basis points)
        return (amount * rate) / 10000;
    }

    function _generateUniqueId() internal returns (uint256) {
        StakingFacetLayout storage l = _s();
        l.nonce++;
        return uint256(keccak256(abi.encodePacked(l.nonce, msg.sender, block.timestamp, block.difficulty)));
    }

    /// ---------- Manifest Integration (REQUIRED) ----------
    function getFacetInfo()
        external
        pure
        returns (string memory name, string memory version, bytes4[] memory selectors)
    {
        name = "Staking";
        version = "2.0.0";

        selectors = new bytes4[](10);
        uint256 i = 0;
        
        // Initialization
        selectors[i++] = this.initializeStakingFacet.selector;
        
        // Core Logic
        selectors[i++] = this.stake.selector;
        selectors[i++] = this.unstake.selector;
        selectors[i++] = this.claimRewards.selector;

        // Operator
        selectors[i++] = this.setPaused.selector;
        selectors[i++] = this.setRewardRate.selector;

        // Views
        selectors[i++] = this.getStake.selector;
        selectors[i++] = this.getReward.selector;
        selectors[i++] = this.paused.selector;
        selectors[i++] = this.version.selector;
    }
}
