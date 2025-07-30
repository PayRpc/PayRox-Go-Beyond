// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "../manifest/ManifestUtils.sol";
import "../manifest/ManifestTypes.sol";

/**
 * @title TestManifestUtils
 * @dev Test contract to expose ManifestUtils library functions for testing
 */
contract TestManifestUtils {
    using ManifestUtils for ManifestTypes.ReleaseManifest;

    /**
     * @dev Test wrapper for calculateManifestHash
     */
    function testCalculateManifestHash(
        ManifestTypes.ReleaseManifest memory manifest
    ) external pure returns (bytes32) {
        return ManifestUtils.calculateManifestHash(manifest);
    }

    /**
     * @dev Test wrapper for verifyManifestSignature
     */
    function testVerifyManifestSignature(
        ManifestTypes.ReleaseManifest memory manifest,
        address expectedSigner
    ) external pure returns (bool) {
        return ManifestUtils.verifyManifestSignature(manifest, expectedSigner);
    }

    /**
     * @dev Test wrapper for recoverSigner
     */
    function testRecoverSigner(
        bytes32 hash,
        bytes memory signature
    ) external pure returns (address) {
        return ManifestUtils.recoverSigner(hash, signature);
    }

    /**
     * @dev Test wrapper for validateManifest
     */
    function testValidateManifest(
        ManifestTypes.ReleaseManifest memory manifest
    ) external pure returns (bool) {
        address[] memory authorizedDeployers = new address[](0);
        ManifestTypes.SecurityPolicy memory defaultPolicy = ManifestTypes.SecurityPolicy({
            maxFacetSize: 24576,
            maxFacetCount: 100,
            requireMultisig: false,
            requireAudit: false,
            authorizedDeployers: authorizedDeployers
        });

        (bool isValid, ) = ManifestUtils.validateManifest(manifest, defaultPolicy);
        return isValid;
    }

    /**
     * @dev Test wrapper for validateManifest with custom policy
     */
    function testValidateManifestWithPolicy(
        ManifestTypes.ReleaseManifest memory manifest,
        ManifestTypes.SecurityPolicy memory policy
    ) external pure returns (bool) {
        (bool isValid, ) = ManifestUtils.validateManifest(manifest, policy);
        return isValid;
    }

    /**
     * @dev Test wrapper for extractSelectors
     */
    function testExtractSelectors(
        ManifestTypes.FacetInfo[] memory facets
    ) external pure returns (bytes4[] memory) {
        return ManifestUtils.extractSelectors(facets);
    }

    /**
     * @dev Test wrapper for areManifestsCompatible
     */
    function testAreManifestsCompatible(
        ManifestTypes.ReleaseManifest memory oldManifest,
        ManifestTypes.ReleaseManifest memory newManifest
    ) external pure returns (bool) {
        return ManifestUtils.areManifestsCompatible(oldManifest, newManifest);
    }

    /**
     * @dev Test wrapper for generateMerkleRoot with ChunkMapping
     */
    function testGenerateMerkleRoot(
        ManifestTypes.ChunkMapping[] memory chunks
    ) external pure returns (bytes32) {
        return ManifestUtils.generateMerkleRoot(chunks);
    }
}
