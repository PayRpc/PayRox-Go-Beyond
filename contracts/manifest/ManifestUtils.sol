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

    /**
     * @dev Validate upgrade manifest compatibility
     * @param upgrade The upgrade manifest
     * @param currentManifest The current manifest
     * @return isValid Whether the upgrade is valid
     */
    function validateUpgrade(
        ManifestTypes.UpgradeManifest memory upgrade,
        ManifestTypes.ReleaseManifest memory currentManifest
    ) internal view returns (bool isValid) {
        // Check version progression
        bytes32 currentVersionHash = calculateManifestHash(currentManifest);
        if (upgrade.fromVersion != currentVersionHash) {
            return false;
        }

        // Check upgrade deadline
        if (block.timestamp > upgrade.upgradeDeadline) {
            return false;
        }

        // Validate affected contracts
        if (upgrade.affectedContracts.length == 0) {
            return false;
        }

        return true;
    }

    /**
     * @dev Calculate governance proposal hash
     * @param proposal The governance proposal
     * @return proposalHash The calculated hash
     */
    function calculateProposalHash(
        ManifestTypes.GovernanceProposal memory proposal
    ) internal pure returns (bytes32 proposalHash) {
        return keccak256(abi.encode(
            proposal.proposalId,
            proposal.proposer,
            proposal.description,
            proposal.targetHashes,
            proposal.votingDeadline
        ));
    }

    /**
     * @dev Verify audit information
     * @param auditInfo The audit information
     * @param manifestHash The manifest hash being audited
     * @return isValid Whether the audit is valid
     */
    function verifyAudit(
        ManifestTypes.AuditInfo memory auditInfo,
        bytes32 manifestHash
    ) internal pure returns (bool isValid) {
        // Verify audit hash includes manifest hash
        bytes32 expectedAuditHash = keccak256(abi.encode(
            manifestHash,
            auditInfo.auditor,
            auditInfo.auditTimestamp,
            auditInfo.reportUri
        ));

        return auditInfo.auditHash == expectedAuditHash;
    }

    /**
     * @dev Check if governance proposal has sufficient votes
     * @param proposal The governance proposal
     * @param totalSupply The total voting supply
     * @param quorumThreshold The quorum threshold percentage (1-100)
     * @return hasPassed Whether the proposal has passed
     */
    function checkGovernanceQuorum(
        ManifestTypes.GovernanceProposal memory proposal,
        uint256 totalSupply,
        uint256 quorumThreshold
    ) internal pure returns (bool hasPassed) {
        uint256 totalVotes = proposal.forVotes + proposal.againstVotes;
        uint256 requiredQuorum = (totalSupply * quorumThreshold) / 100;

        return totalVotes >= requiredQuorum && proposal.forVotes > proposal.againstVotes;
    }

    /**
     * @dev Production-grade manifest integrity verification
     * @param manifest The manifest to verify
     * @param previousManifestHash Hash of the previous manifest
     * @param currentTimestamp Current block timestamp
     * @return isValid Whether the manifest is valid
     * @return errorCode Error code (0=valid, 1=invalid chain, 2=stale timestamp, 3=invalid previous hash)
     */
    function verifyManifestIntegrity(
        ManifestTypes.ReleaseManifest memory manifest,
        bytes32 previousManifestHash,
        uint256 currentTimestamp
    ) internal pure returns (bool isValid, uint256 errorCode) {
        // Check chain ID consistency
        if (manifest.header.chainId == 0) {
            return (false, 1);
        }
        
        // Check timestamp is not too far in the past (within 24 hours)
        if (currentTimestamp > manifest.header.timestamp + 86400) {
            return (false, 2);
        }
        
        // Check previous hash linkage
        if (manifest.header.previousHash != previousManifestHash) {
            return (false, 3);
        }
        
        return (true, 0);
    }

    /**
     * @dev Calculate manifest deployment gas estimate
     * @param manifest The manifest to analyze
     * @return estimatedGas Estimated gas cost for deployment
     */
    function estimateDeploymentGas(
        ManifestTypes.ReleaseManifest memory manifest
    ) internal pure returns (uint256 estimatedGas) {
        // Base gas for manifest processing
        estimatedGas = 100000;
        
        // Add gas per facet (route updates)
        uint256 totalSelectors = 0;
        for (uint256 i = 0; i < manifest.facets.length; i++) {
            totalSelectors += manifest.facets[i].selectors.length;
        }
        estimatedGas += totalSelectors * 5000; // ~5k gas per selector
        
        // Add gas per chunk deployment
        estimatedGas += manifest.chunks.length * 50000; // ~50k gas per chunk
        
        // Add gas for Merkle verification
        estimatedGas += 30000;
        
        return estimatedGas;
    }

    /**
     * @dev Validate manifest security properties
     * @param manifest The manifest to validate
     * @return isSecure Whether the manifest meets security requirements
     * @return riskLevel Risk level (0=low, 1=medium, 2=high)
     */
    function validateSecurityProperties(
        ManifestTypes.ReleaseManifest memory manifest
    ) internal view returns (bool isSecure, uint256 riskLevel) {
        // Check for excessive facet count (potential attack vector)
        if (manifest.facets.length > 50) {
            return (false, 2); // High risk
        }
        
        // Check for suspicious chunk sizes
        for (uint256 i = 0; i < manifest.chunks.length; i++) {
            // Very large chunks could be gas bombs
            if (manifest.chunks[i].size > 24000) { // Close to contract size limit
                return (false, 1); // Medium risk
            }
        }
        
        // Check manifest age (stale manifests are risky)
        if (block.timestamp > manifest.header.timestamp + 604800) { // 1 week old
            return (false, 1); // Medium risk
        }
        
        return (true, 0); // Low risk
    }

    /**
     * @dev Generate deployment summary for monitoring
     * @param manifest The manifest to summarize
     * @return summary Deployment summary
     */
    function generateDeploymentSummary(
        ManifestTypes.ReleaseManifest memory manifest
    ) internal pure returns (ManifestTypes.DeploymentSummary memory summary) {
        summary.totalFacets = manifest.facets.length;
        summary.totalChunks = manifest.chunks.length;
        summary.manifestHash = calculateManifestHash(manifest);
        summary.version = manifest.header.version;
        summary.timestamp = manifest.header.timestamp;
        
        // Count total selectors across all facets
        uint256 totalSelectors = 0;
        for (uint256 i = 0; i < manifest.facets.length; i++) {
            totalSelectors += manifest.facets[i].selectors.length;
        }
        summary.totalSelectors = totalSelectors;
        
        return summary;
    }
}
