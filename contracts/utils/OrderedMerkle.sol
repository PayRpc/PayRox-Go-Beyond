// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/**
 * @title OrderedMerkle
 * @notice Position-aware Merkle proof verification with advanced features
 * @dev Features:
 * - Root caching system with management
 * - Selector-based route proofs
 * - Defensive proof length bounds
 * - Gas-aware dynamic limits
 */
library OrderedMerkle {
    /*//////////////////////////////////////////////////////////////
                               ERRORS & CONSTANTS
    //////////////////////////////////////////////////////////////*/

    error ProofLengthMismatch(uint256 proofLength, uint256 positionLength);
    error ProofTooLong(uint256 length, uint256 maxLength);
    error InsufficientGas(uint256 required, uint256 available);
    error CacheDisabled();

    uint256 private constant MAX_PROOF_LENGTH = 256;
    uint256 private constant STEP_GAS = 10_000;
    uint256 private constant SAFETY_BUFFER = 30_000;

    /*//////////////////////////////////////////////////////////////
                              STORAGE
    //////////////////////////////////////////////////////////////*/

    struct CacheConfig {
        bool enabled;
        mapping(bytes32 => bool) roots;
    }

    // Storage pointer pattern for library storage
    bytes32 private constant STORAGE_POSITION = keccak256("ordered.merkle.storage");
    
    function _storage() private pure returns (CacheConfig storage cs) {
        bytes32 position = STORAGE_POSITION;
        assembly {
            cs.slot := position
        }
    }

    /*//////////////////////////////////////////////////////////////
                          CACHE MANAGEMENT
    //////////////////////////////////////////////////////////////*/

    /// @notice Check if root exists in cache
    function isRootCached(bytes32 root) public view returns (bool) {
        return _storage().enabled && _storage().roots[root];
    }

    /// @notice Enable/disable root caching system
    function setCacheEnabled(bool enabled) external {
        _storage().enabled = enabled;
    }

    /*//////////////////////////////////////////////////////////////
                          PROOF VERIFICATION
    //////////////////////////////////////////////////////////////*/

    function _processProof(
        bytes32 leaf,
        bytes32[] calldata proof,
        uint256 positions
    ) private view returns (bytes32 computed) {
        uint256 n = proof.length;
        
        // Defensive bounds check
        if (n > MAX_PROOF_LENGTH) {
            revert ProofTooLong(n, MAX_PROOF_LENGTH);
        }
        
        _checkProofLength(n);
        
        // Mask unused bits
        if (n < 256) positions &= (1 << n) - 1;

        computed = _hashLeaf(leaf);
        
        unchecked {
            for (uint256 i; i < n; ++i) {
                bool isRight = (positions >> i) & 1 == 1;
                computed = isRight 
                    ? _hashNode(computed, proof[i]) 
                    : _hashNode(proof[i], computed);
            }
        }
    }

    /*//////////////////////////////////////////////////////////////
                          ROUTE VERIFICATION
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Creates deterministic leaf for selector-based routing
     * @param selector Function selector
     * @param facet Implementation address
     * @param codehash Codehash for additional safety
     */
    function leafOfSelectorRoute(
        bytes4 selector,
        address facet,
        bytes32 codehash
    ) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(
            bytes1(0x00), 
            selector, 
            facet, 
            codehash
        ));
    }

    /**
     * @notice Verify route with caching support
     */
    function verifyRoute(
        bytes4 selector,
        address facet,
        bytes32 codehash,
        bytes32[] calldata proof,
        uint256 positions,
        bytes32 root
    ) external returns (bool) {
        bytes32 leaf = leafOfSelectorRoute(selector, facet, codehash);
        return verifyWithCache(leaf, proof, positions, root);
    }

    /*//////////////////////////////////////////////////////////////
                          MAIN VERIFICATION API
    //////////////////////////////////////////////////////////////*/

    function verifyWithCache(
        bytes32 leaf,
        bytes32[] calldata proof,
        uint256 positions,
        bytes32 root
    ) public returns (bool) {
        CacheConfig storage cs = _storage();
        
        if (cs.enabled && cs.roots[root]) {
            return true;
        }

        bool isValid = _processProof(leaf, proof, positions) == root;
        
        if (isValid && cs.enabled) {
            cs.roots[root] = true;
        }
        
        return isValid;
    }

    /*//////////////////////////////////////////////////////////////
                          INTERNAL HELPERS
    //////////////////////////////////////////////////////////////*/

    function _hashLeaf(bytes32 leaf) private pure returns (bytes32) {
        return keccak256(abi.encodePacked(bytes1(0x00), leaf));
    }

    function _hashNode(bytes32 left, bytes32 right) private pure returns (bytes32) {
        return keccak256(abi.encodePacked(bytes1(0x01), left, right));
    }

    function _checkProofLength(uint256 n) private view {
        uint256 required = (n * STEP_GAS) + SAFETY_BUFFER;
        if (gasleft() < required) revert InsufficientGas(required, gasleft());
    }
}