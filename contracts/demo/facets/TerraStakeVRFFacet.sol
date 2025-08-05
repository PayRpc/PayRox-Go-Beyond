// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

import "../interfaces/IVRFCoordinator.sol";

/**
 * @title TerraStakeVRFFacet
 * @dev VRF and randomness facet for TerraStake system - handles random rewards
 * @author PayRox Go Beyond Team
 */
contract TerraStakeVRFFacet is 
    AccessControlUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable
{
    // ============ Diamond-Safe Storage ============
    bytes32 private constant _SLOT = keccak256("payrox.facets.terrastake.vrf.v1");

    struct Layout {
        // VRF Configuration
        IVRFCoordinator vrfCoordinator;
        bytes32 vrfKeyHash;
        uint64 vrfSubscriptionId;
        uint16 vrfRequestConfirmations;
        uint32 vrfCallbackGasLimit;
        
        // VRF randomness requests
        mapping(uint256 => address) vrfRequests;
        mapping(address => uint256) pendingRandomness;
        
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

    // ============ Events ============
    event RandomnessRequested(address indexed requester, uint256 indexed requestId);
    event RandomnessReceived(address indexed requester, uint256 indexed requestId, uint256 randomness);
    event RandomRewardProcessed(address indexed user, uint256 indexed tokenId, uint256 amount, uint256 rewardType);

    // ============ Custom Errors ============
    error TerraStakeVRF__AlreadyInitialized();
    error TerraStakeVRF__NotInitialized();
    error TerraStakeVRF__RandomnessNotReady(address requester);

    // ============ Modifiers ============
    modifier onlyInitialized() {
        require(_layout().initialized, "TerraStakeVRF: not initialized");
        _;
    }

    // ============ Initialization ============
    
    /**
     * @dev Initialize the VRF facet
     * @param _vrfCoordinator Address of VRF coordinator
     * @param _vrfKeyHash VRF key hash
     * @param _vrfSubscriptionId VRF subscription ID
     */
    function initializeVRF(
        address _vrfCoordinator,
        bytes32 _vrfKeyHash,
        uint64 _vrfSubscriptionId
    ) external {
        Layout storage l = _layout();
        if (l.initialized) revert TerraStakeVRF__AlreadyInitialized();

        __AccessControl_init();
        __Pausable_init();
        __ReentrancyGuard_init();

        // Set VRF configuration
        l.vrfCoordinator = IVRFCoordinator(_vrfCoordinator);
        l.vrfKeyHash = _vrfKeyHash;
        l.vrfSubscriptionId = _vrfSubscriptionId;
        l.vrfRequestConfirmations = 3;
        l.vrfCallbackGasLimit = 100000;
        
        l.initialized = true;
    }

    // ============ VRF and Randomness Functions ============
    
    /**
     * @dev Request randomness for enhanced features
     */
    function requestRandomness() 
        external 
        onlyInitialized
        whenNotPaused
        nonReentrant
    {
        Layout storage l = _layout();
        require(l.pendingRandomness[msg.sender] == 0, "TerraStakeVRF: randomness already requested");
        
        uint256 requestId = l.vrfCoordinator.requestRandomWords(
            l.vrfKeyHash,
            l.vrfSubscriptionId,
            l.vrfRequestConfirmations,
            l.vrfCallbackGasLimit,
            1
        );
        
        l.vrfRequests[requestId] = msg.sender;
        l.pendingRandomness[msg.sender] = requestId;
        
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
        Layout storage l = _layout();
        require(msg.sender == address(l.vrfCoordinator), "TerraStakeVRF: only VRF coordinator");
        
        address requester = l.vrfRequests[requestId];
        require(requester != address(0), "TerraStakeVRF: invalid request");
        
        // Process randomness (simplified - could trigger rare mints, bonuses, etc.)
        uint256 randomness = randomWords[0];
        
        // Clear pending request
        delete l.vrfRequests[requestId];
        delete l.pendingRandomness[requester];
        
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
        
        uint256 tokenId;
        uint256 amount = 1;
        uint256 rewardType;
        
        if (rewardTier <= 5) {
            // 5% chance for mythic
            tokenId = TERRA_MYTHIC;
            rewardType = 4;
        } else if (rewardTier <= 20) {
            // 15% chance for legendary
            tokenId = TERRA_LEGENDARY;
            rewardType = 3;
        } else if (rewardTier <= 50) {
            // 30% chance for premium
            tokenId = TERRA_PREMIUM;
            rewardType = 2;
        } else {
            // 50% chance for basic
            tokenId = TERRA_BASIC;
            rewardType = 1;
        }
        
        emit RandomRewardProcessed(user, tokenId, amount, rewardType);
    }

    // ============ View Functions ============
    
    /**
     * @dev Check if user has pending randomness request
     * @param user Address to check
     * @return requestId Pending request ID (0 if none)
     */
    function getPendingRandomness(address user) external view returns (uint256) {
        return _layout().pendingRandomness[user];
    }
    
    /**
     * @dev Get VRF configuration
     * @return coordinator VRF coordinator address
     * @return keyHash VRF key hash
     * @return subscriptionId VRF subscription ID
     * @return requestConfirmations Request confirmations
     * @return callbackGasLimit Callback gas limit
     */
    function getVRFConfig() external view returns (
        address coordinator,
        bytes32 keyHash,
        uint64 subscriptionId,
        uint16 requestConfirmations,
        uint32 callbackGasLimit
    ) {
        Layout storage l = _layout();
        return (
            address(l.vrfCoordinator),
            l.vrfKeyHash,
            l.vrfSubscriptionId,
            l.vrfRequestConfirmations,
            l.vrfCallbackGasLimit
        );
    }

    // ============ Admin Functions ============
    
    /**
     * @dev Update VRF configuration
     * @param _keyHash New VRF key hash
     * @param _subscriptionId New VRF subscription ID
     */
    function updateVRFConfig(
        bytes32 _keyHash,
        uint64 _subscriptionId
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        Layout storage l = _layout();
        l.vrfKeyHash = _keyHash;
        l.vrfSubscriptionId = _subscriptionId;
    }
    
    /**
     * @dev Update VRF coordinator address
     * @param _coordinator New VRF coordinator address
     */
    function updateVRFCoordinator(address _coordinator) external onlyRole(DEFAULT_ADMIN_ROLE) {
        Layout storage l = _layout();
        l.vrfCoordinator = IVRFCoordinator(_coordinator);
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
        name = "TerraStakeVRFFacet";
        version = "1.0.0";

        selectors = new bytes4[](7);
        selectors[0] = this.initializeVRF.selector;
        selectors[1] = this.requestRandomness.selector;
        selectors[2] = this.fulfillRandomWords.selector;
        selectors[3] = this.getPendingRandomness.selector;
        selectors[4] = this.getVRFConfig.selector;
        selectors[5] = this.updateVRFConfig.selector;
        selectors[6] = this.getFacetInfo.selector;
    }
}
