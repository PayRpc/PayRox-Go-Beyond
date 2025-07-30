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
        ManifestTypes.ReleaseManifest memory manifest,
        ManifestTypes.SecurityPolicy memory policy
    ) external pure returns (bool isValid, string memory errorMessage) {
        return ManifestUtils.validateManifest(manifest, policy);
    }
}
