// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

import "../interfaces/IEnvironmentalOracle.sol";

/**
 * @title TerraStakeStakingFacet
 * @dev Staking facet for TerraStake system - handles staking logic and rewards
 * @author PayRox Go Beyond Team
 */
contract TerraStakeStakingFacet is 
    AccessControlUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable
{
    // ============ Diamond-Safe Storage ============
    bytes32 private constant _SLOT = keccak256("payrox.facets.terrastake.staking.v1");

    struct Layout {
        // Staking and rewards
        mapping(address => mapping(uint256 => StakeInfo)) stakes;
        mapping(uint256 => uint256) baseRewardRates; // Base reward rates per token type
        
        // Contract dependencies
        IEnvironmentalOracle environmentalOracle;
        
        bool initialized;
    }

    function _layout() private pure returns (Layout storage l) {
        bytes32 slot = _SLOT;
        assembly { l.slot := slot }
    }

    // ============ Token Types ============
    uint256 public constant TERRA_BASIC = 1;
    uint256 public constant TERRA_PREMIUM = 2;
    uint256 public constant TERRA_LEGENDARY = 3;
    uint256 public constant TERRA_MYTHIC = 4;

    // ============ Structs ============
    struct StakeInfo {
        uint256 amount;           // Amount of tokens staked
        uint256 stakingStart;     // Timestamp when staking started
        uint256 rewardRate;       // Reward rate in basis points
        uint256 accumulatedRewards; // Accumulated rewards
        bool isActive;            // Whether stake is currently active
    }

    // ============ Events ============
    event StakeStarted(
        address indexed staker,
        uint256 indexed tokenId,
        uint256 amount,
        uint256 rewardRate
    );
    
    event StakeEnded(
        address indexed staker,
        uint256 indexed tokenId,
        uint256 amount,
        uint256 rewards
    );

    // ============ Custom Errors ============
    error TerraStakeStaking__InvalidTokenId(uint256 tokenId);
    error TerraStakeStaking__InvalidAmount(uint256 amount);
    error TerraStakeStaking__StakeNotActive(address staker, uint256 tokenId);
    error TerraStakeStaking__StakeAlreadyActive(address staker, uint256 tokenId);
    error TerraStakeStaking__AlreadyInitialized();
    error TerraStakeStaking__NotInitialized();

    // ============ Modifiers ============
    modifier onlyValidTokenId(uint256 tokenId) {
        if (tokenId == 0 || tokenId > TERRA_MYTHIC) {
            revert TerraStakeStaking__InvalidTokenId(tokenId);
        }
        _;
    }
    
    modifier onlyPositiveAmount(uint256 amount) {
        if (amount == 0) {
            revert TerraStakeStaking__InvalidAmount(amount);
        }
        _;
    }

    modifier onlyInitialized() {
        require(_layout().initialized, "TerraStakeStaking: not initialized");
        _;
    }

    // ============ Initialization ============
    
    /**
     * @dev Initialize the staking facet
     */
    function initializeStaking() external {
        Layout storage l = _layout();
        if (l.initialized) revert TerraStakeStaking__AlreadyInitialized();

        __AccessControl_init();
        __Pausable_init();
        __ReentrancyGuard_init();

        // Initialize reward rates
        _initializeRewardRates();
        l.initialized = true;
    }
    
    /**
     * @dev Initialize base reward rates
     */
    function _initializeRewardRates() private {
        Layout storage l = _layout();
        
        // Set base reward rates (in basis points - 10000 = 100%)
        l.baseRewardRates[TERRA_BASIC] = 500;        // 5% APY
        l.baseRewardRates[TERRA_PREMIUM] = 750;      // 7.5% APY
        l.baseRewardRates[TERRA_LEGENDARY] = 1000;   // 10% APY
        l.baseRewardRates[TERRA_MYTHIC] = 1500;      // 15% APY
    }

    // ============ Staking Functions ============
    
    /**
     * @dev Start staking tokens to earn environmental rewards
     * @param tokenId Type of token to stake
     * @param amount Amount of tokens to stake
     */
    function startStaking(
        uint256 tokenId,
        uint256 amount
    ) 
        external 
        onlyValidTokenId(tokenId)
        onlyPositiveAmount(amount)
        onlyInitialized
        whenNotPaused
        nonReentrant
    {
        Layout storage l = _layout();
        
        // Check if user already has an active stake for this token
        if (l.stakes[msg.sender][tokenId].isActive) {
            revert TerraStakeStaking__StakeAlreadyActive(msg.sender, tokenId);
        }
        
        // Calculate reward rate with environmental bonus
        uint256 rewardRate = _calculateRewardRate(tokenId, msg.sender);
        
        // Create stake record
        l.stakes[msg.sender][tokenId] = StakeInfo({
            amount: amount,
            stakingStart: block.timestamp,
            rewardRate: rewardRate,
            accumulatedRewards: 0,
            isActive: true
        });
        
        emit StakeStarted(msg.sender, tokenId, amount, rewardRate);
    }
    
    /**
     * @dev End staking and calculate rewards (without token transfers)
     * @param tokenId Type of token to unstake
     * @return amount Amount of tokens that were staked
     * @return rewards Calculated rewards
     */
    function endStaking(uint256 tokenId) 
        external 
        onlyValidTokenId(tokenId)
        onlyInitialized
        whenNotPaused
        nonReentrant
        returns (uint256 amount, uint256 rewards)
    {
        Layout storage l = _layout();
        StakeInfo storage stake = l.stakes[msg.sender][tokenId];
        
        if (!stake.isActive) {
            revert TerraStakeStaking__StakeNotActive(msg.sender, tokenId);
        }
        
        // Calculate final rewards
        uint256 stakingDuration = block.timestamp - stake.stakingStart;
        rewards = _calculateRewards(stake.amount, stake.rewardRate, stakingDuration);
        amount = stake.amount;
        
        // Update stake record
        stake.accumulatedRewards += rewards;
        stake.isActive = false;
        
        emit StakeEnded(msg.sender, tokenId, amount, rewards);
    }
    
    /**
     * @dev Calculate reward rate with environmental impact bonus
     * @param tokenId Type of token
     * @param staker Address of staker
     * @return rewardRate Calculated reward rate in basis points
     */
    function _calculateRewardRate(uint256 tokenId, address staker) private view returns (uint256) {
        Layout storage l = _layout();
        uint256 baseRate = l.baseRewardRates[tokenId];
        
        // Add environmental bonus if oracle is available
        if (address(l.environmentalOracle) != address(0)) {
            try l.environmentalOracle.getEnvironmentalImpact(1) returns (uint256 impactScore) {
                // Higher impact score = higher bonus (up to 50% bonus)
                uint256 environmentalBonus = (impactScore * 50) / 100; // Max 50% bonus
                baseRate += environmentalBonus;
            } catch {
                // Silently fail if oracle call fails
            }
        }
        
        return baseRate;
    }
    
    /**
     * @dev Calculate staking rewards
     * @param amount Amount of tokens staked
     * @param rewardRate Reward rate in basis points
     * @param duration Staking duration in seconds
     * @return rewards Calculated rewards
     */
    function _calculateRewards(
        uint256 amount,
        uint256 rewardRate,
        uint256 duration
    ) private pure returns (uint256) {
        // Calculate annual rewards and pro-rate by duration
        // Formula: (amount * rewardRate * duration) / (10000 * 365 days)
        return (amount * rewardRate * duration) / (10000 * 365 days);
    }

    // ============ View Functions ============
    
    /**
     * @dev Get staking information for a user and token
     * @param user Address of user
     * @param tokenId Type of token
     * @return Stake information struct
     */
    function getStakeInfo(
        address user,
        uint256 tokenId
    ) external view returns (StakeInfo memory) {
        return _layout().stakes[user][tokenId];
    }
    
    /**
     * @dev Calculate current rewards for an active stake
     * @param user Address of user
     * @param tokenId Type of token
     * @return Current accumulated rewards
     */
    function calculateCurrentRewards(
        address user,
        uint256 tokenId
    ) external view returns (uint256) {
        Layout storage l = _layout();
        StakeInfo memory stake = l.stakes[user][tokenId];
        if (!stake.isActive) return 0;
        
        uint256 stakingDuration = block.timestamp - stake.stakingStart;
        return _calculateRewards(stake.amount, stake.rewardRate, stakingDuration);
    }

    /**
     * @dev Get base reward rate for a token type
     * @param tokenId Type of token
     * @return Base reward rate in basis points
     */
    function getBaseRewardRate(uint256 tokenId) external view returns (uint256) {
        return _layout().baseRewardRates[tokenId];
    }

    // ============ Admin Functions ============
    
    /**
     * @dev Set environmental oracle address
     * @param _oracle Address of environmental oracle
     */
    function setEnvironmentalOracle(address _oracle) external onlyRole(DEFAULT_ADMIN_ROLE) {
        Layout storage l = _layout();
        l.environmentalOracle = IEnvironmentalOracle(_oracle);
    }
    
    /**
     * @dev Update base reward rate for a token type
     * @param tokenId Type of token
     * @param rewardRate New reward rate in basis points
     */
    function updateBaseRewardRate(
        uint256 tokenId,
        uint256 rewardRate
    ) external onlyRole(DEFAULT_ADMIN_ROLE) onlyValidTokenId(tokenId) {
        require(rewardRate <= 5000, "TerraStakeStaking: reward rate too high"); // Max 50%
        Layout storage l = _layout();
        l.baseRewardRates[tokenId] = rewardRate;
    }

    // ============ Interface Support ============
    
    /**
     * @dev See {IERC165-supportsInterface}
     */
    function supportsInterface(bytes4 interfaceId) 
        public 
        view 
        virtual
        override(AccessControlUpgradeable) 
        returns (bool) 
    {
        return super.supportsInterface(interfaceId);
    }

    // ============ Facet Info ============
    
    /**
     * @dev Get facet information for Diamond Loupe compatibility
     * @return name Facet name
     * @return version Facet version
     * @return selectors Function selectors
     */
    function getFacetInfo()
        external
        pure
        returns (string memory name, string memory version, bytes4[] memory selectors)
    {
        name = "TerraStakeStakingFacet";
        version = "1.0.0";

        selectors = new bytes4[](8);
        selectors[0] = this.initializeStaking.selector;
        selectors[1] = this.startStaking.selector;
        selectors[2] = this.endStaking.selector;
        selectors[3] = this.getStakeInfo.selector;
        selectors[4] = this.calculateCurrentRewards.selector;
        selectors[5] = this.getBaseRewardRate.selector;
        selectors[6] = this.updateBaseRewardRate.selector;
        selectors[7] = this.getFacetInfo.selector;
    }
}
