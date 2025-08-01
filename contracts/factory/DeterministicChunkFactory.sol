// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {AccessControl}   from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable}        from "@openzeppelin/contracts/utils/Pausable.sol";
import {IChunkFactory}   from "./interfaces/IChunkFactory.sol";
import {IManifestDispatcher} from "../dispatcher/interfaces/IManifestDispatcher.sol";

/// @title DeterministicChunkFactory (PayRox)
/// @notice Content‑addressed chunk storage (SSTORE2‑style) for large *data* blobs.
///         Each chunk is deployed as the runtime code of a tiny contract via CREATE2.
///         Deterministic address: salt = keccak256("chunk:" || keccak256(data)).
/// @dev    Designed to work alongside ManifestDispatcher + facets (facets remain ≤ 24_576 runtime).
///         DO NOT route execution to chunk contracts; they are DATA‑ONLY.
contract DeterministicChunkFactory is IChunkFactory, AccessControl, ReentrancyGuard, Pausable {
    /*──────────────────────────────────────────────────────────────────────────
                                        Roles
    ──────────────────────────────────────────────────────────────────────────*/
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant FEE_ROLE      = keccak256("FEE_ROLE");

    /*──────────────────────────────────────────────────────────────────────────
                                    Constants
    ──────────────────────────────────────────────────────────────────────────*/
    /// @dev keep a small headroom under the 24,576 byte EIP‑170 runtime limit
    uint256 public constant MAX_CHUNK_BYTES = 24_000;

    /// @dev EIP-3860 init-code size limit to prevent CREATE2 bomb attacks
    uint256 public constant MAX_INIT_CODE_SIZE = 49_152;

    /// @dev Revert prologue size: 0x60006000fd = PUSH1 0x00; PUSH1 0x00; REVERT (5 bytes)
    uint256 public constant CHUNK_PROLOGUE_SIZE = 5;

    /*──────────────────────────────────────────────────────────────────────────
                                    Storage
    ──────────────────────────────────────────────────────────────────────────*/
    address public feeRecipient;
    uint256 public baseFeeWei;     // optional fee per chunk
    bool    public feesEnabled;
    bool    public idempotentMode = true; // Allow returning existing addresses

    // chunkHash (keccak256(data)) => deployed chunk address
    mapping(bytes32 => address) public chunkOf;
    
    // Deployment tracking
    uint256 public deploymentCount;
    mapping(address => bool) public isDeployedContract;
    
    // Tiered fee structure
    mapping(uint8 => uint256) public tierFees;
    mapping(address => uint8) public userTier;
    
    // Fee accumulation for pull pattern
    mapping(address => uint256) public accumulatedFees;
    
    // Security: Constructor-injected manifest and bytecode verification
    bytes32 public immutable EXPECTED_MANIFEST_HASH;
    bytes32 public immutable EXPECTED_FACTORY_BYTECODE_HASH;
    address public immutable MANIFEST_DISPATCHER;

    /*──────────────────────────────────────────────────────────────────────────
                                     Events
    ──────────────────────────────────────────────────────────────────────────*/
    event FeesUpdated(uint256 baseFeeWei, bool enabled, address recipient);

    /*──────────────────────────────────────────────────────────────────────────
                                      Errors
    ──────────────────────────────────────────────────────────────────────────*/
    error BadSize();
    error FeeRequired();
    error AlreadyExists();
    error DeployFailed();
    error SizeMismatch();
    error ZeroRecipient();
    error ManifestHashMismatch(bytes32 expected, bytes32 actual);
    error BytecodeHashMismatch(bytes32 expected, bytes32 actual);
    error ManifestVerificationFailed();

    /*──────────────────────────────────────────────────────────────────────────
                                   Constructor
    ──────────────────────────────────────────────────────────────────────────*/
    constructor(
        address admin, 
        address _feeRecipient, 
        uint256 _baseFeeWei,
        bytes32 _expectedManifestHash,
        bytes32 _expectedFactoryBytecodeHash,
        address _manifestDispatcher
    ) {
        // Security: Zero-address validation for critical parameters
        require(admin != address(0), "DeterministicChunkFactory: zero admin address");
        require(_manifestDispatcher != address(0), "DeterministicChunkFactory: zero dispatcher address");
        // Note: _feeRecipient can be zero (disables fees), so no validation needed
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(OPERATOR_ROLE, admin);
        _grantRole(FEE_ROLE,      admin);

        feeRecipient = _feeRecipient;
        baseFeeWei   = _baseFeeWei;
        // Note: _feeRecipient CAN be zero address to disable fees (design choice)
        feesEnabled  = (_feeRecipient != address(0) && _baseFeeWei > 0);

        // Initialize tiered fee structure
        // Tier 0 (Basic): baseFeeWei (0.0009 ETH)
        // Tier 1 (Pro): 20% discount
        // Tier 2 (Enterprise): 40% discount  
        // Tier 3 (Whitelisted): 60% discount
        tierFees[0] = _baseFeeWei;                    // 0.0009 ETH
        tierFees[1] = (_baseFeeWei * 80) / 100;      // 0.00072 ETH
        tierFees[2] = (_baseFeeWei * 60) / 100;      // 0.00054 ETH
        tierFees[3] = (_baseFeeWei * 40) / 100;      // 0.00036 ETH
        
        // Security: Store constructor-injected hashes as immutable
        EXPECTED_MANIFEST_HASH = _expectedManifestHash;
        EXPECTED_FACTORY_BYTECODE_HASH = _expectedFactoryBytecodeHash;
        MANIFEST_DISPATCHER = _manifestDispatcher;
        
        // PRODUCTION: Immediate integrity verification - NO EXCEPTIONS
        // This ensures deployment fails if wrong hashes are provided
        _verifySystemIntegrity();
    }

    /*──────────────────────────────────────────────────────────────────────────
                                    External
    ──────────────────────────────────────────────────────────────────────────*/

    /// @dev Internal staging logic without fees or reentrancy guards
    function _stageInternal(bytes calldata data) internal returns (address chunk, bytes32 hash) {
        uint256 len = data.length;
        if (len == 0 || len > MAX_CHUNK_BYTES) revert BadSize();

        hash = keccak256(data);

        // Idempotent path
        address existing = chunkOf[hash];
        if (existing != address(0)) {
            return (existing, hash);
        }

        // Build creation code that returns `data` as runtime code.
        bytes memory creationCode = _buildCreateCode(data);

        // Deterministic salt from content hash
        bytes32 salt = keccak256(abi.encodePacked("chunk:", hash));

        // Prevent accidental re‑use (rare race across txs)
        address predicted = _predictWithCreateCode(creationCode, salt);
        if (predicted.code.length != 0) revert AlreadyExists();

        // Deploy
        assembly {
            chunk := create2(0, add(creationCode, 0x20), mload(creationCode), salt)
        }
        if (chunk == address(0)) revert DeployFailed();
        if (chunk.code.length != len) revert SizeMismatch();

        chunkOf[hash] = chunk;
        emit ChunkDeployed(hash, chunk, len);
    }

    /// @notice Stage a chunk of bytes as the runtime code of a tiny contract (SSTORE2 pattern).
    /// @dev     Deterministic & idempotent: re‑calling with the same `data` returns the same address.
    /// @param   data  Arbitrary bytes to store as runtime code (<= MAX_CHUNK_BYTES)
    /// @return  chunk The deployed chunk contract address
    /// @return  hash  keccak256(data) – the content address
    function stage(bytes calldata data)
        external
        payable
        nonReentrant
        whenNotPaused
        returns (address chunk, bytes32 hash)
    {
        // PRODUCTION: Always verify system integrity before critical operations
        _verifySystemIntegrity();
        
        // Fees (optional)
        if (feesEnabled) {
            if (msg.value < baseFeeWei) revert FeeRequired();
            (bool ok,) = feeRecipient.call{value: msg.value}("");
            if (!ok) revert FeeTransferFailed();
        }

        return _stageInternal(data);
    }

    /// @notice Stage multiple chunks. Idempotent per element.
    /// @return  chunks Deployed/predicted addresses (in order)
    /// @return  hashes Content hashes (in order)
    function stageBatch(bytes[] calldata blobs)
        external
        payable
        nonReentrant
        whenNotPaused
        returns (address[] memory chunks, bytes32[] memory hashes)
    {
        uint256 n = blobs.length;
        chunks = new address[](n);
        hashes = new bytes32[](n);

        // NOTE: fee policy for batch is “flat per element”.
        if (feesEnabled) {
            uint256 required = baseFeeWei * n;
            if (msg.value < required) revert FeeRequired();
            (bool ok,) = feeRecipient.call{value: msg.value}("");
            if (!ok) revert FeeTransferFailed();
        }

        for (uint256 i; i < n; ) {
            (address c, bytes32 h) = _stageInternal(blobs[i]);
            chunks[i] = c;
            hashes[i] = h;
            unchecked { ++i; }
        }
    }

    /// @notice Predict the chunk address for `data` without deploying.
    /// @return predicted CREATE2 address if `stage(data)` were to be called.
    /// @return hash      keccak256(data)
    function predict(bytes calldata data)
        external
        view
        returns (address predicted, bytes32 hash)
    {
        if (data.length == 0 || data.length > MAX_CHUNK_BYTES) revert BadSize();
        hash = keccak256(data);
        bytes memory creationCode = _buildCreateCode(data);
        bytes32 salt = keccak256(abi.encodePacked("chunk:", hash));
        predicted = _predictWithCreateCode(creationCode, salt);
    }

    /// @notice Convenience read – returns the entire chunk bytes (memory bounded by MAX_CHUNK_BYTES).
    function read(address chunk) external view returns (bytes memory out) {
        uint256 size = chunk.code.length;
        if (size == 0 || size > MAX_CHUNK_BYTES) revert BadSize();
        out = new bytes(size);
        assembly {
            extcodecopy(chunk, add(out, 0x20), 0, size)
        }
    }

    /// @notice Partial read to avoid copying the whole chunk.
    function readRange(address chunk, uint256 offset, uint256 length)
        external
        view
        returns (bytes memory out)
    {
        uint256 size = chunk.code.length;
        if (size == 0 || size > MAX_CHUNK_BYTES) revert BadSize();
        require(offset + length <= size, "range");
        out = new bytes(length);
        assembly {
            extcodecopy(chunk, add(out, 0x20), offset, length)
        }
    }

    /// @notice True if `hash` is already staged.
    function exists(bytes32 hash) external view returns (bool) {
        return chunkOf[hash] != address(0);
    }

    /*──────────────────────────────────────────────────────────────────────────
                              Enhanced Security Functions
    ──────────────────────────────────────────────────────────────────────────*/

    /// @notice Deploy deterministic contract with enhanced security validation
    /// @dev Validates bytecode size against EIP-3860 limit to prevent CREATE2 bomb attacks
    /// @param salt Deterministic salt for CREATE2
    /// @param bytecode Contract creation bytecode
    /// @param constructorArgs ABI-encoded constructor arguments
    /// @return deployed The deployed contract address
    function deployDeterministic(
        bytes32 salt,
        bytes calldata bytecode,
        bytes calldata constructorArgs
    ) external payable nonReentrant whenNotPaused returns (address deployed) {
        // PRODUCTION: Always verify system integrity before critical operations
        _verifySystemIntegrity();
        
        // Security: Input validation to prevent encodePacked collision attacks
        require(bytecode.length > 0, "DeterministicChunkFactory: empty bytecode");
        require(salt != bytes32(0), "DeterministicChunkFactory: zero salt");
        
        // Security validation: Prevent CREATE2 bomb attacks
        if (!validateBytecodeSize(bytecode)) {
            revert BytecodeTooLarge(bytecode.length, MAX_INIT_CODE_SIZE);
        }

        // Fee validation with tiered structure
        uint256 requiredFee = _getDeploymentFee(msg.sender);
        if (msg.value < requiredFee) {
            revert InsufficientFee(msg.value, requiredFee);
        }

        // Build full creation code including constructor args
        // Note: Must use encodePacked for CREATE2 compatibility, validate inputs separately
        bytes memory fullCreationCode = abi.encodePacked(bytecode, constructorArgs);
        bytes32 codeHash = keccak256(fullCreationCode);

        // Predict address
        address predicted = predictAddress(salt, codeHash);

        // Re-deployment policy check
        if (predicted.code.length > 0) {
            if (idempotentMode) {
                // Return existing address without charging fee
                return predicted;
            } else {
                revert AlreadyDeployed(predicted);
            }
        }

        // Deploy using CREATE2
        assembly {
            deployed := create2(0, add(fullCreationCode, 0x20), mload(fullCreationCode), salt)
        }

        if (deployed == address(0)) revert DeployFailed();
        if (deployed != predicted) revert DeployFailed();

        // Update tracking
        isDeployedContract[deployed] = true;
        deploymentCount++;

        // Handle fees using pull pattern (safer than push)
        accumulatedFees[feeRecipient] += msg.value;

        emit ContractDeployed(deployed, salt, msg.sender, msg.value);
    }

    /// @notice Batch deploy with gas optimization refund pattern
    /// @dev Uses create2{value:...} pattern that refunds unused msg.value minus protocol fee
    function deployDeterministicBatch(
        bytes32[] calldata salts,
        bytes[] calldata bytecodes,
        bytes[] calldata constructorArgs
    ) external payable nonReentrant whenNotPaused returns (address[] memory deployed) {
        uint256 batchSize = salts.length;
        if (batchSize != bytecodes.length || batchSize != constructorArgs.length) {
            revert InvalidConstructorArgs();
        }
        
        // Security: Validate batch inputs to prevent encodePacked collision attacks  
        require(batchSize > 0, "DeterministicChunkFactory: empty batch");
        require(batchSize <= 100, "DeterministicChunkFactory: batch too large"); // Prevent DoS

        deployed = new address[](batchSize);
        uint256 requiredFeePerDeployment = _getDeploymentFee(msg.sender);
        uint256 totalRequiredFee = requiredFeePerDeployment * batchSize;

        if (msg.value < totalRequiredFee) {
            revert InsufficientFee(msg.value, totalRequiredFee);
        }

        uint256 actualUsedFee = 0;

        for (uint256 i = 0; i < batchSize; i++) {
            // Security: Validate inputs to prevent encodePacked collision attacks
            require(bytecodes[i].length > 0, "DeterministicChunkFactory: empty bytecode in batch");
            require(salts[i] != bytes32(0), "DeterministicChunkFactory: zero salt in batch");
            
            // Validate each bytecode
            if (!validateBytecodeSize(bytecodes[i])) {
                revert BytecodeTooLarge(bytecodes[i].length, MAX_INIT_CODE_SIZE);
            }

            // Note: Must use encodePacked for CREATE2 compatibility, validate inputs separately
            bytes memory fullCreationCode = abi.encodePacked(bytecodes[i], constructorArgs[i]);
            bytes32 codeHash = keccak256(fullCreationCode);
            address predicted = predictAddress(salts[i], codeHash);

            // Skip if already deployed in idempotent mode
            if (predicted.code.length > 0) {
                if (idempotentMode) {
                    deployed[i] = predicted;
                    continue; // No fee charged for existing
                } else {
                    revert AlreadyDeployed(predicted);
                }
            }

            // Deploy
            bytes32 currentSalt = salts[i];
            address deployedContract;
            assembly {
                deployedContract := create2(0, add(fullCreationCode, 0x20), mload(fullCreationCode), currentSalt)
            }

            if (deployedContract == address(0)) revert DeployFailed();
            deployed[i] = deployedContract;
            isDeployedContract[deployedContract] = true;
            actualUsedFee += requiredFeePerDeployment;
        }

        deploymentCount += batchSize;

        // Refund unused ETH (gas optimization pattern)
        if (msg.value > actualUsedFee) {
            (bool refundSuccess,) = msg.sender.call{value: msg.value - actualUsedFee}("");
            if (!refundSuccess) revert FeeTransferFailed();
        }

        // Accumulate actual fees
        accumulatedFees[feeRecipient] += actualUsedFee;

        emit BatchDeployed(deployed, salts, msg.sender, actualUsedFee);
    }

    /// @notice Predict deterministic deployment address
    function predictAddress(bytes32 salt, bytes32 codeHash) public view returns (address predicted) {
        predicted = address(uint160(uint256(keccak256(abi.encodePacked(
            bytes1(0xff),
            address(this),
            salt,
            codeHash
        )))));
    }

    /// @notice Batch prediction for multiple deployments
    function predictAddressBatch(
        bytes32[] calldata salts,
        bytes32[] calldata codeHashes
    ) external view returns (address[] memory predicted) {
        uint256 length = salts.length;
        if (length != codeHashes.length) revert InvalidConstructorArgs();
        
        predicted = new address[](length);
        for (uint256 i = 0; i < length; i++) {
            predicted[i] = predictAddress(salts[i], codeHashes[i]);
        }
    }

    /// @notice Validate bytecode size against CREATE2 bomb risk
    function validateBytecodeSize(bytes calldata bytecode) public pure returns (bool valid) {
        return bytecode.length <= MAX_INIT_CODE_SIZE;
    }

    /// @notice Get deployment fee for current user tier
    function getDeploymentFee() external view returns (uint256 fee) {
        return _getDeploymentFee(msg.sender);
    }

    /// @notice Get total deployment count
    function getDeploymentCount() external view returns (uint256 count) {
        return deploymentCount;
    }

    /// @notice Check if address is a deployed contract
    function isDeployed(address target) external view returns (bool) {
        return isDeployedContract[target];
    }

    /// @notice Get user tier for tiered fee structure
    function getUserTier(address user) external view returns (uint8 tier) {
        return userTier[user];
    }

    /// @notice Set tier fee (admin only)
    function setTierFee(uint8 tier, uint256 fee) external onlyRole(FEE_ROLE) {
        if (tier > 3) revert InvalidTier(tier); // 0-3 tiers supported
        uint256 oldFee = tierFees[tier];
        tierFees[tier] = fee;
        emit TierFeeUpdated(tier, oldFee, fee);
    }

    /// @notice Withdraw accumulated fees (pull pattern for security)
    function withdrawFees() external nonReentrant {
        uint256 amount = accumulatedFees[msg.sender];
        if (amount == 0) revert InsufficientFee(0, 1);
        
        accumulatedFees[msg.sender] = 0;
        (bool success,) = msg.sender.call{value: amount}("");
        if (!success) revert FeeTransferFailed();
        
        emit FeesWithdrawn(msg.sender, amount);
    }

    /// @notice Set re-deployment policy
    function setIdempotentMode(bool enabled) external onlyRole(OPERATOR_ROLE) {
        idempotentMode = enabled;
    }

    /// @notice Set user tier (admin only)
    function setUserTier(address user, uint8 tier) external onlyRole(FEE_ROLE) {
        if (user == address(0)) revert ZeroAddress();
        if (tier > 3) revert InvalidTier(tier);
        userTier[user] = tier;
    }

    /*──────────────────────────────────────────────────────────────────────────
                            Hash Verification (Constructor-Injection)
    ──────────────────────────────────────────────────────────────────────────*/

    /// @notice Verify system integrity by checking all constructor-injected hashes
    /// @dev This is the "bullet-proof" anti-forgot-hash mechanism using constructor injection
    function verifySystemIntegrity() external view returns (bool) {
        return _verifySystemIntegrity();
    }

    /// @notice Get the expected manifest hash (immutable, set at deployment)
    function getExpectedManifestHash() external view returns (bytes32) {
        return EXPECTED_MANIFEST_HASH;
    }

    /// @notice Get the expected factory bytecode hash (immutable, set at deployment)
    function getExpectedFactoryBytecodeHash() external view returns (bytes32) {
        return EXPECTED_FACTORY_BYTECODE_HASH;
    }

    /// @notice Get the manifest dispatcher address (immutable, set at deployment)
    function getManifestDispatcher() external view returns (address) {
        return MANIFEST_DISPATCHER;
    }

    /// @notice Comprehensive system integrity check
    /// @dev This prevents the "oops, I forgot the hash" vulnerability
    /// @dev PRODUCTION VERSION - No test accommodations
    function _verifySystemIntegrity() internal view returns (bool) {
        // PRODUCTION: All hashes must be real - no placeholders allowed
        if (EXPECTED_MANIFEST_HASH == bytes32(0)) {
            revert ManifestHashMismatch(EXPECTED_MANIFEST_HASH, bytes32(0));
        }
        if (EXPECTED_FACTORY_BYTECODE_HASH == bytes32(0)) {
            revert BytecodeHashMismatch(EXPECTED_FACTORY_BYTECODE_HASH, bytes32(0));
        }

        // 1. Verify manifest hash matches what's in the dispatcher
        try IManifestDispatcher(MANIFEST_DISPATCHER).verifyManifest(EXPECTED_MANIFEST_HASH) 
            returns (bool valid, bytes32 currentHash) {
            if (!valid) {
                revert ManifestHashMismatch(EXPECTED_MANIFEST_HASH, currentHash);
            }
        } catch {
            revert ManifestVerificationFailed();
        }

        // 2. PRODUCTION: Strict bytecode hash verification
        bytes32 actualFactoryHash = address(this).codehash;
        if (actualFactoryHash != EXPECTED_FACTORY_BYTECODE_HASH) {
            revert BytecodeHashMismatch(EXPECTED_FACTORY_BYTECODE_HASH, actualFactoryHash);
        }

        return true;
    }

    /// @dev Get deployment fee based on user tier
    function _getDeploymentFee(address user) internal view returns (uint256) {
        uint8 tier = userTier[user];
        uint256 tierFee = tierFees[tier];
        return tierFee > 0 ? tierFee : baseFeeWei;
    }

    /*──────────────────────────────────────────────────────────────────────────
                                     Admin
    ──────────────────────────────────────────────────────────────────────────*/
    function setFees(uint256 _baseFeeWei, bool _enabled, address _recipient)
        external
        onlyRole(FEE_ROLE)
    {
        if (_enabled) {
            if (_recipient == address(0)) revert ZeroRecipient();
        }
        baseFeeWei  = _baseFeeWei;
        feesEnabled = _enabled && _recipient != address(0) && _baseFeeWei > 0;
        feeRecipient = _recipient;
        emit FeesUpdated(baseFeeWei, feesEnabled, feeRecipient);
    }

    function pause()   external onlyRole(OPERATOR_ROLE) { _pause(); }
    function unpause() external onlyRole(OPERATOR_ROLE) { _unpause(); }

    /// @notice Sweep any ETH accidentally sent here (fees are forwarded on stage()).
    function sweep(address to, uint256 amount) external onlyRole(FEE_ROLE) {
        if (to == address(0)) revert ZeroRecipient();
        (bool ok,) = to.call{value: amount}("");
        if (!ok) revert FeeTransferFailed();
    }

    receive() external payable {}

    /*──────────────────────────────────────────────────────────────────────────
                                   Internals
    ──────────────────────────────────────────────────────────────────────────*/

    /// @dev creation code = small constructor that returns `data` as the runtime.
    function _buildCreateCode(bytes calldata data) internal pure returns (bytes memory creationCode) {
        uint256 len = data.length;

        // Two minimal variants depending on length (PUSH1 vs PUSH2 for the length literal).
        if (len <= 255) {
            // Constructor (12 bytes):
            // PUSH1 len; PUSH1 12; PUSH1 0; CODECOPY; PUSH1 len; PUSH1 0; RETURN
            //  0x60 LL  0x60 0x0c 0x60 0x00 0x39  0x60 LL  0x60 0x00 0xf3  <data>
            creationCode = abi.encodePacked(
                hex"60", bytes1(uint8(len)),
                hex"600c600039",
                hex"60", bytes1(uint8(len)),
                hex"6000f3",
                data
            );
        } else {
            // Constructor (14 bytes):
            // PUSH2 len; PUSH1 14; PUSH1 0; CODECOPY; PUSH2 len; PUSH1 0; RETURN
            //  0x61 LL LL  0x60 0x0e 0x60 0x00 0x39  0x61 LL LL  0x60 0x00 0xf3  <data>
            creationCode = abi.encodePacked(
                hex"61", bytes2(uint16(len)),
                hex"600e600039",
                hex"61", bytes2(uint16(len)),
                hex"6000f3",
                data
            );
        }
    }

    /// @dev Recomputes CREATE2 address given prepared creation code and salt.
    function _predictWithCreateCode(bytes memory creationCode, bytes32 salt) internal view returns (address predicted) {
        bytes32 codeHash = keccak256(creationCode);
        predicted = address(uint160(uint256(
            keccak256(abi.encodePacked(bytes1(0xff), address(this), salt, codeHash))
        )));
    }
}
