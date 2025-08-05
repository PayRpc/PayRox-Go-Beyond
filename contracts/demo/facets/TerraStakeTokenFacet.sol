// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/utils/ERC1155HolderUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

import "../interfaces/IEnvironmentalOracle.sol";

/**
 * @title TerraStakeTokenFacet
 * @dev Token management facet for TerraStake system - handles ERC1155 tokens and minting
 * @author PayRox Go Beyond Team
 */
contract TerraStakeTokenFacet is 
    ERC1155Upgradeable,
    ERC1155HolderUpgradeable,
    AccessControlUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable
{
    // ============ Diamond-Safe Storage ============
    bytes32 private constant _SLOT = keccak256("payrox.facets.terrastake.token.v1");

    struct Layout {
        // Token metadata and supply tracking
        mapping(uint256 => uint256) tokenSupply;
        mapping(uint256 => uint256) maxTokenSupply;
        mapping(uint256 => string) tokenURIs;
        
        // Environmental impact tracking
        mapping(uint256 => mapping(uint256 => EnvironmentalData)) tokenEnvironmentalData;
        
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

    // ============ Role Definitions ============
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
    event TokenMinted(
        address indexed to,
        uint256 indexed tokenId,
        uint256 amount,
        uint256 indexed mintType
    );
    
    event EnvironmentalDataUpdated(
        address indexed tokenContract,
        uint256 indexed tokenId,
        uint256 indexed tokenInstanceId,
        uint256 carbonOffset,
        uint256 impactScore,
        uint256 regionId
    );

    // ============ Custom Errors ============
    error TerraStakeToken__InvalidTokenId(uint256 tokenId);
    error TerraStakeToken__InsufficientSupply(uint256 requested, uint256 available);
    error TerraStakeToken__InvalidAmount(uint256 amount);
    error TerraStakeToken__InvalidEnvironmentalData(uint256 parameterIndex);
    error TerraStakeToken__AlreadyInitialized();
    error TerraStakeToken__NotInitialized();

    // ============ Modifiers ============
    modifier onlyValidTokenId(uint256 tokenId) {
        if (tokenId == 0 || tokenId > TERRA_MYTHIC) {
            revert TerraStakeToken__InvalidTokenId(tokenId);
        }
        _;
    }
    
    modifier onlyPositiveAmount(uint256 amount) {
        if (amount == 0) {
            revert TerraStakeToken__InvalidAmount(amount);
        }
        _;
    }

    modifier onlyInitialized() {
        require(_layout().initialized, "TerraStakeToken: not initialized");
        _;
    }

    // ============ Initialization ============
    
    /**
     * @dev Initialize the token facet
     * @param _uri Base URI for token metadata
     */
    function initializeToken(string memory _uri) external {
        Layout storage l = _layout();
        if (l.initialized) revert TerraStakeToken__AlreadyInitialized();

        __ERC1155_init(_uri);
        __ERC1155Holder_init();
        __AccessControl_init();
        __Pausable_init();
        __ReentrancyGuard_init();

        // Initialize token configurations
        _initializeTokenConfigs();
        l.initialized = true;
    }
    
    /**
     * @dev Initialize token configurations and supply limits
     */
    function _initializeTokenConfigs() private {
        Layout storage l = _layout();
        
        // Set maximum supplies for each token type
        l.maxTokenSupply[TERRA_BASIC] = 1000000;     // 1M basic tokens
        l.maxTokenSupply[TERRA_PREMIUM] = 100000;    // 100K premium tokens
        l.maxTokenSupply[TERRA_LEGENDARY] = 10000;   // 10K legendary tokens
        l.maxTokenSupply[TERRA_MYTHIC] = 1000;       // 1K mythic tokens
        
        // Set token URIs
        l.tokenURIs[TERRA_BASIC] = "terra-basic.json";
        l.tokenURIs[TERRA_PREMIUM] = "terra-premium.json";
        l.tokenURIs[TERRA_LEGENDARY] = "terra-legendary.json";
        l.tokenURIs[TERRA_MYTHIC] = "terra-mythic.json";
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
        onlyInitialized
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
    ) internal {
        Layout storage l = _layout();
        
        // Check supply limits
        uint256 newSupply = l.tokenSupply[tokenId] + amount;
        if (newSupply > l.maxTokenSupply[tokenId]) {
            revert TerraStakeToken__InsufficientSupply(amount, l.maxTokenSupply[tokenId] - l.tokenSupply[tokenId]);
        }
        
        // Validate environmental data
        _validateEnvironmentalData(environmentalData);
        
        // Update supply tracking
        l.tokenSupply[tokenId] = newSupply;
        
        // Mint tokens
        _mint(to, tokenId, amount, "");
        
        // Store environmental data for each token instance
        for (uint256 i = 0; i < amount; i++) {
            uint256 instanceId = l.tokenSupply[tokenId] - amount + i;
            l.tokenEnvironmentalData[tokenId][instanceId] = environmentalData;
        }
        
        emit TokenMinted(to, tokenId, amount, 1);
        
        // Emit environmental data events
        for (uint256 i = 0; i < amount; i++) {
            uint256 instanceId = l.tokenSupply[tokenId] - amount + i;
            emit EnvironmentalDataUpdated(
                address(this),
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
        onlyInitialized
        whenNotPaused
        nonReentrant
    {
        require(
            tokenIds.length == amounts.length && 
            amounts.length == environmentalDataArray.length,
            "TerraStakeToken: arrays length mismatch"
        );
        
        for (uint256 i = 0; i < tokenIds.length; i++) {
            _mintWithEnvironmentalData(to, tokenIds[i], amounts[i], environmentalDataArray[i]);
        }
    }

    // ============ View Functions ============
    
    /**
     * @dev Get URI for a specific token type
     * @param tokenId Type of token
     * @return Token URI string
     */
    function uri(uint256 tokenId) public view override returns (string memory) {
        Layout storage l = _layout();
        return string(abi.encodePacked(super.uri(tokenId), l.tokenURIs[tokenId]));
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
        return _layout().tokenEnvironmentalData[tokenId][instanceId];
    }
    
    /**
     * @dev Get token supply information
     * @param tokenId Type of token
     * @return current Current supply
     * @return maximum Maximum supply
     */
    function getSupplyInfo(uint256 tokenId) external view returns (uint256 current, uint256 maximum) {
        Layout storage l = _layout();
        return (l.tokenSupply[tokenId], l.maxTokenSupply[tokenId]);
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
     * @dev Get environmental oracle address
     * @return Address of environmental oracle
     */
    function getEnvironmentalOracle() external view returns (address) {
        return address(_layout().environmentalOracle);
    }

    // ============ Internal Functions ============
    
    /**
     * @dev Validate environmental data parameters
     * @param data Environmental data to validate
     */
    function _validateEnvironmentalData(EnvironmentalData memory data) private pure {
        if (data.impactScore > 100) {
            revert TerraStakeToken__InvalidEnvironmentalData(1);
        }
        if (data.carbonOffset > 1000000 * 1e18) { // Max 1M tons
            revert TerraStakeToken__InvalidEnvironmentalData(0);
        }
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
        name = "TerraStakeTokenFacet";
        version = "1.0.0";

        selectors = new bytes4[](8);
        selectors[0] = this.initializeToken.selector;
        selectors[1] = this.mintWithEnvironmentalData.selector;
        selectors[2] = this.batchMintWithEnvironmentalData.selector;
        selectors[3] = this.getEnvironmentalData.selector;
        selectors[4] = this.getSupplyInfo.selector;
        selectors[5] = this.setEnvironmentalOracle.selector;
        selectors[6] = this.getEnvironmentalOracle.selector;
        selectors[7] = this.getFacetInfo.selector;
    }
}
