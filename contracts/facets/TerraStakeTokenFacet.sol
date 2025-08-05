// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "../utils/LibTerraStake.sol";

/**
 * @title TerraStakeTokenFacet
 * @dev Token management functions for TerraStake environmental NFTs
 * 
 * This facet handles all ERC1155 token operations including minting with
 * environmental data, batch operations, and metadata management. Each token
 * represents a specific environmental impact or conservation effort.
 * 
 * Key Features:
 * - Multi-tier environmental NFTs (Bronze, Silver, Gold, Platinum)
 * - Environmental data integration for real-world impact tracking
 * - Batch minting for efficient operations
 * - Metadata URI management with IPFS integration
 * - Carbon footprint and impact verification
 * 
 * @author PayRox Go Beyond AI Toolchain
 */
contract TerraStakeTokenFacet is ERC1155Upgradeable, AccessControlUpgradeable, PausableUpgradeable, ReentrancyGuardUpgradeable {
    using LibTerraStake for LibTerraStake.TerraStakeStorage;

    // Token tier definitions
    uint256 public constant BRONZE_TIER = 1;
    uint256 public constant SILVER_TIER = 2;
    uint256 public constant GOLD_TIER = 3;
    uint256 public constant PLATINUM_TIER = 4;

    // Role for environmental data validation
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant VALIDATOR_ROLE = keccak256("VALIDATOR_ROLE");

    // Events for environmental NFT operations
    event EnvironmentalNFTMinted(
        address indexed recipient,
        uint256 indexed tokenId,
        uint256 amount,
        uint256 tier,
        uint256 carbonOffset,
        string environmentalData,
        uint256 timestamp
    );

    event BatchEnvironmentalMint(
        address indexed recipient,
        uint256[] tokenIds,
        uint256[] amounts,
        uint256 totalCarbonOffset,
        uint256 timestamp
    );

    event EnvironmentalDataUpdated(
        uint256 indexed tokenId,
        string oldData,
        string newData,
        address indexed validator
    );

    event TokenURIUpdated(
        uint256 indexed tokenId,
        string oldURI,
        string newURI
    );

    /**
     * @dev Mint environmental NFT with real-world impact data
     * @param to Recipient address
     * @param tokenId Token ID representing environmental category
     * @param amount Amount of tokens to mint
     * @param tier Environmental impact tier (1-4)
     * @param carbonOffset Carbon offset amount in tons CO2
     * @param environmentalData IPFS hash or JSON data about environmental impact
     * @param data Additional data for transfer hooks
     */
    function mintWithEnvironmentalData(
        address to,
        uint256 tokenId,
        uint256 amount,
        uint256 tier,
        uint256 carbonOffset,
        string memory environmentalData,
        bytes memory data
    ) external onlyRole(MINTER_ROLE) whenNotPaused nonReentrant {
        require(to != address(0), "TerraStakeToken: mint to zero address");
        require(amount > 0, "TerraStakeToken: amount must be positive");
        require(tier >= BRONZE_TIER && tier <= PLATINUM_TIER, "TerraStakeToken: invalid tier");
        require(carbonOffset > 0, "TerraStakeToken: carbon offset must be positive");
        require(bytes(environmentalData).length > 0, "TerraStakeToken: empty environmental data");

        LibTerraStake.TerraStakeStorage storage ts = LibTerraStake.terraStakeStorage();
        
        // Store environmental metadata
        ts.environmentalData[tokenId] = LibTerraStake.EnvironmentalData({
            tier: tier,
            carbonOffset: carbonOffset,
            dataHash: environmentalData,
            validatedBy: msg.sender,
            timestamp: block.timestamp,
            isActive: true
        });

        // Update tier supply tracking
        ts.tierSupply[tier] += amount;
        ts.totalSupply[tokenId] += amount;
        
        // Mint the token
        _mint(to, tokenId, amount, data);
        
        emit EnvironmentalNFTMinted(
            to,
            tokenId,
            amount,
            tier,
            carbonOffset,
            environmentalData,
            block.timestamp
        );
    }

    /**
     * @dev Batch mint environmental NFTs for efficient operations
     * @param to Recipient address
     * @param tokenIds Array of token IDs
     * @param amounts Array of amounts for each token
     * @param tiers Array of tiers for each token
     * @param carbonOffsets Array of carbon offsets for each token
     * @param environmentalDataArray Array of environmental data for each token
     * @param data Additional data for transfer hooks
     */
    function batchMintWithEnvironmentalData(
        address to,
        uint256[] memory tokenIds,
        uint256[] memory amounts,
        uint256[] memory tiers,
        uint256[] memory carbonOffsets,
        string[] memory environmentalDataArray,
        bytes memory data
    ) external onlyRole(MINTER_ROLE) whenNotPaused nonReentrant {
        require(to != address(0), "TerraStakeToken: mint to zero address");
        require(tokenIds.length > 0, "TerraStakeToken: empty arrays");
        require(
            tokenIds.length == amounts.length &&
            tokenIds.length == tiers.length &&
            tokenIds.length == carbonOffsets.length &&
            tokenIds.length == environmentalDataArray.length,
            "TerraStakeToken: array length mismatch"
        );

        LibTerraStake.TerraStakeStorage storage ts = LibTerraStake.terraStakeStorage();
        uint256 totalCarbonOffset = 0;

        // Process each token in the batch
        for (uint256 i = 0; i < tokenIds.length; i++) {
            require(amounts[i] > 0, "TerraStakeToken: amount must be positive");
            require(tiers[i] >= BRONZE_TIER && tiers[i] <= PLATINUM_TIER, "TerraStakeToken: invalid tier");
            require(carbonOffsets[i] > 0, "TerraStakeToken: carbon offset must be positive");
            require(bytes(environmentalDataArray[i]).length > 0, "TerraStakeToken: empty environmental data");

            // Store environmental metadata
            ts.environmentalData[tokenIds[i]] = LibTerraStake.EnvironmentalData({
                tier: tiers[i],
                carbonOffset: carbonOffsets[i],
                dataHash: environmentalDataArray[i],
                validatedBy: msg.sender,
                timestamp: block.timestamp,
                isActive: true
            });

            // Update tracking
            ts.tierSupply[tiers[i]] += amounts[i];
            ts.totalSupply[tokenIds[i]] += amounts[i];
            totalCarbonOffset += carbonOffsets[i];
        }

        // Batch mint all tokens
        _mintBatch(to, tokenIds, amounts, data);

        emit BatchEnvironmentalMint(
            to,
            tokenIds,
            amounts,
            totalCarbonOffset,
            block.timestamp
        );
    }

    /**
     * @dev Update environmental data for existing token (admin only)
     * @param tokenId Token ID to update
     * @param newEnvironmentalData New environmental data
     */
    function updateEnvironmentalData(
        uint256 tokenId,
        string memory newEnvironmentalData
    ) external onlyRole(VALIDATOR_ROLE) {
        require(bytes(newEnvironmentalData).length > 0, "TerraStakeToken: empty environmental data");
        
        LibTerraStake.TerraStakeStorage storage ts = LibTerraStake.terraStakeStorage();
        require(ts.environmentalData[tokenId].timestamp > 0, "TerraStakeToken: token does not exist");

        string memory oldData = ts.environmentalData[tokenId].dataHash;
        ts.environmentalData[tokenId].dataHash = newEnvironmentalData;
        ts.environmentalData[tokenId].validatedBy = msg.sender;
        ts.environmentalData[tokenId].timestamp = block.timestamp;

        emit EnvironmentalDataUpdated(tokenId, oldData, newEnvironmentalData, msg.sender);
    }

    /**
     * @dev Set URI for a specific token
     * @param tokenId Token ID
     * @param tokenURI URI for the token metadata
     */
    function setTokenURI(
        uint256 tokenId,
        string memory tokenURI
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(bytes(tokenURI).length > 0, "TerraStakeToken: empty URI");
        
        LibTerraStake.TerraStakeStorage storage ts = LibTerraStake.terraStakeStorage();
        string memory oldURI = ts.tokenURIs[tokenId];
        ts.tokenURIs[tokenId] = tokenURI;

        emit TokenURIUpdated(tokenId, oldURI, tokenURI);
    }

    /**
     * @dev Get environmental data for a token
     * @param tokenId Token ID to query
     * @return Environmental data struct
     */
    function getEnvironmentalData(uint256 tokenId) external view returns (LibTerraStake.EnvironmentalData memory) {
        LibTerraStake.TerraStakeStorage storage ts = LibTerraStake.terraStakeStorage();
        return ts.environmentalData[tokenId];
    }

    /**
     * @dev Get supply information for a specific tier
     * @param tier Tier to query (1-4)
     * @return Total supply for the tier
     */
    function getTierSupply(uint256 tier) external view returns (uint256) {
        require(tier >= BRONZE_TIER && tier <= PLATINUM_TIER, "TerraStakeToken: invalid tier");
        LibTerraStake.TerraStakeStorage storage ts = LibTerraStake.terraStakeStorage();
        return ts.tierSupply[tier];
    }

    /**
     * @dev Get total supply for a token ID
     * @param tokenId Token ID to query
     * @return Total supply for the token
     */
    function totalSupply(uint256 tokenId) external view returns (uint256) {
        LibTerraStake.TerraStakeStorage storage ts = LibTerraStake.terraStakeStorage();
        return ts.totalSupply[tokenId];
    }

    /**
     * @dev Get URI for a specific token
     * @param tokenId Token ID to query
     * @return URI for the token
     */
    function uri(uint256 tokenId) public view virtual override returns (string memory) {
        LibTerraStake.TerraStakeStorage storage ts = LibTerraStake.terraStakeStorage();
        
        // Return specific token URI if set, otherwise use base URI
        if (bytes(ts.tokenURIs[tokenId]).length > 0) {
            return ts.tokenURIs[tokenId];
        }
        
        return string(abi.encodePacked(ts.baseURI, _toString(tokenId)));
    }

    /**
     * @dev Check if contract supports an interface
     * @param interfaceId Interface identifier
     * @return Whether interface is supported
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC1155Upgradeable, AccessControlUpgradeable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    /**
     * @dev Internal function to convert uint to string
     * @param value Value to convert
     * @return String representation
     */
    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }

    /**
     * @dev Hook called before token transfers
     * @param from From address
     * @param to To address
     * @param ids Token IDs
     * @param amounts Amounts
     */
    function _update(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts
    ) internal virtual override {
        require(!paused(), "TerraStakeToken: token transfer while paused");
        super._update(from, to, ids, amounts);
    }
}
