// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title OrderedMerkle
 * @dev Library for verifying ordered-pair Merkle proofs where left/right position is preserved
 * Unlike OpenZeppelin's MerkleProof which sorts pairs, this maintains position-aware verification
 * Supports both boolean array and bitfield position encoding
 */
library OrderedMerkle {
    /**
     * @dev Processes an ordered Merkle proof to compute the root using boolean array
     * @param proof Array of sibling hashes
     * @param isRight Array indicating if each sibling is on the right (true) or left (false)
     * @param leaf The leaf hash to prove
     * @return computed The computed root hash
     */
    function processProof(
        bytes32[] memory proof,
        bool[] memory isRight,
        bytes32 leaf
    ) internal pure returns (bytes32 computed) {
        require(proof.length == isRight.length, "OrderedMerkle: proof length mismatch");
        
        computed = leaf;
        unchecked {
            for (uint256 i; i < proof.length; ++i) {
                bytes32 sibling = proof[i];
                // If sibling is on the right, hash(current, sibling); else hash(sibling, current)
                computed = isRight[i]
                    ? keccak256(abi.encodePacked(computed, sibling))
                    : keccak256(abi.encodePacked(sibling, computed));
            }
        }
    }

    /**
     * @dev Processes an ordered Merkle proof using bitfield position encoding (LSB-first)
     * @param leaf The leaf hash to prove
     * @param proof Array of sibling hashes
     * @param positions Bitfield where bit i = 1 means sibling at proof[i] is on the right
     * @return computed The computed root hash
     */
    function processProof(
        bytes32 leaf,
        bytes32[] memory proof,
        uint256 positions
    ) internal pure returns (bytes32 computed) {
        computed = leaf;
        unchecked {
            for (uint256 i; i < proof.length; i++) {
                bool isRight = (positions & (1 << i)) != 0;
                computed = isRight
                    ? keccak256(abi.encodePacked(computed, proof[i]))
                    : keccak256(abi.encodePacked(proof[i], computed));
            }
        }
    }

    /**
     * @dev Verifies an ordered Merkle proof using boolean array
     * @param proof Array of sibling hashes
     * @param isRight Array indicating if each sibling is on the right (true) or left (false) 
     * @param root The expected root hash
     * @param leaf The leaf hash to prove
     * @return true if the proof is valid
     */
    function verify(
        bytes32[] memory proof,
        bool[] memory isRight,
        bytes32 root,
        bytes32 leaf
    ) internal pure returns (bool) {
        return processProof(proof, isRight, leaf) == root;
    }

    /**
     * @dev Verifies an ordered Merkle proof using bitfield position encoding
     * @param leaf The leaf hash to prove
     * @param proof Array of sibling hashes
     * @param positions Bitfield where bit i = 1 means sibling at proof[i] is on the right
     * @param root The expected root hash
     * @return true if the proof is valid
     */
    function verify(
        bytes32 leaf,
        bytes32[] memory proof,
        uint256 positions,
        bytes32 root
    ) internal pure returns (bool) {
        return processProof(leaf, proof, positions) == root;
    }
}
