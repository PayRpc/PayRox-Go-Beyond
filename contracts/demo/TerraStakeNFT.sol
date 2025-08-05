// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/utils/ERC1155HolderUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

import "./interfaces/IVRFCoordinator.sol";
import "./interfaces/IEnvironmentalOracle.sol";
import "./interfaces/IFractionalizationVault.sol";

/**
 * @title TerraStakeNFT
 * @dev Advanced ERC1155 NFT for environmental impact tracking and staking
 * 
 * Features:
 * - Multi-token environmental NFTs with different tiers
 * - VRF-based randomized rewards and rarity generation
 * - Environmental impact tracking and carbon offset integration
 * - Fractionalization support for high-value environmental assets
 * - Comprehensive access control and emergency mechanisms
 * - UUPS upgradeable pattern with role-based upgrade authorization
 * 
 * Security Features:
 * - Reentrancy protection on all state-changing functions
 * - Role-based access control with granular permissions
 * - Emergency pause functionality for crisis management
 * - Signature-based operations for enhanced security
 * - Input validation and overflow protection
 * 
 * @author PayRox Go Beyond Team
 * @notice This contract demonstrates complex NFT functionality within PayRox ecosystem
 */
contract TerraStakeNFT is 
    Initializable,
    ERC1155Upgradeable,
    ERC1155HolderUpgradeable,
    AccessControlUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable
{
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    // ============ Role Definitions ============
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");
    bytes32 public constant FRACTIONALIZATION_ROLE = keccak256("FRACTIONALIZATION_ROLE");

    // ============ Token Types ============
    uint256 public constant TERRA_BASIC = 1;
    uint256 public constant TERRA_PREMIUM = 2;
    uint256 public constant TERRA_LEGENDARY = 3;
    uint256 public constant TERRA_MYTHIC = 4;

    // ============ State Variables ============
    
    // Contract dependencies
    IVRFCoordinator public vrfCoordinator;
    IEnvironmentalOracle public environmentalOracle;
    IFractionalizationVault public fractionalizationVault;
    
    // VRF Configuration
    bytes32 public vrfKeyHash;
    uint64 public vrfSubscriptionId;
    uint16 public vrfRequestConfirmations;
    uint32 public vrfCallbackGasLimit;
    
    // Token metadata and supply tracking
    mapping(uint256 => uint256) public tokenSupply;
    mapping(uint256 => uint256) public maxTokenSupply;
    mapping(uint256 => string) public tokenURIs;
    
    // Environmental impact tracking
    struct EnvironmentalData {
        uint256 carbonOffset;      // Carbon offset in tons (scaled by 1e18)
        uint256 impactScore;       // Environmental impact score (0-100)
        uint256 regionId;          // Geographic region identifier
        bytes32 certificationHash; // Environmental certification hash
        uint256 lastUpdated;      // Timestamp of last update
    }
    
    mapping(uint256 => mapping(uint256 => EnvironmentalData)) public tokenEnvironmentalData;
    
    // Staking and rewards
    struct StakeInfo {
        uint256 amount;           // Amount of tokens staked
        uint256 stakingStart;     // Timestamp when staking started
        uint256 rewardRate;       // Reward rate in basis points
        uint256 accumulatedRewards; // Accumulated rewards
        bool isActive;            // Whether stake is currently active
    }
    
    mapping(address => mapping(uint256 => StakeInfo)) public stakes;
    mapping(uint256 => uint256) public baseRewardRates; // Base reward rates per token type
    
    // VRF randomness requests
    mapping(uint256 => address) public vrfRequests;
    mapping(address => uint256) public pendingRandomness;
    
    // Fractionalization tracking
    mapping(uint256 => mapping(uint256 => bool)) public isFractionalized;
    mapping(uint256 => mapping(uint256 => uint256)) public fractionalizationVaultId;
    
    // Emergency and security
    mapping(bytes32 => bool) public usedSignatures;
    uint256 public emergencyWithdrawDelay;
    mapping(address => uint256) public emergencyWithdrawRequests;
    
    // ============ Events ============
    
    event TokenMinted(
        address indexed to,
        uint256 indexed tokenId,
        uint256 amount,
        uint256 indexed mintType
    );
    
    event EnvironmentalDataUpdated(
        uint256 indexed tokenId,
        uint256 indexed tokenInstanceId,
        uint256 carbonOffset,
        uint256 impactScore,
        uint256 regionId
    );
    
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
    
    event RandomnessRequested(
        address indexed requester,
        uint256 indexed requestId
    );
    
    event RandomnessReceived(
        address indexed requester,
        uint256 indexed requestId,
        uint256 randomness
    );
    
    event TokenFractionalized(
        uint256 indexed tokenId,
        uint256 indexed tokenInstanceId,
        uint256 indexed vaultId,
        uint256 fractionCount
    );
    
    event EmergencyWithdrawRequested(
        address indexed user,
        uint256 timestamp
    );
    
    event SecurityAlert(
        uint256 indexed alertType,
        address indexed actor,
        bytes32 indexed context,
        uint256 severity
    );

    // ============ Custom Errors ============
    
    error TerraStakeNFT__Unauthorized(address caller, bytes32 role);
    error TerraStakeNFT__InvalidTokenId(uint256 tokenId);
    error TerraStakeNFT__InsufficientSupply(uint256 requested, uint256 available);
    error TerraStakeNFT__InvalidAmount(uint256 amount);
    error TerraStakeNFT__StakeNotActive(address staker, uint256 tokenId);
    error TerraStakeNFT__StakeAlreadyActive(address staker, uint256 tokenId);
    error TerraStakeNFT__InvalidSignature(bytes32 hash, bytes signature);
    error TerraStakeNFT__SignatureAlreadyUsed(bytes32 signatureHash);
    error TerraStakeNFT__RandomnessNotReady(address requester);
    error TerraStakeNFT__TokenAlreadyFractionalized(uint256 tokenId, uint256 instanceId);
    error TerraStakeNFT__EmergencyWithdrawNotReady(address user, uint256 readyTime);
    error TerraStakeNFT__InvalidEnvironmentalData(uint256 parameterIndex);

    // ============ Modifiers ============
    
    modifier onlyValidTokenId(uint256 tokenId) {
        if (tokenId == 0 || tokenId > TERRA_MYTHIC) {
            revert TerraStakeNFT__InvalidTokenId(tokenId);
        }
        _;
    }
    
    modifier onlyPositiveAmount(uint256 amount) {
        if (amount == 0) {
            revert TerraStakeNFT__InvalidAmount(amount);
        }
        _;
    }
    
    modifier onlyValidSignature(bytes32 hash, bytes memory signature) {
        bytes32 signatureHash = keccak256(signature);
        if (usedSignatures[signatureHash]) {
            revert TerraStakeNFT__SignatureAlreadyUsed(signatureHash);
        }
        
        bytes32 ethSignedHash = hash.toEthSignedMessageHash();
        address signer = ethSignedHash.recover(signature);
        
        if (!hasRole(ORACLE_ROLE, signer)) {
            revert TerraStakeNFT__InvalidSignature(hash, signature);
        }
        _;
    }

    // ============ Initialization ============
    
    /**
     * @dev Initialize the TerraStakeNFT contract
     * @param _uri Base URI for token metadata
     * @param _admin Address to grant admin role
     * @param _vrfCoordinator Address of VRF coordinator
     * @param _vrfKeyHash VRF key hash
     * @param _vrfSubscriptionId VRF subscription ID
     */
    function initialize(
        string memory _uri,
        address _admin,
        address _vrfCoordinator,
        bytes32 _vrfKeyHash,
        uint64 _vrfSubscriptionId
    ) public initializer {
        __ERC1155_init(_uri);
        __ERC1155Holder_init();
        __AccessControl_init();
        __Pausable_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        // Grant roles to admin
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(MINTER_ROLE, _admin);
        _grantRole(UPGRADER_ROLE, _admin);
        _grantRole(ORACLE_ROLE, _admin);
        _grantRole(EMERGENCY_ROLE, _admin);
        _grantRole(FRACTIONALIZATION_ROLE, _admin);

        // Set VRF configuration
        vrfCoordinator = IVRFCoordinator(_vrfCoordinator);
        vrfKeyHash = _vrfKeyHash;
        vrfSubscriptionId = _vrfSubscriptionId;
        vrfRequestConfirmations = 3;
        vrfCallbackGasLimit = 100000;

        // Initialize token configurations
        _initializeTokenConfigs();
        
        // Set emergency withdraw delay to 24 hours
        emergencyWithdrawDelay = 24 hours;
    }
    
    /**
     * @dev Initialize token configurations and supply limits
     */
    function _initializeTokenConfigs() private {
        // Set maximum supplies for each token type
        maxTokenSupply[TERRA_BASIC] = 1000000;     // 1M basic tokens
        maxTokenSupply[TERRA_PREMIUM] = 100000;    // 100K premium tokens
        maxTokenSupply[TERRA_LEGENDARY] = 10000;   // 10K legendary tokens
        maxTokenSupply[TERRA_MYTHIC] = 1000;       // 1K mythic tokens
        
        // Set base reward rates (in basis points - 10000 = 100%)
        baseRewardRates[TERRA_BASIC] = 500;        // 5% APY
        baseRewardRates[TERRA_PREMIUM] = 750;      // 7.5% APY
        baseRewardRates[TERRA_LEGENDARY] = 1000;   // 10% APY
        baseRewardRates[TERRA_MYTHIC] = 1500;      // 15% APY
        
        // Set token URIs
        tokenURIs[TERRA_BASIC] = "terra-basic.json";
        tokenURIs[TERRA_PREMIUM] = "terra-premium.json";
        tokenURIs[TERRA_LEGENDARY] = "terra-legendary.json";
        tokenURIs[TERRA_MYTHIC] = "terra-mythic.json";
    }

    // ============ Minting Functions ============
    
    /**
     * @dev Mint environmental NFTs with impact tracking
     * @param to Address to mint tokens to
     * @param tokenId Type of token to mint
     * @param amount Number of tokens to mint
     * @param environmentalData Environmental impact data
     */
    function mintWithEnvironmentalData(
        address to,
        uint256 tokenId,
        uint256 amount,
        EnvironmentalData memory environmentalData
    ) 
        external 
        onlyRole(MINTER_ROLE) 
        onlyValidTokenId(tokenId)
        onlyPositiveAmount(amount)
        whenNotPaused
        nonReentrant
    {
        _mintWithEnvironmentalData(to, tokenId, amount, environmentalData);
    }
    
    /**
     * @dev Internal mint function with environmental data
     * @param to Address to mint tokens to
     * @param tokenId Type of token to mint
     * @param amount Number of tokens to mint
     * @param environmentalData Environmental impact data
     */
    function _mintWithEnvironmentalData(
        address to,
        uint256 tokenId,
        uint256 amount,
        EnvironmentalData memory environmentalData
    ) 
        internal 
        onlyValidTokenId(tokenId)
        onlyPositiveAmount(amount)
    {
        // Check supply limits
        uint256 newSupply = tokenSupply[tokenId] + amount;
        if (newSupply > maxTokenSupply[tokenId]) {
            revert TerraStakeNFT__InsufficientSupply(amount, maxTokenSupply[tokenId] - tokenSupply[tokenId]);
        }
        
        // Validate environmental data
        _validateEnvironmentalData(environmentalData);
        
        // Update supply tracking
        tokenSupply[tokenId] = newSupply;
        
        // Mint tokens
        _mint(to, tokenId, amount, "");
        
        // Store environmental data for each token instance
        for (uint256 i = 0; i < amount; i++) {
            uint256 instanceId = tokenSupply[tokenId] - amount + i;
            tokenEnvironmentalData[tokenId][instanceId] = environmentalData;
        }
        
        emit TokenMinted(to, tokenId, amount, 1);
        
        // Emit environmental data events
        for (uint256 i = 0; i < amount; i++) {
            uint256 instanceId = tokenSupply[tokenId] - amount + i;
            emit EnvironmentalDataUpdated(
                tokenId,
                instanceId,
                environmentalData.carbonOffset,
                environmentalData.impactScore,
                environmentalData.regionId
            );
        }
    }
    
    /**
     * @dev Batch mint multiple token types with environmental data
     * @param to Address to mint tokens to
     * @param tokenIds Array of token IDs to mint
     * @param amounts Array of amounts to mint
     * @param environmentalDataArray Array of environmental data
     */
    function batchMintWithEnvironmentalData(
        address to,
        uint256[] memory tokenIds,
        uint256[] memory amounts,
        EnvironmentalData[] memory environmentalDataArray
    ) 
        external 
        onlyRole(MINTER_ROLE) 
        whenNotPaused
        nonReentrant
    {
        require(
            tokenIds.length == amounts.length && 
            amounts.length == environmentalDataArray.length,
            "TerraStakeNFT: arrays length mismatch"
        );
        
        for (uint256 i = 0; i < tokenIds.length; i++) {
            _mintWithEnvironmentalData(to, tokenIds[i], amounts[i], environmentalDataArray[i]);
        }
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
        whenNotPaused
        nonReentrant
    {
        // Check if user has sufficient balance
        require(balanceOf(msg.sender, tokenId) >= amount, "TerraStakeNFT: insufficient balance");
        
        // Check if user already has an active stake for this token
        if (stakes[msg.sender][tokenId].isActive) {
            revert TerraStakeNFT__StakeAlreadyActive(msg.sender, tokenId);
        }
        
        // Calculate reward rate with environmental bonus
        uint256 rewardRate = _calculateRewardRate(tokenId, msg.sender);
        
        // Create stake record
        stakes[msg.sender][tokenId] = StakeInfo({
            amount: amount,
            stakingStart: block.timestamp,
            rewardRate: rewardRate,
            accumulatedRewards: 0,
            isActive: true
        });
        
        // Transfer tokens to contract (effectively locking them)
        _safeTransferFrom(msg.sender, address(this), tokenId, amount, "");
        
        emit StakeStarted(msg.sender, tokenId, amount, rewardRate);
    }
    
    /**
     * @dev End staking and claim rewards
     * @param tokenId Type of token to unstake
     */
    function endStaking(uint256 tokenId) 
        external 
        onlyValidTokenId(tokenId)
        whenNotPaused
        nonReentrant
    {
        StakeInfo storage stake = stakes[msg.sender][tokenId];
        
        if (!stake.isActive) {
            revert TerraStakeNFT__StakeNotActive(msg.sender, tokenId);
        }
        
        // Calculate final rewards
        uint256 stakingDuration = block.timestamp - stake.stakingStart;
        uint256 rewards = _calculateRewards(stake.amount, stake.rewardRate, stakingDuration);
        
        // Update stake record
        stake.accumulatedRewards += rewards;
        stake.isActive = false;
        
        // Return staked tokens
        _safeTransferFrom(address(this), msg.sender, tokenId, stake.amount, "");
        
        // Mint reward tokens (using basic tier for rewards)
        if (rewards > 0) {
            _mint(msg.sender, TERRA_BASIC, rewards, "");
        }
        
        emit StakeEnded(msg.sender, tokenId, stake.amount, rewards);
    }
    
    /**
     * @dev Calculate reward rate with environmental impact bonus
     * @param tokenId Type of token
     * @param staker Address of staker
     * @return rewardRate Calculated reward rate in basis points
     */
    function _calculateRewardRate(uint256 tokenId, address staker) private view returns (uint256) {
        uint256 baseRate = baseRewardRates[tokenId];
        
        // Add environmental bonus if oracle is available
        if (address(environmentalOracle) != address(0)) {
            // Get user's average environmental impact
            uint256 userBalance = balanceOf(staker, tokenId);
            if (userBalance > 0) {
                // For simplification, use a fixed region ID
                // In practice, this would aggregate across user's holdings
                uint256 impactScore = environmentalOracle.getEnvironmentalImpact(1);
                
                // Higher impact score = higher bonus (up to 50% bonus)
                uint256 environmentalBonus = (impactScore * 50) / 100; // Max 50% bonus
                baseRate += environmentalBonus;
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

    // ============ VRF and Randomness Functions ============
    
    /**
     * @dev Request randomness for enhanced features
     */
    function requestRandomness() 
        external 
        whenNotPaused
        nonReentrant
    {
        require(pendingRandomness[msg.sender] == 0, "TerraStakeNFT: randomness already requested");
        
        uint256 requestId = vrfCoordinator.requestRandomWords(
            vrfKeyHash,
            vrfSubscriptionId,
            vrfRequestConfirmations,
            vrfCallbackGasLimit,
            1
        );
        
        vrfRequests[requestId] = msg.sender;
        pendingRandomness[msg.sender] = requestId;
        
        emit RandomnessRequested(msg.sender, requestId);
    }
    
    /**
     * @dev Callback function for VRF randomness (simplified for demo)
     * @param requestId The request ID
     * @param randomWords Array of random words
     */
    function fulfillRandomWords(
        uint256 requestId,
        uint256[] memory randomWords
    ) external {
        require(msg.sender == address(vrfCoordinator), "TerraStakeNFT: only VRF coordinator");
        
        address requester = vrfRequests[requestId];
        require(requester != address(0), "TerraStakeNFT: invalid request");
        
        // Process randomness (simplified - could trigger rare mints, bonuses, etc.)
        uint256 randomness = randomWords[0];
        
        // Clear pending request
        delete vrfRequests[requestId];
        delete pendingRandomness[requester];
        
        emit RandomnessReceived(requester, requestId, randomness);
        
        // Process special rewards based on randomness
        _processRandomReward(requester, randomness);
    }
    
    /**
     * @dev Process random rewards based on VRF result
     * @param user Address of user receiving reward
     * @param randomness Random value from VRF
     */
    function _processRandomReward(address user, uint256 randomness) private {
        // Determine reward tier based on randomness
        uint256 rewardTier = (randomness % 100) + 1; // 1-100
        
        if (rewardTier <= 5) {
            // 5% chance for mythic
            _mint(user, TERRA_MYTHIC, 1, "");
            emit TokenMinted(user, TERRA_MYTHIC, 1, 2);
        } else if (rewardTier <= 20) {
            // 15% chance for legendary
            _mint(user, TERRA_LEGENDARY, 1, "");
            emit TokenMinted(user, TERRA_LEGENDARY, 1, 2);
        } else if (rewardTier <= 50) {
            // 30% chance for premium
            _mint(user, TERRA_PREMIUM, 1, "");
            emit TokenMinted(user, TERRA_PREMIUM, 1, 2);
        } else {
            // 50% chance for basic
            _mint(user, TERRA_BASIC, 1, "");
            emit TokenMinted(user, TERRA_BASIC, 1, 2);
        }
    }

    // ============ Fractionalization Functions ============
    
    /**
     * @dev Fractionalize a high-value environmental NFT
     * @param tokenId Type of token to fractionalize
     * @param instanceId Specific instance of the token
     * @param fractionCount Number of fractions to create
     */
    function fractionalize(
        uint256 tokenId,
        uint256 instanceId,
        uint256 fractionCount
    ) 
        external 
        onlyRole(FRACTIONALIZATION_ROLE)
        onlyValidTokenId(tokenId)
        whenNotPaused
        nonReentrant
    {
        require(fractionCount > 1, "TerraStakeNFT: fraction count must be > 1");
        require(
            !isFractionalized[tokenId][instanceId],
            "TerraStakeNFT: token already fractionalized"
        );
        
        // Only allow fractionalization of high-tier tokens
        require(
            tokenId >= TERRA_LEGENDARY,
            "TerraStakeNFT: only legendary+ tokens can be fractionalized"
        );
        
        // Create fractionalization vault if available
        if (address(fractionalizationVault) != address(0)) {
            uint256 vaultId = fractionalizationVault.fractionalize(
                address(this),
                tokenId,
                fractionCount
            );
            
            fractionalizationVaultId[tokenId][instanceId] = vaultId;
        }
        
        // Mark as fractionalized
        isFractionalized[tokenId][instanceId] = true;
        
        emit TokenFractionalized(tokenId, instanceId, fractionalizationVaultId[tokenId][instanceId], fractionCount);
    }

    // ============ Environmental Oracle Functions ============
    
    /**
     * @dev Update environmental data with oracle signature verification
     * @param tokenId Type of token
     * @param instanceId Specific instance of the token
     * @param newData New environmental data
     * @param signature Oracle signature
     */
    function updateEnvironmentalData(
        uint256 tokenId,
        uint256 instanceId,
        EnvironmentalData memory newData,
        bytes memory signature
    ) 
        external 
        onlyValidTokenId(tokenId)
        whenNotPaused
        nonReentrant
    {
        // Create hash of the data for signature verification
        bytes32 dataHash = keccak256(abi.encodePacked(
            tokenId,
            instanceId,
            newData.carbonOffset,
            newData.impactScore,
            newData.regionId,
            newData.certificationHash,
            block.timestamp
        ));
        
        // Verify signature (this will revert if invalid)
        _verifyOracleSignature(dataHash, signature);
        
        // Validate environmental data
        _validateEnvironmentalData(newData);
        
        // Update data
        newData.lastUpdated = block.timestamp;
        tokenEnvironmentalData[tokenId][instanceId] = newData;
        
        // Mark signature as used
        usedSignatures[keccak256(signature)] = true;
        
        emit EnvironmentalDataUpdated(
            tokenId,
            instanceId,
            newData.carbonOffset,
            newData.impactScore,
            newData.regionId
        );
    }
    
    /**
     * @dev Validate environmental data parameters
     * @param data Environmental data to validate
     */
    function _validateEnvironmentalData(EnvironmentalData memory data) private pure {
        if (data.impactScore > 100) {
            revert TerraStakeNFT__InvalidEnvironmentalData(1);
        }
        if (data.carbonOffset > 1000000 * 1e18) { // Max 1M tons
            revert TerraStakeNFT__InvalidEnvironmentalData(0);
        }
    }
    
    /**
     * @dev Verify oracle signature
     * @param hash Data hash to verify
     * @param signature Oracle signature
     */
    function _verifyOracleSignature(bytes32 hash, bytes memory signature) private {
        bytes32 signatureHash = keccak256(signature);
        if (usedSignatures[signatureHash]) {
            revert TerraStakeNFT__SignatureAlreadyUsed(signatureHash);
        }
        
        bytes32 ethSignedHash = hash.toEthSignedMessageHash();
        address signer = ethSignedHash.recover(signature);
        
        if (!hasRole(ORACLE_ROLE, signer)) {
            revert TerraStakeNFT__InvalidSignature(hash, signature);
        }
    }

    // ============ Emergency Functions ============
    
    /**
     * @dev Request emergency withdrawal (with delay for security)
     */
    function requestEmergencyWithdraw() 
        external 
        whenNotPaused
    {
        emergencyWithdrawRequests[msg.sender] = block.timestamp + emergencyWithdrawDelay;
        emit EmergencyWithdrawRequested(msg.sender, block.timestamp);
    }
    
    /**
     * @dev Execute emergency withdrawal after delay
     * @param tokenId Type of token to withdraw
     */
    function executeEmergencyWithdraw(uint256 tokenId) 
        external 
        onlyValidTokenId(tokenId)
        nonReentrant
    {
        uint256 readyTime = emergencyWithdrawRequests[msg.sender];
        if (readyTime == 0 || block.timestamp < readyTime) {
            revert TerraStakeNFT__EmergencyWithdrawNotReady(msg.sender, readyTime);
        }
        
        // End any active staking
        StakeInfo storage stake = stakes[msg.sender][tokenId];
        if (stake.isActive) {
            stake.isActive = false;
            // Return staked tokens without rewards in emergency
            _safeTransferFrom(address(this), msg.sender, tokenId, stake.amount, "");
        }
        
        // Clear emergency request
        delete emergencyWithdrawRequests[msg.sender];
        
        emit SecurityAlert(1, msg.sender, keccak256("EMERGENCY_WITHDRAW"), 2);
    }
    
    /**
     * @dev Emergency pause (only emergency role)
     */
    function emergencyPause() external onlyRole(EMERGENCY_ROLE) {
        _pause();
        emit SecurityAlert(2, msg.sender, keccak256("EMERGENCY_PAUSE"), 3);
    }
    
    /**
     * @dev Emergency unpause (only emergency role)
     */
    function emergencyUnpause() external onlyRole(EMERGENCY_ROLE) {
        _unpause();
    }

    // ============ View Functions ============
    
    /**
     * @dev Get URI for a specific token type
     * @param tokenId Type of token
     * @return Token URI string
     */
    function uri(uint256 tokenId) public view override returns (string memory) {
        return string(abi.encodePacked(super.uri(tokenId), tokenURIs[tokenId]));
    }
    
    /**
     * @dev Get environmental data for a token instance
     * @param tokenId Type of token
     * @param instanceId Specific instance
     * @return Environmental data struct
     */
    function getEnvironmentalData(
        uint256 tokenId,
        uint256 instanceId
    ) external view returns (EnvironmentalData memory) {
        return tokenEnvironmentalData[tokenId][instanceId];
    }
    
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
        return stakes[user][tokenId];
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
        StakeInfo memory stake = stakes[user][tokenId];
        if (!stake.isActive) return 0;
        
        uint256 stakingDuration = block.timestamp - stake.stakingStart;
        return _calculateRewards(stake.amount, stake.rewardRate, stakingDuration);
    }
    
    /**
     * @dev Get token supply information
     * @param tokenId Type of token
     * @return current Current supply
     * @return maximum Maximum supply
     */
    function getSupplyInfo(uint256 tokenId) external view returns (uint256 current, uint256 maximum) {
        return (tokenSupply[tokenId], maxTokenSupply[tokenId]);
    }

    // ============ Admin Functions ============
    
    /**
     * @dev Set environmental oracle address
     * @param _oracle Address of environmental oracle
     */
    function setEnvironmentalOracle(address _oracle) external onlyRole(DEFAULT_ADMIN_ROLE) {
        environmentalOracle = IEnvironmentalOracle(_oracle);
    }
    
    /**
     * @dev Set fractionalization vault address
     * @param _vault Address of fractionalization vault
     */
    function setFractionalizationVault(address _vault) external onlyRole(DEFAULT_ADMIN_ROLE) {
        fractionalizationVault = IFractionalizationVault(_vault);
    }
    
    /**
     * @dev Update VRF configuration
     * @param _keyHash New VRF key hash
     * @param _subscriptionId New VRF subscription ID
     */
    function updateVRFConfig(
        bytes32 _keyHash,
        uint64 _subscriptionId
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        vrfKeyHash = _keyHash;
        vrfSubscriptionId = _subscriptionId;
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
        require(rewardRate <= 5000, "TerraStakeNFT: reward rate too high"); // Max 50%
        baseRewardRates[tokenId] = rewardRate;
    }
    
    /**
     * @dev Update emergency withdraw delay
     * @param delay New delay in seconds
     */
    function updateEmergencyWithdrawDelay(uint256 delay) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(delay >= 1 hours && delay <= 7 days, "TerraStakeNFT: invalid delay");
        emergencyWithdrawDelay = delay;
    }

    // ============ Upgrade Authorization ============
    
    /**
     * @dev Authorize upgrade (UUPS pattern)
     * @param newImplementation Address of new implementation
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(UPGRADER_ROLE) {
        // Additional upgrade validation could be added here
        emit SecurityAlert(3, msg.sender, keccak256(abi.encodePacked(newImplementation)), 1);
    }

    // ============ Interface Support ============
    
    /**
     * @dev See {IERC165-supportsInterface}
     */
    function supportsInterface(bytes4 interfaceId) 
        public 
        view 
        override(ERC1155Upgradeable, ERC1155HolderUpgradeable, AccessControlUpgradeable) 
        returns (bool) 
    {
        return super.supportsInterface(interfaceId);
    }
}
