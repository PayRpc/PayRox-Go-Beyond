// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

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
    
    // Errors
    error InvalidManifestVersion();
    error InvalidSignature();
    error UnauthorizedDeployer();
    error FacetSizeExceeded();
    error ChunkNotFound();
    error VerificationFailed();
}
