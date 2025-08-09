// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface IChunkFactory {
    // Core functions
    function stage(bytes calldata data) external payable returns (address chunk, bytes32 hash);
    function stageMany(bytes[] calldata dataArray) external payable returns (address[] memory chunks);
    function stageBatch(bytes[] calldata blobs) external payable returns (address[] memory chunks, bytes32[] memory hashes);
    
    function deployDeterministic(bytes32 salt, bytes calldata bytecode, bytes calldata constructorArgs) external payable returns (address deployed);
    function deployDeterministicBatch(bytes32[] calldata salts, bytes[] calldata bytecodes, bytes[] calldata constructorArgs) external payable returns (address[] memory deployed);
    
    // Prediction functions
    function predict(bytes calldata data) external view returns (address predicted, bytes32 hash);
    function predictAddress(bytes32 salt, bytes32 codeHash) external view returns (address predicted);
    function predictAddressBatch(bytes32[] calldata salts, bytes32[] calldata codeHashes) external view returns (address[] memory predicted);
    
    // State queries
    function read(address chunk) external view returns (bytes memory);
    function exists(bytes32 hash) external view returns (bool);
    function validateBytecodeSize(bytes calldata bytecode) external pure returns (bool valid);
    function verifySystemIntegrity() external view returns (bool);
    
    // Getters matching DeterministicChunkFactory
    function getDeploymentFee() external view returns (uint256 fee);
    function getDeploymentCount() external view returns (uint256 count);
    function isDeployed(address target) external view returns (bool);
    function getUserTier(address user) external view returns (uint8 tier);
    function owner() external view returns (address);
    
    // Admin functions
    function setTierFee(uint8 tier, uint256 fee) external;
    function withdrawFees() external;
    function pause() external;
    function unpause() external;
    
    // Events
    event ChunkStaged(address indexed chunk, bytes32 indexed hash, bytes32 salt, uint256 size);
    event ContractDeployed(address indexed deployed, bytes32 indexed salt, address indexed deployer, uint256 fee);
    event TierFeeSet(uint8 indexed tier, uint256 fee);
}
