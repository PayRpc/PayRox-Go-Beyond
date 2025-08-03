// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IChunkFactory} from "../factory/interfaces/IChunkFactory.sol";
import {DeterministicChunkFactory} from "../factory/DeterministicChunkFactory.sol";
import {IDiamondLoupe} from "../dispatcher/enhanced/interfaces/IDiamondLoupe.sol";

/**
 * @title ChunkFactoryFacet
 * @notice Diamond facet that proxies calls to the DeterministicChunkFactory
 * @dev Enables hot-swapping of factory logic via ManifestDispatcher without redeploying
 * @author PayRox Enhancement Suite
 */
contract ChunkFactoryFacet is IChunkFactory {

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
    // STORAGE
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

    /// @notice Address of the deployed DeterministicChunkFactory
    address public immutable factoryAddress;

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

    /**
     * @notice Initialize the facet with the factory address
     * @param _factoryAddress Address of the deployed DeterministicChunkFactory
     */
    constructor(address _factoryAddress) {
        require(_factoryAddress != address(0), "ChunkFactoryFacet: Zero address");
        require(_factoryAddress.code.length > 0, "ChunkFactoryFacet: Not a contract");
        factoryAddress = _factoryAddress;
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
    // CORE DEPLOYMENT FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

    /**
     * @notice Deploy a single content-addressed chunk via the factory
     * @param data The data to deploy as a chunk
     * @return chunk The deployed chunk address
     * @return hash The content hash of the data
     */
    function stage(bytes calldata data)
        external
        payable
        override
        returns (address chunk, bytes32 hash)
    {
        (chunk, hash) = IChunkFactory(factoryAddress).stage{value: msg.value}(data);
    }

    /**
     * @notice Deploy multiple chunks with gas optimization via the factory
     * @param blobs Array of data to deploy as chunks
     * @return chunks Array of deployed chunk addresses
     * @return hashes Array of content hashes
     */
    function stageBatch(bytes[] calldata blobs)
        external
        payable
        override
        returns (address[] memory chunks, bytes32[] memory hashes)
    {
        (chunks, hashes) = IChunkFactory(factoryAddress).stageBatch{value: msg.value}(blobs);
    }

    /**
     * @notice Deploy deterministic contract with enhanced security validation
     * @param salt The salt for CREATE2 deployment
     * @param bytecode The contract bytecode
     * @param constructorArgs The constructor arguments
     * @return deployed The deployed contract address
     */
    function deployDeterministic(
        bytes32 salt,
        bytes calldata bytecode,
        bytes calldata constructorArgs
    ) external payable override returns (address deployed) {
        deployed = IChunkFactory(factoryAddress).deployDeterministic{value: msg.value}(salt, bytecode, constructorArgs);
    }

    /**
     * @notice Batch deploy with refund pattern for gas optimization
     * @param salts Array of salts for CREATE2 deployments
     * @param bytecodes Array of contract bytecodes
     * @param constructorArgs Array of constructor arguments
     * @return deployed Array of deployed contract addresses
     */
    function deployDeterministicBatch(
        bytes32[] calldata salts,
        bytes[] calldata bytecodes,
        bytes[] calldata constructorArgs
    ) external payable override returns (address[] memory deployed) {
        deployed = IChunkFactory(factoryAddress).deployDeterministicBatch{value: msg.value}(salts, bytecodes, constructorArgs);
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

    /**
     * @notice Predict CREATE2 address and content hash without deploying
     * @param data The data to predict for
     * @return predicted The predicted address
     * @return hash The content hash
     */
    function predict(bytes calldata data)
        external
        view
        override
        returns (address predicted, bytes32 hash)
    {
        (predicted, hash) = IChunkFactory(factoryAddress).predict(data);
    }

    /**
     * @notice Predict deterministic deployment address
     * @param salt The salt for CREATE2
     * @param codeHash The hash of the init code
     * @return predicted The predicted address
     */
    function predictAddress(bytes32 salt, bytes32 codeHash)
        external
        view
        override
        returns (address predicted)
    {
        return IChunkFactory(factoryAddress).predictAddress(salt, codeHash);
    }

    /**
     * @notice Batch prediction for multiple deployments
     * @param salts Array of salts
     * @param codeHashes Array of init code hashes
     * @return predicted Array of predicted addresses
     */
    function predictAddressBatch(
        bytes32[] calldata salts,
        bytes32[] calldata codeHashes
    ) external view override returns (address[] memory predicted) {
        return IChunkFactory(factoryAddress)
            .predictAddressBatch(salts, codeHashes);
    }

    /**
     * @notice Check if a chunk with this content hash exists
     * @param hash The content hash to check
     * @return True if chunk exists
     */
    function exists(bytes32 hash) external view override returns (bool) {
        return IChunkFactory(factoryAddress).exists(hash);
    }

    /**
     * @notice Check if contract is deployed at the given address
     * @param target The address to check
     * @return True if contract is deployed
     */
    function isDeployed(address target) external view override returns (bool) {
        return IChunkFactory(factoryAddress).isDeployed(target);
    }

    /**
     * @notice Validate bytecode size against CREATE2 bomb risk
     * @param bytecode The bytecode to validate
     * @return valid True if bytecode size is valid
     */
    function validateBytecodeSize(bytes calldata bytecode)
        external
        pure
        override
        returns (bool valid)
    {
        // EIP-3860: Contract code size limit of 24,576 bytes (0x6000)
        // Additional safety margin for gas optimization
        return bytecode.length > 0 && bytecode.length <= 24576;
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
    // ADMINISTRATION FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

    /**
     * @notice Get current deployment fee for user tier
     * @return fee The deployment fee
     */
    function getDeploymentFee() external view override returns (uint256 fee) {
        return IChunkFactory(factoryAddress).getDeploymentFee();
    }

    /**
     * @notice Get total number of deployments
     * @return count The deployment count
     */
    function getDeploymentCount() external view override returns (uint256 count) {
        return IChunkFactory(factoryAddress).getDeploymentCount();
    }

    /**
     * @notice Get user tier for tiered fee structure
     * @param user The user address
     * @return tier The user tier
     */
    function getUserTier(address user) external view override returns (uint8 tier) {
        return IChunkFactory(factoryAddress).getUserTier(user);
    }

    /**
     * @notice Set fee for specific tier (admin only) - delegates to factory
     * @param tier The tier to set fee for
     * @param fee The fee amount
     */
    function setTierFee(uint8 tier, uint256 fee) external override {
        DeterministicChunkFactory(factoryAddress).setTierFee(tier, fee);
    }

    /**
     * @notice Withdraw accumulated fees (pull pattern for security)
     */
    function withdrawFees() external override {
        DeterministicChunkFactory(factoryAddress).withdrawFees();
    }

    /**
     * @notice Emergency pause mechanism
     */
    function pause() external override {
        DeterministicChunkFactory(factoryAddress).pause();
    }

    /**
     * @notice Resume operations
     */
    function unpause() external override {
        DeterministicChunkFactory(factoryAddress).unpause();
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
    // ENHANCED FUNCTIONS (PayRox-specific)
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

    /**
     * @notice Verify system integrity via the factory
     * @return True if system integrity is verified
     */
    function verifySystemIntegrity() external view returns (bool) {
        return DeterministicChunkFactory(factoryAddress).verifySystemIntegrity();
    }

    /**
     * @notice Get the expected manifest hash
     * @return The expected manifest hash
     */
    function getExpectedManifestHash() external view returns (bytes32) {
        return DeterministicChunkFactory(factoryAddress).getExpectedManifestHash();
    }

    /**
     * @notice Get the expected factory bytecode hash
     * @return The expected factory bytecode hash
     */
    function getExpectedFactoryBytecodeHash() external view returns (bytes32) {
        return DeterministicChunkFactory(factoryAddress).getExpectedFactoryBytecodeHash();
    }

    /**
     * @notice Get the manifest dispatcher address
     * @return The manifest dispatcher address
     */
    function getManifestDispatcher() external view returns (address) {
        return DeterministicChunkFactory(factoryAddress).getManifestDispatcher();
    }

    /**
     * @notice Get the underlying factory address
     * @return The factory address
     */
    function getFactoryAddress() external view returns (address) {
        return factoryAddress;
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
    // DIAMOND STORAGE ACCESS (if needed for future diamond functionality)
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

    /**
     * @notice Check if this facet supports a given interface
     * @param interfaceId The interface identifier
     * @return True if interface is supported
     */
    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == type(IChunkFactory).interfaceId ||
               interfaceId == type(IDiamondLoupe).interfaceId ||
               interfaceId == 0x01ffc9a7; // ERC165
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
    // DIAMOND LOUPE COMPATIBILITY (for ecosystem tooling)
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

    /**
     * @notice Get this facet's function selectors for Diamond Loupe compatibility
     * @dev Returns all function selectors implemented by this facet
     * @return selectors Array of function selectors
     */
    function getFacetFunctionSelectors() external pure returns (bytes4[] memory selectors) {
        // Generate function selectors for all IChunkFactory functions
        selectors = new bytes4[](21); // Adjust count based on actual functions

        selectors[0] = IChunkFactory.stage.selector;
        selectors[1] = IChunkFactory.stageBatch.selector;
        selectors[2] = IChunkFactory.deployDeterministic.selector;
        selectors[3] = IChunkFactory.deployDeterministicBatch.selector;
        selectors[4] = IChunkFactory.predict.selector;
        selectors[5] = IChunkFactory.predictAddress.selector;
        selectors[6] = IChunkFactory.predictAddressBatch.selector;
        selectors[7] = IChunkFactory.exists.selector;
        selectors[8] = IChunkFactory.isDeployed.selector;
        selectors[9] = IChunkFactory.validateBytecodeSize.selector;
        selectors[10] = IChunkFactory.getDeploymentFee.selector;
        selectors[11] = IChunkFactory.getDeploymentCount.selector;
        selectors[12] = IChunkFactory.getUserTier.selector;
        selectors[13] = IChunkFactory.setTierFee.selector;
        selectors[14] = IChunkFactory.withdrawFees.selector;
        selectors[15] = IChunkFactory.pause.selector;
        selectors[16] = IChunkFactory.unpause.selector;

        // PayRox-specific functions
        selectors[17] = this.verifySystemIntegrity.selector;
        selectors[18] = this.getExpectedManifestHash.selector;
        selectors[19] = this.getExpectedFactoryBytecodeHash.selector;
        selectors[20] = this.getManifestDispatcher.selector;

        return selectors;
    }
}
