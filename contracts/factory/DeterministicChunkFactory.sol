// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {AccessControl}   from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable}        from "@openzeppelin/contracts/utils/Pausable.sol";
import {IChunkFactory}   from "./interfaces/IChunkFactory.sol";
import {ChunkFactoryLib} from "../utils/ChunkFactoryLib.sol";

/// @title DeterministicChunkFactory
/// @notice Size-optimized version using library delegation
/// @dev Maintains full IChunkFactory interface while staying under EIP-170 limit
contract DeterministicChunkFactory is IChunkFactory, AccessControl, ReentrancyGuard, Pausable {

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
    // ROLES & CONSTANTS
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant FEE_ROLE      = keccak256("FEE_ROLE");
    uint256 public constant MAX_CHUNK_BYTES = 24_000;

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
    // STORAGE
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

    address public feeRecipient;
    uint256 public baseFeeWei;
    bool    public feesEnabled;
    bool    public idempotentMode = true;

    mapping(bytes32 => address) public chunkOf;
    uint256 public deploymentCount;
    mapping(address => bool) public isDeployedContract;
    mapping(uint8 => uint256) public tierFees;
    mapping(address => uint8) public userTiers;

    // System integrity variables
    address public immutable expectedManifestDispatcher;
    bytes32 public immutable expectedManifestHash;
    bytes32 public immutable expectedFactoryBytecodeHash;

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

    constructor(
        address _feeRecipient,
        address _manifestDispatcher,
        bytes32 _manifestHash,
        bytes32 _factoryBytecodeHash,
        uint256 _baseFeeWei,
        bool _feesEnabled
    ) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(OPERATOR_ROLE, msg.sender);
        _grantRole(FEE_ROLE, msg.sender);

        feeRecipient = _feeRecipient;
        expectedManifestDispatcher = _manifestDispatcher;
        expectedManifestHash = _manifestHash;
        expectedFactoryBytecodeHash = _factoryBytecodeHash;
        baseFeeWei = _baseFeeWei;
        feesEnabled = _feesEnabled;
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
    // CORE FUNCTIONS (DELEGATED TO LIBRARY)
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

    function stage(bytes calldata data) external payable nonReentrant whenNotPaused returns (address chunk, bytes32 hash) {
        bytes memory dataMemory = data;
        require(ChunkFactoryLib.validateData(dataMemory), "Invalid data");

        bytes32 salt = ChunkFactoryLib.computeSalt(data);
        hash = keccak256(data);

        if (idempotentMode && chunkOf[hash] != address(0)) {
            return (chunkOf[hash], hash);
        }

        _collectFee();

        bytes memory initCode = ChunkFactoryLib.createInitCode(data);
        bytes32 initCodeHash = keccak256(initCode);

        address predicted = ChunkFactoryLib.predictAddress(address(this), salt, initCodeHash);

        assembly {
            chunk := create2(0, add(initCode, 0x20), mload(initCode), salt)
            if iszero(chunk) { revert(0, 0) }
        }

        require(chunk == predicted, "Address mismatch");

        chunkOf[hash] = chunk;
        isDeployedContract[chunk] = true;
        deploymentCount++;

        emit ChunkStaged(chunk, hash, salt, data.length);
    }

    function stageMany(bytes[] calldata dataArray) external payable nonReentrant whenNotPaused returns (address[] memory chunks) {
        chunks = new address[](dataArray.length);

        for (uint256 i = 0; i < dataArray.length; i++) {
            // Recursive call to maintain fee collection per chunk
            (chunks[i], ) = this.stage{value: msg.value / dataArray.length}(dataArray[i]);
        }
    }

    function stageBatch(bytes[] calldata blobs) external payable nonReentrant whenNotPaused returns (address[] memory chunks, bytes32[] memory hashes) {
        chunks = new address[](blobs.length);
        hashes = new bytes32[](blobs.length);

        for (uint256 i = 0; i < blobs.length; i++) {
            (chunks[i], hashes[i]) = this.stage{value: msg.value / blobs.length}(blobs[i]);
        }
    }

    function deployDeterministic(
        bytes32 salt,
        bytes calldata bytecode,
        bytes calldata constructorArgs
    ) external payable nonReentrant whenNotPaused returns (address deployed) {
        _verifySystemIntegrity();
        _collectFee();

        // Combine bytecode and constructor args into init code
        bytes memory initCode = abi.encodePacked(bytecode, constructorArgs);
        require(ChunkFactoryLib.validateBytecodeSize(initCode), "Invalid bytecode size");

        bytes32 codeHash = keccak256(initCode);
        deployed = ChunkFactoryLib.predictAddress(address(this), salt, codeHash);

        // Check if already deployed
        if (deployed.code.length > 0) {
            if (idempotentMode) {
                return deployed;
            } else {
                revert("Already deployed");
            }
        }

        assembly {
            deployed := create2(0, add(initCode, 0x20), mload(initCode), salt)
            if iszero(deployed) { revert(0, 0) }
        }

        require(deployed == ChunkFactoryLib.predictAddress(address(this), salt, codeHash), "Deployment address mismatch");

        isDeployedContract[deployed] = true;
        deploymentCount++;

        emit ContractDeployed(deployed, salt, msg.sender, _getDeploymentFee(msg.sender));
    }

    function deployDeterministicBatch(
        bytes32[] calldata salts,
        bytes[] calldata bytecodes,
        bytes[] calldata constructorArgs
    ) external payable nonReentrant whenNotPaused returns (address[] memory deployed) {
        require(salts.length == bytecodes.length && bytecodes.length == constructorArgs.length, "Array length mismatch");
        _verifySystemIntegrity();

        deployed = new address[](salts.length);
        uint256 totalFee = _getDeploymentFee(msg.sender) * salts.length;
        require(msg.value >= totalFee, "Insufficient fee");

        for (uint256 i = 0; i < salts.length; i++) {
            bytes memory initCode = abi.encodePacked(bytecodes[i], constructorArgs[i]);
            require(ChunkFactoryLib.validateBytecodeSize(initCode), "Invalid bytecode size");

            bytes32 codeHash = keccak256(initCode);
            address predicted = ChunkFactoryLib.predictAddress(address(this), salts[i], codeHash);

            if (predicted.code.length > 0 && idempotentMode) {
                deployed[i] = predicted;
                continue;
            }

            bytes32 currentSalt = salts[i];
            assembly {
                let result := create2(0, add(initCode, 0x20), mload(initCode), currentSalt)
                if iszero(result) { revert(0, 0) }
                mstore(add(add(deployed, 0x20), mul(i, 0x20)), result)
            }

            isDeployedContract[deployed[i]] = true;
            deploymentCount++;
        }

        // Refund excess
        if (msg.value > totalFee) {
            (bool success, ) = msg.sender.call{value: msg.value - totalFee}("");
            require(success, "Refund failed");
        }

        emit BatchDeployed(deployed, salts, msg.sender, totalFee);
    }

    function predict(bytes calldata data) external view returns (address predicted, bytes32 hash) {
        hash = keccak256(data);
        bytes32 salt = ChunkFactoryLib.computeSalt(data);
        bytes memory initCode = ChunkFactoryLib.createInitCode(data);
        bytes32 initCodeHash = keccak256(initCode);
        predicted = ChunkFactoryLib.predictAddress(address(this), salt, initCodeHash);
    }

    function predictAddressBatch(
        bytes32[] calldata salts,
        bytes32[] calldata codeHashes
    ) external view returns (address[] memory predicted) {
        require(salts.length == codeHashes.length, "Array length mismatch");
        predicted = new address[](salts.length);

        for (uint256 i = 0; i < salts.length; i++) {
            predicted[i] = ChunkFactoryLib.predictAddress(address(this), salts[i], codeHashes[i]);
        }
    }

    function read(address chunk) external view returns (bytes memory) {
        return ChunkFactoryLib.readChunk(chunk);
    }

    function exists(bytes32 hash) external view returns (bool) {
        return chunkOf[hash] != address(0);
    }

    function predictAddress(bytes32 salt, bytes32 codeHash) public view returns (address) {
        return ChunkFactoryLib.predictAddress(address(this), salt, codeHash);
    }

    function validateBytecodeSize(bytes calldata bytecode) public pure returns (bool) {
        bytes memory bytecodeMemory = bytecode;
        return ChunkFactoryLib.validateBytecodeSize(bytecodeMemory);
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
    // SIMPLE GETTERS & SETTERS
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

    function getDeploymentFee() external view returns (uint256) {
        return _getDeploymentFee(msg.sender);
    }

    function getDeploymentCount() external view returns (uint256) {
        return deploymentCount;
    }

    function isDeployed(address target) external view returns (bool) {
        return isDeployedContract[target];
    }

    function getUserTier(address user) external view returns (uint8) {
        return userTiers[user];
    }

    function setTierFee(uint8 tier, uint256 fee) external onlyRole(FEE_ROLE) {
        tierFees[tier] = fee;
        emit TierFeeSet(tier, fee);
    }

    function setUserTier(address user, uint8 tier) external onlyRole(FEE_ROLE) {
        userTiers[user] = tier;
        emit UserTierSet(user, tier);
    }

    function setIdempotentMode(bool enabled) external onlyRole(OPERATOR_ROLE) {
        idempotentMode = enabled;
        emit IdempotentModeSet(enabled);
    }

    function withdrawFees() external nonReentrant {
        require(msg.sender == feeRecipient, "Not fee recipient");
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");

        (bool success, ) = feeRecipient.call{value: balance}("");
        require(success, "Transfer failed");

        emit FeesWithdrawn(feeRecipient, balance);
    }

    function verifySystemIntegrity() external view returns (bool) {
        return _verifySystemIntegrity();
    }

    function getExpectedManifestHash() external view returns (bytes32) {
        return expectedManifestHash;
    }

    function getExpectedFactoryBytecodeHash() external view returns (bytes32) {
        return expectedFactoryBytecodeHash;
    }

    function getManifestDispatcher() external view returns (address) {
        return expectedManifestDispatcher;
    }

    function pause() external onlyRole(OPERATOR_ROLE) { _pause(); }
    function unpause() external onlyRole(OPERATOR_ROLE) { _unpause(); }

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
    // INTERNAL HELPERS
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

    function _collectFee() internal {
        if (!feesEnabled) return;

        uint256 fee = _getDeploymentFee(msg.sender);
        require(msg.value >= fee, "Insufficient fee");

        if (msg.value > fee) {
            (bool refundSuccess, ) = msg.sender.call{value: msg.value - fee}("");
            require(refundSuccess, "Refund failed");
        }
    }

    function _getDeploymentFee(address user) internal view returns (uint256) {
        if (!feesEnabled) return 0;

        uint8 tier = userTiers[user];
        uint256 tierFee = tierFees[tier];

        return tierFee > 0 ? tierFee : baseFeeWei;
    }

    function _verifySystemIntegrity() internal view returns (bool) {
        // Check manifest dispatcher
        if (expectedManifestDispatcher != address(0)) {
            bytes32 dispatcherHash = expectedManifestDispatcher.codehash;
            if (dispatcherHash != expectedManifestHash) return false;
        }

        // Check factory bytecode
        if (expectedFactoryBytecodeHash != bytes32(0)) {
            bytes32 factoryHash = address(this).codehash;
            if (factoryHash != expectedFactoryBytecodeHash) return false;
        }

        return true;
    }

    // Events (inheriting from interface, only additional ones here)
    event ChunkStaged(address indexed chunk, bytes32 indexed hash, bytes32 salt, uint256 size);
    event TierFeeSet(uint8 indexed tier, uint256 fee);
    event UserTierSet(address indexed user, uint8 tier);
    event IdempotentModeSet(bool enabled);
}
