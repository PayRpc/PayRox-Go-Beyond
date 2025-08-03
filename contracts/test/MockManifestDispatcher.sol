// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MockManifestDispatcher
 * @notice Mock implementation for testing ChunkFactoryFacet
 * @dev Minimal implementation to support factory testing
 */
contract MockManifestDispatcher {
    mapping(bytes32 => bool) public manifestHashes;

    constructor() {
        // Add some test manifest hashes
        manifestHashes[keccak256("test-manifest")] = true;
    }

    function isValidManifest(bytes32 hash) external view returns (bool) {
        return manifestHashes[hash];
    }

    function addManifestHash(bytes32 hash) external {
        manifestHashes[hash] = true;
    }
}
