// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/**
 * @title ManifestTypes
 * @dev Common types and structures used throughout the manifest system
 */
library ManifestTypes {

    struct DeploymentData {
        bytes bytecode;
        bytes32 salt;
        string componentType;
        uint256 gasLimit;
        address expectedAddress;
    }

    struct ManifestHeader {
        bytes32 version;
        uint256 timestamp;
        address deployer;
        uint256 chainId;
        bytes32 previousHash;
    }

    struct FacetInfo {
        address facetAddress;
        bytes4[] selectors;
        bool isActive;
        uint256 priority;
        uint256 gasLimit;
    }

    struct ChunkMapping {
        bytes32 chunkHash;
        address chunkAddress;
        uint256 size;
        uint256 deploymentBlock;
        bool verified;
    }

    struct ReleaseManifest {
        ManifestHeader header;
        FacetInfo[] facets;
        ChunkMapping[] chunks;
        bytes32 merkleRoot;
        bytes signature;
    }

    struct NetworkConfig {
        uint256 chainId;
        string name;
        uint256 gasPrice;
        uint256 gasLimit;
        uint256 confirmations;
        bool isTestnet;
    }

    struct SecurityPolicy {
        uint256 maxFacetSize;
        uint256 maxFacetCount;
        bool requireMultisig;
        bool requireAudit;
        address[] authorizedDeployers;
    }

    struct DeploymentResult {
        bool success;
        address deployedAddress;
        uint256 gasUsed;
        bytes32 transactionHash;
        string errorMessage;
    }

    struct UpgradeManifest {
        bytes32 fromVersion;
        bytes32 toVersion;
        address[] affectedContracts;
        bytes32[] migrationHashes;
        uint256 upgradeDeadline;
        bool requiresEmergencyPause;
    }

    struct AuditInfo {
        address auditor;
        bytes32 auditHash;
        uint256 auditTimestamp;
        bool passed;
        string reportUri;
    }

    struct GovernanceProposal {
        bytes32 proposalId;
        address proposer;
        string description;
        bytes32[] targetHashes;
        uint256 votingDeadline;
        uint256 forVotes;
        uint256 againstVotes;
        bool executed;
    }

    // Events
    event ManifestCreated(
        bytes32 indexed manifestHash,
        address indexed creator,
        uint256 timestamp
    );

    event ManifestVerified(
        bytes32 indexed manifestHash,
        address indexed verifier,
        bool isValid
    );

    event ChunkMapped(
        bytes32 indexed chunkHash,
        address indexed chunkAddress,
        uint256 size
    );

    event UpgradeProposed(
        bytes32 indexed proposalId,
        bytes32 indexed fromVersion,
        bytes32 indexed toVersion,
        address proposer
    );

    event AuditCompleted(
        bytes32 indexed manifestHash,
        address indexed auditor,
        bool passed
    );

    event GovernanceVoteCast(
        bytes32 indexed proposalId,
        address indexed voter,
        bool support,
        uint256 weight
    );

    struct DeploymentSummary {
        uint256 totalFacets;
        uint256 totalChunks;
        uint256 totalSelectors;
        bytes32 manifestHash;
        bytes32 version; // Changed from string to bytes32 to match ManifestHeader
        uint256 timestamp;
    }

    // Errors
    error InvalidManifestVersion();
    error InvalidSignature();
    error UnauthorizedDeployer();
    error FacetSizeExceeded();
    error ChunkNotFound();
    error VerificationFailed();
    error UpgradeDeadlineExceeded();
    error AuditRequired();
    error InsufficientVotes();
    error ProposalNotFound();
}
