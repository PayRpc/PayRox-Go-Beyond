// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {AccessControl}   from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable}        from "@openzeppelin/contracts/utils/Pausable.sol";
import {IChunkFactory}   from "./interfaces/IChunkFactory.sol";

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
    
    /// @dev Revert prologue size: 0x60006000fd = PUSH1 0x00; PUSH1 0x00; REVERT (5 bytes)
    uint256 public constant CHUNK_PROLOGUE_SIZE = 5;

    /*──────────────────────────────────────────────────────────────────────────
                                    Storage
    ──────────────────────────────────────────────────────────────────────────*/
    address public feeRecipient;
    uint256 public baseFeeWei;     // optional fee per chunk
    bool    public feesEnabled;

    // chunkHash (keccak256(data)) => deployed chunk address
    mapping(bytes32 => address) public chunkOf;

    /*──────────────────────────────────────────────────────────────────────────
                                     Events
    ──────────────────────────────────────────────────────────────────────────*/
    event ChunkDeployed(bytes32 indexed hash, address indexed chunk, uint256 size);
    event FeesUpdated(uint256 baseFeeWei, bool enabled, address recipient);

    /*──────────────────────────────────────────────────────────────────────────
                                      Errors
    ──────────────────────────────────────────────────────────────────────────*/
    error BadSize();
    error FeeRequired();
    error FeeTransferFailed();
    error AlreadyExists();
    error DeployFailed();
    error SizeMismatch();
    error ZeroRecipient();

    /*──────────────────────────────────────────────────────────────────────────
                                   Constructor
    ──────────────────────────────────────────────────────────────────────────*/
    constructor(address admin, address _feeRecipient, uint256 _baseFeeWei) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(OPERATOR_ROLE, admin);
        _grantRole(FEE_ROLE,      admin);

        feeRecipient = _feeRecipient;
        baseFeeWei   = _baseFeeWei;
        feesEnabled  = (_feeRecipient != address(0) && _baseFeeWei > 0);
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
