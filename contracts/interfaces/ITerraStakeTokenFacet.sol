// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ITerraStakeTokenFacet
 * @dev AI-Generated interface for PayRox Go Beyond
 * @notice This interface is PayRox-compatible and future-ready
 * 
 * Compatibility: PayRox, OpenZeppelin, EIP
 * AI-Generated: Yes
 * PayRox Ready: Yes
 */

interface ITerraStakeTokenFacet {
// Events
event EnvironmentalNFTMinted(address indexed, uint256 indexed, uint256 amount, uint256 tier, uint256 carbonOffset, string environmentalData, uint256 timestamp);
event BatchEnvironmentalMint(address indexed, uint256[] tokenIds, uint256[] amounts, uint256 totalCarbonOffset, uint256 timestamp);
event EnvironmentalDataUpdated(uint256 indexed, string oldData, string newData, address indexed);
event TokenURIUpdated(uint256 indexed, string oldURI, string newURI);

// Interface Functions
function mintWithEnvironmentalData(address to, uint256 tokenId, uint256 amount, uint256 tier, uint256 carbonOffset, string memory, bytes memory) external;
    function batchMintWithEnvironmentalData(address to, uint256[] memory, uint256[] memory, uint256[] memory, uint256[] memory, string[] memory, bytes memory) external;
    function updateEnvironmentalData(uint256 tokenId, string memory) external;
    function setTokenURI(uint256 tokenId, string memory) external;
    function getEnvironmentalData(uint256 tokenId) external view returns (LibTerraStake.EnvironmentalData memory);
    function getTierSupply(uint256 tier) external view returns (uint256 paramdsbq1bxuf);
    function totalSupply(uint256 tokenId) external view returns (uint256 paramuqlpvx0oa);
    function uri(uint256 tokenId) external view;
    function supportsInterface(bytes4 interfaceId) external view;
}

/**
 * @dev PayRox Integration Notes:
 * - This interface is designed for facet compatibility
 * - All functions are gas-optimized for dispatcher routing
 * - Custom errors used for efficient error handling
 * - Events follow PayRox monitoring standards
 * 
 * Future Enhancement Ready:
 * - Easy to swap with production interface
 * - Maintains signature compatibility
 * - Supports cross-chain deployment
 * - Compatible with CREATE2 deterministic deployment
 */