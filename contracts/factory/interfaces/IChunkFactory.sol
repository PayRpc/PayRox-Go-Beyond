// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface IChunkFactory {
    /// Deploy a single content-addressed chunk (SSTORE2-style).
    /// Returns the chunk address and keccak256(data).
    function stage(bytes calldata data)
        external
        payable
        returns (address chunk, bytes32 hash);

    /// Deploy multiple chunks with gas optimization refund pattern.
    /// Uses create2{value:...} pattern that refunds unused msg.value minus protocol fee.
    /// Returns arrays aligned by index.
    function stageBatch(bytes[] calldata blobs)
        external
        payable
        returns (address[] memory chunks, bytes32[] memory hashes);

    /// Deploy deterministic contract with enhanced security validation.
    /// Validates bytecode size against EIP-3860 limit (49,152 bytes).
    function deployDeterministic(
        bytes32 salt,
        bytes calldata bytecode,
        bytes calldata constructorArgs
    ) external payable returns (address deployed);

    /// Batch deploy with refund pattern for gas optimization.
    /// Refunds unused msg.value minus flat protocol fee to caller.
    function deployDeterministicBatch(
        bytes32[] calldata salts,
        bytes[] calldata bytecodes,
        bytes[] calldata constructorArgs
    ) external payable returns (address[] memory deployed);

    /// Predict CREATE2 address and content hash for `data` without deploying.
    function predict(bytes calldata data)
        external
        view
        returns (address predicted, bytes32 hash);

    /// Predict deterministic deployment address with constructor args.
    function predictAddress(bytes32 salt, bytes32 codeHash)
        external
        view
        returns (address predicted);

    /// Batch prediction for multiple deployments.
    function predictAddressBatch(
        bytes32[] calldata salts,
        bytes32[] calldata codeHashes
    ) external view returns (address[] memory predicted);

    /// True if a chunk with this content hash already exists.
    function exists(bytes32 hash) external view returns (bool);

    /// True if contract is deployed at the given address.
    function isDeployed(address target) external view returns (bool);

    /// Validate bytecode size against CREATE2 bomb risk (EIP-3860 limit).
    function validateBytecodeSize(bytes calldata bytecode)
        external
        pure
        returns (bool valid);

    /// Get current deployment fee for user tier.
    function getDeploymentFee() external view returns (uint256 fee);

    /// Get total number of deployments.
    function getDeploymentCount() external view returns (uint256 count);

    /// Get user tier for tiered fee structure.
    function getUserTier(address user) external view returns (uint8 tier);

    /// Set fee for specific tier (admin only).
    function setTierFee(uint8 tier, uint256 fee) external;

    /// Withdraw accumulated fees (pull pattern for security).
    function withdrawFees() external;

    /// Emergency pause mechanism.
    function pause() external;

    /// Resume operations.
    function unpause() external;

    // Events
    event ChunkDeployed(bytes32 indexed hash, address indexed chunk, uint256 size);
    event ContractDeployed(
        address indexed deployed,
        bytes32 indexed salt,
        address indexed deployer,
        uint256 fee
    );
    event BatchDeployed(
        address[] deployed,
        bytes32[] salts,
        address indexed deployer,
        uint256 totalFee
    );
    event FeesWithdrawn(address indexed to, uint256 amount);
    event TierFeeUpdated(uint8 indexed tier, uint256 oldFee, uint256 newFee);

    // Custom Errors for gas efficiency
    error BytecodeTooLarge(uint256 size, uint256 maxSize);
    error InsufficientFee(uint256 provided, uint256 required);
    error AlreadyDeployed(address predicted);
    error InvalidConstructorArgs();
    error UnauthorizedUser(address user);
    error InvalidTier(uint8 tier);
    error ZeroAddress();
    error FeeTransferFailed();
}
