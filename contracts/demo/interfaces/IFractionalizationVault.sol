// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/**
 * @title IFractionalizationVault
 * @dev Interface for NFT fractionalization vault
 */
interface IFractionalizationVault {
    /**
     * @dev Fractionalizes an NFT into fungible tokens
     * @param nftContract The contract address of the NFT
     * @param tokenId The ID of the NFT to fractionalize
     * @param fractionCount The number of fractions to create
     * @return vaultId The ID of the created vault
     */
    function fractionalize(
        address nftContract,
        uint256 tokenId,
        uint256 fractionCount
    ) external returns (uint256 vaultId);
    
    /**
     * @dev Redeems fractions back to the original NFT
     * @param vaultId The ID of the vault
     * @param fractionAmount The amount of fractions to redeem
     */
    function redeem(uint256 vaultId, uint256 fractionAmount) external;
    
    /**
     * @dev Get vault information
     * @param vaultId The ID of the vault
     * @return nftContract The original NFT contract
     * @return tokenId The original token ID
     * @return totalFractions Total fractions created
     * @return availableFractions Available fractions for redemption
     */
    function getVaultInfo(uint256 vaultId) external view returns (
        address nftContract,
        uint256 tokenId,
        uint256 totalFractions,
        uint256 availableFractions
    );
}
