// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface IChunkFactory {
    /// Deploy a single content-addressed chunk (SSTORE2-style).
    /// Returns the chunk address and keccak256(data).
    function stage(bytes calldata data)
        external
        payable
        returns (address chunk, bytes32 hash);

    /// Deploy multiple chunks. Idempotent per element.
    /// Returns arrays aligned by index.
    function stageBatch(bytes[] calldata blobs)
        external
        payable
        returns (address[] memory chunks, bytes32[] memory hashes);

    /// Predict CREATE2 address and content hash for `data` without deploying.
    function predict(bytes calldata data)
        external
        view
        returns (address predicted, bytes32 hash);

    /// True if a chunk with this content hash already exists.
    function exists(bytes32 hash) external view returns (bool);
}
