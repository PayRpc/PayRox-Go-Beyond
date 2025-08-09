// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IChunkFactory} from "../factory/interfaces/IChunkFactory.sol";
import {DeterministicChunkFactory} from "../factory/DeterministicChunkFactory.sol";

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
    address payable public immutable factoryAddress;

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
        factoryAddress = payable(_factoryAddress);
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
     * @notice Deploy multiple content-addressed chunks via the factory
     * @param dataArray Array of data to deploy as chunks
     * @return chunks Array of deployed chunk addresses
     */
    function stageMany(bytes[] calldata dataArray)
        external
        payable
        override
        returns (address[] memory chunks)
    {
        chunks = IChunkFactory(factoryAddress).stageMany{value: msg.value}(dataArray);
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
     * @notice Read data from a deployed chunk
     * @param chunk The chunk address to read from
     * @return The stored data
     */
    function read(address chunk)
        external
        view
        override
        returns (bytes memory)
    {
        return IChunkFactory(factoryAddress).read(chunk);
    }

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
        return DeterministicChunkFactory(factoryAddress).isDeployedContract(target);
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
        // EIP-3860 initcode limit is 49,152 bytes
        return bytecode.length > 0 && bytecode.length <= 49_152;
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
    // ADMINISTRATION FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

    /**
     * @notice Get current deployment fee for user tier
     * @return fee The deployment fee
     */
    function getDeploymentFee() external view override returns (uint256 fee) {
        DeterministicChunkFactory F = DeterministicChunkFactory(factoryAddress);
        if (!F.feesEnabled()) return 0;
        uint8 tier = F.userTiers(msg.sender);
        uint256 tf = F.tierFees(tier);
        uint256 base = F.baseFeeWei();
        return tf > 0 ? tf : base;
    }

    /**
     * @notice Get total number of deployments
     * @return count The deployment count
     */
    function getDeploymentCount() external view override returns (uint256 count) {
        return DeterministicChunkFactory(factoryAddress).deploymentCount();
    }

    /**
     * @notice Get user tier for tiered fee structure
     * @param user The user address
     * @return tier The user tier
     */
    function getUserTier(address user) external view override returns (uint8 tier) {
        return DeterministicChunkFactory(factoryAddress).userTiers(user);
    }

    /**
     * @notice Get the owner of the factory
     * @return The owner address
     */
    function owner() external view override returns (address) {
        return IChunkFactory(factoryAddress).owner();
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

    // ─────────────────────────────────────────────────────────────────────────────
    // ADDITIONAL FORWARDERS (admin/state not in IChunkFactory interface file)
    // ─────────────────────────────────────────────────────────────────────────────

    function withdrawRefund() external {
        DeterministicChunkFactory(factoryAddress).withdrawRefund();
    }

    function setUserTier(address user, uint8 tier) external {
        DeterministicChunkFactory(factoryAddress).setUserTier(user, tier);
    }

    function setIdempotentMode(bool enabled) external {
        DeterministicChunkFactory(factoryAddress).setIdempotentMode(enabled);
    }

    function setFeeRecipient(address newRecipient) external {
        DeterministicChunkFactory(factoryAddress).setFeeRecipient(newRecipient);
    }

    function setBaseFeeWei(uint256 newBase) external {
        DeterministicChunkFactory(factoryAddress).setBaseFeeWei(newBase);
    }

    function setFeesEnabled(bool enabled) external {
        DeterministicChunkFactory(factoryAddress).setFeesEnabled(enabled);
    }

    function setMaxSingleTransfer(uint256 newMax) external {
        DeterministicChunkFactory(factoryAddress).setMaxSingleTransfer(newMax);
    }

    function transferDefaultAdmin(address newAdmin) external {
        DeterministicChunkFactory(factoryAddress).transferDefaultAdmin(newAdmin);
    }

    function addAuthorizedRecipient(address recipient) external {
        DeterministicChunkFactory(factoryAddress).addAuthorizedRecipient(recipient);
    }

    function removeAuthorizedRecipient(address recipient) external {
        DeterministicChunkFactory(factoryAddress).removeAuthorizedRecipient(recipient);
    }

    // State getters mirrored from factory
    function deploymentCount() external view returns (uint256) {
        return DeterministicChunkFactory(factoryAddress).deploymentCount();
    }

    function userTiers(address user) external view returns (uint8) {
        return DeterministicChunkFactory(factoryAddress).userTiers(user);
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
    // ENHANCED FUNCTIONS (PayRox-specific)
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

    /**
     * @notice Verify system integrity via the factory
     * @return True if system integrity is verified
     */
    function verifySystemIntegrity() external view override returns (bool) {
        return DeterministicChunkFactory(factoryAddress).verifySystemIntegrity();
    }

    /**
     * @notice Get the expected manifest hash
     * @return The expected manifest hash
     */
    function getExpectedManifestHash() external view returns (bytes32) {
        return DeterministicChunkFactory(factoryAddress).expectedManifestHash();
    }

    /**
     * @notice Get the expected factory bytecode hash
     * @return The expected factory bytecode hash
     */
    function getExpectedFactoryBytecodeHash() external view returns (bytes32) {
        return DeterministicChunkFactory(factoryAddress).expectedFactoryBytecodeHash();
    }

    /**
     * @notice Get the manifest dispatcher address
     * @return The manifest dispatcher address
     */
    function getManifestDispatcher() external view returns (address) {
        return DeterministicChunkFactory(factoryAddress).expectedManifestDispatcher();
    }

    /**
     * @notice Get the underlying factory address
     * @return The factory address
     */
    function getFactoryAddress() external view returns (address) {
        return factoryAddress;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // ERC165 SUPPORTS-INTERFACE
    // ─────────────────────────────────────────────────────────────────────────────

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == type(IChunkFactory).interfaceId || interfaceId == 0x01ffc9a7; // ERC165
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // DIAMOND LOUPE COMPATIBILITY (selectors list)
    // ─────────────────────────────────────────────────────────────────────────────

    function getFacetFunctionSelectors() external pure returns (bytes4[] memory selectors) {
        // Update this list to match EXACTLY what the facet exposes
        selectors = new bytes4[](37);
        uint i;
        // IChunkFactory interface functions
        selectors[i++] = IChunkFactory.stage.selector;
        selectors[i++] = IChunkFactory.stageMany.selector;
        selectors[i++] = IChunkFactory.stageBatch.selector;
        selectors[i++] = IChunkFactory.deployDeterministic.selector;
        selectors[i++] = IChunkFactory.deployDeterministicBatch.selector;
        selectors[i++] = IChunkFactory.predict.selector;
        selectors[i++] = IChunkFactory.predictAddress.selector;
        selectors[i++] = IChunkFactory.predictAddressBatch.selector;
        selectors[i++] = IChunkFactory.read.selector;
        selectors[i++] = IChunkFactory.exists.selector;
        selectors[i++] = IChunkFactory.isDeployed.selector; // keep consistent naming used in interface
        selectors[i++] = IChunkFactory.validateBytecodeSize.selector;
        selectors[i++] = IChunkFactory.verifySystemIntegrity.selector;
        selectors[i++] = IChunkFactory.getDeploymentFee.selector;
        selectors[i++] = IChunkFactory.getDeploymentCount.selector;
        selectors[i++] = IChunkFactory.getUserTier.selector;
        selectors[i++] = IChunkFactory.owner.selector;
        selectors[i++] = IChunkFactory.setTierFee.selector;
        selectors[i++] = IChunkFactory.withdrawFees.selector;
        selectors[i++] = IChunkFactory.pause.selector;
        selectors[i++] = IChunkFactory.unpause.selector;

        // Additional admin/state forwarders exposed by this facet (not in interface)
        selectors[i++] = this.withdrawRefund.selector;
        selectors[i++] = this.setUserTier.selector;
        selectors[i++] = this.setIdempotentMode.selector;
        selectors[i++] = this.setFeeRecipient.selector;
        selectors[i++] = this.setBaseFeeWei.selector;
        selectors[i++] = this.setFeesEnabled.selector;
        selectors[i++] = this.setMaxSingleTransfer.selector;
        selectors[i++] = this.transferDefaultAdmin.selector;
        selectors[i++] = this.addAuthorizedRecipient.selector;
        selectors[i++] = this.removeAuthorizedRecipient.selector;
        selectors[i++] = this.deploymentCount.selector;
        selectors[i++] = this.userTiers.selector;

        // PayRox helpers added by this facet
        selectors[i++] = this.getExpectedManifestHash.selector;
        selectors[i++] = this.getExpectedFactoryBytecodeHash.selector;
        selectors[i++] = this.getManifestDispatcher.selector;
        selectors[i++] = this.getFactoryAddress.selector;

        require(i == selectors.length, "selector count mismatch");
        return selectors;
    }
}
