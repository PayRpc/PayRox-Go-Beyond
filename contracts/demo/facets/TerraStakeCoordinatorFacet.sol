// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

import "../interfaces/IFractionalizationVault.sol";

/**
 * @title TerraStakeCoordinatorFacet
 * @dev Coordinator facet that orchestrates interactions between other TerraStake facets
 * @author PayRox Go Beyond Team
 */
contract TerraStakeCoordinatorFacet is 
    AccessControlUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable
{
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    // ============ Diamond-Safe Storage ============
    bytes32 private constant _SLOT = keccak256("payrox.facets.terrastake.coordinator.v1");

    struct Layout {
        // Fractionalization tracking
        mapping(uint256 => mapping(uint256 => bool)) isFractionalized;
        mapping(uint256 => mapping(uint256 => uint256)) fractionalizationVaultId;
        
        // Oracle signature tracking
        mapping(bytes32 => bool) usedSignatures;
        
        // Contract dependencies
        IFractionalizationVault fractionalizationVault;
        
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

    // ============ Roles ============
    bytes32 public constant COORDINATOR_ROLE = keccak256("COORDINATOR_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");
    uint256 public constant TERRA_MYTHIC = 4;

    // ============ Role Definitions ============
    bytes32 public constant FRACTIONALIZATION_ROLE = keccak256("FRACTIONALIZATION_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    // ============ Structs ============
    struct EnvironmentalData {
        uint256 carbonOffset;      // Carbon offset in tons (scaled by 1e18)
        uint256 impactScore;       // Environmental impact score (0-100)
        uint256 regionId;          // Geographic region identifier
        bytes32 certificationHash; // Environmental certification hash
        uint256 lastUpdated;      // Timestamp of last update
    }

    // ============ Events ============
    event TokenFractionalized(
        uint256 indexed tokenId,
        uint256 indexed tokenInstanceId,
        uint256 indexed vaultId,
        uint256 fractionCount
    );

    event EnvironmentalDataUpdated(
        address indexed tokenContract,
        uint256 indexed tokenId,
        uint256 indexed tokenInstanceId,
        uint256 carbonOffset,
        uint256 impactScore,
        uint256 regionId
    );

    event StakingCompleted(
        address indexed user,
        uint256 indexed tokenId,
        uint256 stakedAmount,
        uint256 rewardsEarned,
        uint256 newTokens
    );

    event EmergencyStakeRelease(
        address indexed user,
        uint256 indexed tokenId,
        uint256 amount
    );

    // ============ Custom Errors ============
    error TerraStakeCoordinator__InvalidTokenId(uint256 tokenId);
    error TerraStakeCoordinator__TokenAlreadyFractionalized(uint256 tokenId, uint256 instanceId);
    error TerraStakeCoordinator__InvalidSignature(bytes32 hash, bytes signature);
    error TerraStakeCoordinator__SignatureAlreadyUsed(bytes32 signatureHash);
    error TerraStakeCoordinator__InvalidEnvironmentalData(uint256 parameterIndex);
    error TerraStakeCoordinator__AlreadyInitialized();
    error TerraStakeCoordinator__NotInitialized();

    // ============ Modifiers ============
    modifier onlyValidTokenId(uint256 tokenId) {
        if (tokenId == 0 || tokenId > TERRA_MYTHIC) {
            revert TerraStakeCoordinator__InvalidTokenId(tokenId);
        }
        _;
    }

    modifier onlyInitialized() {
        require(_layout().initialized, "TerraStakeCoordinator: not initialized");
        _;
    }

    // ============ Initialization ============
    
    /**
     * @dev Initialize the coordinator facet
     */
    function initializeCoordinator() external {
        Layout storage l = _layout();
        if (l.initialized) revert TerraStakeCoordinator__AlreadyInitialized();

        __AccessControl_init();
        __Pausable_init();
        __ReentrancyGuard_init();
        
        l.initialized = true;
    }

    // ============ Coordinated Functions ============
    
    /**
     * @dev Complete staking process with token rewards
     * @param tokenId Type of token to unstake
     * @return stakedAmount Amount that was staked
     * @return rewardsEarned Calculated rewards
     */
    function completeStaking(uint256 tokenId) 
        external 
        onlyValidTokenId(tokenId)
        onlyInitialized
        whenNotPaused
        nonReentrant
        returns (uint256 stakedAmount, uint256 rewardsEarned)
    {
        // This function would coordinate between StakingFacet and TokenFacet
        // For now, we'll emit an event to signal the completion
        
        // In a full implementation, this would:
        // 1. Call endStaking() on StakingFacet to get rewards
        // 2. Call token transfer functions to return staked tokens
        // 3. Call mint function to create reward tokens
        
        // For demo purposes, we'll use placeholder values
        stakedAmount = 50; // This would come from actual staking data
        rewardsEarned = 5;  // This would be calculated
        
        emit StakingCompleted(msg.sender, tokenId, stakedAmount, rewardsEarned, rewardsEarned);
    }
    
    /**
     * @dev Execute emergency stake release
     * @param user Address of user
     * @param tokenId Type of token
     * @param amount Amount to release
     */
    function executeEmergencyStakeRelease(
        address user,
        uint256 tokenId,
        uint256 amount
    ) 
        external 
        onlyRole(EMERGENCY_ROLE)
        onlyValidTokenId(tokenId)
        onlyInitialized
        nonReentrant
    {
        // This would coordinate emergency releases between facets
        emit EmergencyStakeRelease(user, tokenId, amount);
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
        onlyInitialized
        whenNotPaused
        nonReentrant
    {
        Layout storage l = _layout();
        
        require(fractionCount > 1, "TerraStakeCoordinator: fraction count must be > 1");
        require(
            !l.isFractionalized[tokenId][instanceId],
            "TerraStakeCoordinator: token already fractionalized"
        );
        
        // Only allow fractionalization of high-tier tokens
        require(
            tokenId >= TERRA_LEGENDARY,
            "TerraStakeCoordinator: only legendary+ tokens can be fractionalized"
        );
        
        // Create fractionalization vault if available
        if (address(l.fractionalizationVault) != address(0)) {
            uint256 vaultId = l.fractionalizationVault.fractionalize(
                address(this),
                tokenId,
                fractionCount
            );
            
            l.fractionalizationVaultId[tokenId][instanceId] = vaultId;
        }
        
        // Mark as fractionalized
        l.isFractionalized[tokenId][instanceId] = true;
        
        emit TokenFractionalized(tokenId, instanceId, l.fractionalizationVaultId[tokenId][instanceId], fractionCount);
    }

    /**
     * @dev Check if token is fractionalized
     * @param tokenId Type of token
     * @param instanceId Specific instance
     * @return isTokenFractionalized Whether the token is fractionalized
     * @return vaultId Fractionalization vault ID (0 if not fractionalized)
     */
    function getFractionalizationInfo(
        uint256 tokenId,
        uint256 instanceId
    ) external view returns (bool isTokenFractionalized, uint256 vaultId) {
        Layout storage l = _layout();
        return (
            l.isFractionalized[tokenId][instanceId],
            l.fractionalizationVaultId[tokenId][instanceId]
        );
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
        onlyInitialized
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
        
        // Mark signature as used
        Layout storage l = _layout();
        l.usedSignatures[keccak256(signature)] = true;
        
        // This would update the token facet's environmental data
        // For now, just emit the event
        emit EnvironmentalDataUpdated(
            address(this),
            tokenId,
            instanceId,
            newData.carbonOffset,
            newData.impactScore,
            newData.regionId
        );
    }
    
    /**
     * @dev Verify oracle signature
     * @param hash Data hash to verify
     * @param signature Oracle signature
     */
    function _verifyOracleSignature(bytes32 hash, bytes memory signature) private {
        Layout storage l = _layout();
        
        bytes32 signatureHash = keccak256(signature);
        if (l.usedSignatures[signatureHash]) {
            revert TerraStakeCoordinator__SignatureAlreadyUsed(signatureHash);
        }
        
        bytes32 ethSignedHash = hash.toEthSignedMessageHash();
        address signer = ethSignedHash.recover(signature);
        
        if (!hasRole(ORACLE_ROLE, signer)) {
            revert TerraStakeCoordinator__InvalidSignature(hash, signature);
        }
    }
    
    /**
     * @dev Validate environmental data parameters
     * @param data Environmental data to validate
     */
    function _validateEnvironmentalData(EnvironmentalData memory data) private pure {
        if (data.impactScore > 100) {
            revert TerraStakeCoordinator__InvalidEnvironmentalData(1);
        }
        if (data.carbonOffset > 1000000 * 1e18) { // Max 1M tons
            revert TerraStakeCoordinator__InvalidEnvironmentalData(0);
        }
    }

    // ============ Admin Functions ============
    
    /**
     * @dev Set fractionalization vault address
     * @param _vault Address of fractionalization vault
     */
    function setFractionalizationVault(address _vault) external onlyRole(DEFAULT_ADMIN_ROLE) {
        Layout storage l = _layout();
        l.fractionalizationVault = IFractionalizationVault(_vault);
    }

    /**
     * @dev Get fractionalization vault address
     * @return Address of fractionalization vault
     */
    function getFractionalizationVault() external view returns (address) {
        return address(_layout().fractionalizationVault);
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
        name = "TerraStakeCoordinatorFacet";
        version = "1.0.0";

        selectors = new bytes4[](9);
        selectors[0] = this.initializeCoordinator.selector;
        selectors[1] = this.completeStaking.selector;
        selectors[2] = this.executeEmergencyStakeRelease.selector;
        selectors[3] = this.fractionalize.selector;
        selectors[4] = this.getFractionalizationInfo.selector;
        selectors[5] = this.updateEnvironmentalData.selector;
        selectors[6] = this.setFractionalizationVault.selector;
        selectors[7] = this.getFractionalizationVault.selector;
        selectors[8] = this.getFacetInfo.selector;
    }
}
