// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/**
 * @title OrderedMerkle
 * @dev Library for verifying ordered-pair Merkle proofs where left/right position is preserved
 * Unlike OpenZeppelin's MerkleProof which sorts pairs, this maintains position-aware verification
 * Supports both boolean array and bitfield position encoding
 *
 * @notice This library provides position-aware Merkle proof verification compatible with OZ 5.4.0 standards
 * @author PayRox Team
 * @custom:security-contact security@payrox.com
 */
library OrderedMerkle {
    /// @dev Thrown when proof and position arrays have mismatched lengths
    error ProofLengthMismatch(uint256 proofLength, uint256 positionLength);

    /// @dev Thrown when proof length exceeds safe limits
    error ProofTooLong(uint256 length, uint256 maxLength);

    /// @dev Maximum proof length to prevent gas limit issues
    uint256 private constant MAX_PROOF_LENGTH = 32;
    /**
     * @dev Processes an ordered Merkle proof to compute the root using boolean array
     * @param proof Array of sibling hashes
     * @param isRight Array indicating if each sibling is on the right (true) or left (false)
     * @param leaf The leaf hash to prove
     * @return computed The computed root hash
     *
     * @notice Gas optimized with unchecked arithmetic and early validation
     * @custom:gas-optimization Uses unchecked blocks for safe arithmetic operations
     */
    function processProof(
        bytes32[] memory proof,
        bool[] memory isRight,
        bytes32 leaf
    ) internal pure returns (bytes32 computed) {
        uint256 proofLength = proof.length;

        // Gas-efficient validation with custom errors
        if (proofLength != isRight.length) {
            revert ProofLengthMismatch(proofLength, isRight.length);
        }

        if (proofLength > MAX_PROOF_LENGTH) {
            revert ProofTooLong(proofLength, MAX_PROOF_LENGTH);
        }

        computed = leaf;

        // Use unchecked for gas optimization - loop bounds are safe
        unchecked {
            for (uint256 i; i < proofLength; ++i) {
                bytes32 sibling = proof[i];
                // Position-aware hashing: maintain left/right order
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
     *
     * @notice More gas-efficient than boolean array for larger proofs
     * @custom:encoding LSB-first bitfield encoding for position data
     */
    function processProof(
        bytes32 leaf,
        bytes32[] memory proof,
        uint256 positions
    ) internal pure returns (bytes32 computed) {
        uint256 proofLength = proof.length;

        // Validate proof length
        if (proofLength > MAX_PROOF_LENGTH) {
            revert ProofTooLong(proofLength, MAX_PROOF_LENGTH);
        }

        computed = leaf;

        // Use unchecked for gas optimization - loop bounds and bit operations are safe
        unchecked {
            for (uint256 i; i < proofLength; ++i) {
                // Extract position bit using LSB-first encoding
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
     * @return isValid true if the proof is valid, false otherwise
     *
     * @notice Validates proof by computing root and comparing with expected value
     * @custom:gas-optimization Optimized for readability and gas efficiency
     */
    function verify(
        bytes32[] memory proof,
        bool[] memory isRight,
        bytes32 root,
        bytes32 leaf
    ) internal pure returns (bool isValid) {
        return processProof(proof, isRight, leaf) == root;
    }

    /**
     * @dev Verifies an ordered Merkle proof using bitfield position encoding
     * @param leaf The leaf hash to prove
     * @param proof Array of sibling hashes
     * @param positions Bitfield where bit i = 1 means sibling at proof[i] is on the right
     * @param root The expected root hash
     * @return isValid true if the proof is valid, false otherwise
     *
     * @notice More gas-efficient verification for larger proofs using bitfield encoding
     * @custom:encoding Uses LSB-first bitfield for compact position representation
     */
    function verify(
        bytes32 leaf,
        bytes32[] memory proof,
        uint256 positions,
        bytes32 root
    ) internal pure returns (bool isValid) {
        return processProof(leaf, proof, positions) == root;
    }
}
