// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "./ManifestTypes.sol";

/**
 * @title ManifestUtils
 * @dev Utility functions for manifest processing and validation
 */
library ManifestUtils {

    /**
     * @dev Calculate the hash of a manifest
     * @param manifest The manifest to hash
     * @return manifestHash The calculated hash
     */
    function calculateManifestHash(
        ManifestTypes.ReleaseManifest memory manifest
    ) internal pure returns (bytes32 manifestHash) {
        return keccak256(abi.encode(
            manifest.header,
            manifest.facets,
            manifest.chunks,
            manifest.merkleRoot
        ));
    }

    /**
     * @dev Verify a manifest signature
     * @param manifest The manifest to verify
     * @param expectedSigner The expected signer address
     * @return isValid Whether the signature is valid
     */
    function verifyManifestSignature(
        ManifestTypes.ReleaseManifest memory manifest,
        address expectedSigner
    ) internal pure returns (bool isValid) {
        bytes32 hash = calculateManifestHash(manifest);
        bytes32 ethSignedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash));

        address recoveredSigner = recoverSigner(ethSignedHash, manifest.signature);
        return recoveredSigner == expectedSigner;
    }

    /**
     * @dev Recover signer from signature
     * @param hash The hash that was signed
     * @param signature The signature
     * @return signer The recovered signer address
     */
    function recoverSigner(
        bytes32 hash,
        bytes memory signature
    ) internal pure returns (address signer) {
        require(signature.length == 65, "ManifestUtils: invalid signature length");

        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := byte(0, mload(add(signature, 96)))
        }

        return ecrecover(hash, v, r, s);
    }

    /**
     * @dev Validate manifest structure and constraints
     * @param manifest The manifest to validate
     * @param policy The security policy to enforce
     * @return isValid Whether the manifest is valid
     * @return errorMessage Error message if validation fails
     */
    function validateManifest(
        ManifestTypes.ReleaseManifest memory manifest,
        ManifestTypes.SecurityPolicy memory policy
    ) internal pure returns (bool isValid, string memory errorMessage) {

        // Check facet count
        if (manifest.facets.length > policy.maxFacetCount) {
            return (false, "Too many facets");
        }

        // Check individual facets
        for (uint256 i = 0; i < manifest.facets.length; i++) {
            ManifestTypes.FacetInfo memory facet = manifest.facets[i];

            // Check facet address
            if (facet.facetAddress == address(0)) {
                return (false, "Invalid facet address");
            }

            // Check selectors
            if (facet.selectors.length == 0) {
                return (false, "Facet has no selectors");
            }

            // Check for duplicate selectors
            for (uint256 j = 0; j < facet.selectors.length; j++) {
                for (uint256 k = j + 1; k < facet.selectors.length; k++) {
                    if (facet.selectors[j] == facet.selectors[k]) {
                        return (false, "Duplicate selectors");
                    }
                }
            }
        }

        // Check chunks
        for (uint256 i = 0; i < manifest.chunks.length; i++) {
            ManifestTypes.ChunkMapping memory chunk = manifest.chunks[i];

            if (chunk.chunkAddress == address(0)) {
                return (false, "Invalid chunk address");
            }

            if (chunk.size > policy.maxFacetSize) {
                return (false, "Chunk size exceeds limit");
            }
        }

        return (true, "");
    }

    /**
     * @dev Generate Merkle root for chunks
     * @param chunks Array of chunk mappings
     * @return merkleRoot The calculated Merkle root
     */
    function generateMerkleRoot(
        ManifestTypes.ChunkMapping[] memory chunks
    ) internal pure returns (bytes32 merkleRoot) {
        if (chunks.length == 0) {
            return bytes32(0);
        }

        if (chunks.length == 1) {
            return chunks[0].chunkHash;
        }

        // Create array of hashes
        bytes32[] memory hashes = new bytes32[](chunks.length);
        for (uint256 i = 0; i < chunks.length; i++) {
            hashes[i] = chunks[i].chunkHash;
        }

        // Build Merkle tree
        while (hashes.length > 1) {
            hashes = _buildNextLevel(hashes);
        }

        return hashes[0];
    }

    /**
     * @dev Build next level of Merkle tree
     * @param currentLevel Current level hashes
     * @return nextLevel Next level hashes
     */
    function _buildNextLevel(
        bytes32[] memory currentLevel
    ) private pure returns (bytes32[] memory nextLevel) {
        uint256 nextLevelLength = (currentLevel.length + 1) / 2;
        nextLevel = new bytes32[](nextLevelLength);

        for (uint256 i = 0; i < nextLevelLength; i++) {
            if (2 * i + 1 < currentLevel.length) {
                nextLevel[i] = keccak256(abi.encodePacked(
                    currentLevel[2 * i],
                    currentLevel[2 * i + 1]
                ));
            } else {
                nextLevel[i] = currentLevel[2 * i];
            }
        }
    }

    /**
     * @dev Extract selectors from facets
     * @param facets Array of facet info
     * @return allSelectors All unique selectors
     */
    function extractSelectors(
        ManifestTypes.FacetInfo[] memory facets
    ) internal pure returns (bytes4[] memory allSelectors) {
        uint256 totalSelectors = 0;

        // Count total selectors
        for (uint256 i = 0; i < facets.length; i++) {
            totalSelectors += facets[i].selectors.length;
        }

        allSelectors = new bytes4[](totalSelectors);
        uint256 index = 0;

        // Collect all selectors
        for (uint256 i = 0; i < facets.length; i++) {
            for (uint256 j = 0; j < facets[i].selectors.length; j++) {
                allSelectors[index] = facets[i].selectors[j];
                index++;
            }
        }
    }

    /**
     * @dev Check if two manifests are compatible
     * @param oldManifest The old manifest
     * @param newManifest The new manifest
     * @return compatible Whether the manifests are compatible
     */
    function areManifestsCompatible(
        ManifestTypes.ReleaseManifest memory oldManifest,
        ManifestTypes.ReleaseManifest memory newManifest
    ) internal pure returns (bool compatible) {
        // Check chain ID compatibility
        if (oldManifest.header.chainId != newManifest.header.chainId) {
            return false;
        }

        // Check version progression
        if (newManifest.header.timestamp <= oldManifest.header.timestamp) {
            return false;
        }

        // Check previous hash linkage
        bytes32 oldHash = calculateManifestHash(oldManifest);
        if (newManifest.header.previousHash != oldHash) {
            return false;
        }

        return true;
    }
}
