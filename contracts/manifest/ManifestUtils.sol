// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "./ManifestTypes.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title ManifestUtils
 * @dev Utility functions for manifest processing and validation
 */
library ManifestUtils {

    // Gas estimation constants for clarity and maintainability
    uint256 private constant BASE_MANIFEST_GAS = 100_000;      // Base gas for manifest processing
    uint256 private constant GAS_PER_SELECTOR = 5_000;        // Gas per function selector
    uint256 private constant GAS_PER_CHUNK = 50_000;          // Gas per chunk deployment
    uint256 private constant MERKLE_VERIFICATION_GAS = 30_000; // Gas for Merkle verification

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
     * @dev Verify a manifest signature using OpenZeppelin's robust ECDSA
     * @param manifest The manifest to verify
     * @param expectedSigner The expected signer address
     * @return isValid Whether the signature is valid
     */
    function verifyManifestSignature(
        ManifestTypes.ReleaseManifest memory manifest,
        address expectedSigner
    ) internal pure returns (bool isValid) {
        bytes32 hash = calculateManifestHash(manifest);
        bytes32 digest = MessageHashUtils.toEthSignedMessageHash(hash);
        (address recoveredSigner, ECDSA.RecoverError err,) = ECDSA.tryRecover(digest, manifest.signature);
        return err == ECDSA.RecoverError.NoError && recoveredSigner == expectedSigner;
    }

    /**
     * @dev Validate manifest structure and constraints with enhanced security checks
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

            // Check for duplicate selectors within facet
            for (uint256 j = 0; j < facet.selectors.length; j++) {
                for (uint256 k = j + 1; k < facet.selectors.length; k++) {
                    if (facet.selectors[j] == facet.selectors[k]) {
                        return (false, "Duplicate selectors within facet");
                    }
                }
            }
        }

        // Check for selector collisions across facets
        for (uint256 i = 0; i < manifest.facets.length; i++) {
            for (uint256 j = i + 1; j < manifest.facets.length; j++) {
                bytes4[] memory A = manifest.facets[i].selectors;
                bytes4[] memory B = manifest.facets[j].selectors;
                for (uint256 a = 0; a < A.length; a++) {
                    for (uint256 b = 0; b < B.length; b++) {
                        if (A[a] == B[b]) {
                            return (false, "Selector collision across facets");
                        }
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

            if (chunk.size > policy.maxChunkSize) {
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
     * @dev Collect all selectors from facets (may contain duplicates for analysis)
     * @param facets Array of facet info
     * @return allSelectors All selectors from all facets
     */
    function collectSelectors(
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
     * @dev Calculate governance proposal hash with structured data hashing
     * @param proposal The governance proposal
     * @return proposalHash The calculated hash
     */
    function calculateProposalHash(
        ManifestTypes.GovernanceProposal memory proposal
    ) internal pure returns (bytes32 proposalHash) {
        // Hash the description separately to handle variable length data
        bytes32 descriptionHash = keccak256(abi.encodePacked(proposal.description));

        // Create structured hash with proper ordering and type safety
        return keccak256(abi.encode(
            "GOVERNANCE_PROPOSAL", // Type identifier for domain separation
            proposal.proposalId,
            proposal.proposer,
            descriptionHash, // Use hashed description for consistency
            keccak256(abi.encodePacked(proposal.targetHashes)), // Hash the array
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
     * @dev Production-grade manifest integrity verification with chain validation
     * @param manifest The manifest to verify
     * @param previousManifestHash Hash of the previous manifest
     * @param currentTimestamp Current block timestamp
     * @param expectedChainId Expected chain ID for this deployment
     * @return isValid Whether the manifest is valid
     * @return errorCode Error code (0=valid, 1=wrong chain, 2=stale timestamp, 3=invalid previous hash)
     */
    function verifyManifestIntegrity(
        ManifestTypes.ReleaseManifest memory manifest,
        bytes32 previousManifestHash,
        uint256 currentTimestamp,
        uint256 expectedChainId
    ) internal pure returns (bool isValid, uint256 errorCode) {
        // Check chain ID matches expected deployment target
        if (manifest.header.chainId != expectedChainId) {
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
        estimatedGas = BASE_MANIFEST_GAS;

        // Add gas per facet (route updates)
        uint256 totalSelectors = 0;
        for (uint256 i = 0; i < manifest.facets.length; i++) {
            totalSelectors += manifest.facets[i].selectors.length;
        }
        estimatedGas += totalSelectors * GAS_PER_SELECTOR;

        // Add gas per chunk deployment
        estimatedGas += manifest.chunks.length * GAS_PER_CHUNK;

        // Add gas for Merkle verification
        estimatedGas += MERKLE_VERIFICATION_GAS;

        return estimatedGas;
    }

    /**
     * @dev Validate manifest security properties with correct EIP-170 limits
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

        // Check for suspicious chunk sizes using correct EIP-170 runtime limit
        for (uint256 i = 0; i < manifest.chunks.length; i++) {
            // EIP-170 runtime bytecode limit is 24,576 bytes
            if (manifest.chunks[i].size > 24576) { // Exact EIP-170 limit
                return (false, 2); // High risk - exceeds runtime limit
            }
            // Flag chunks close to the limit as medium risk
            if (manifest.chunks[i].size > 20000) { // 82% of limit
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
