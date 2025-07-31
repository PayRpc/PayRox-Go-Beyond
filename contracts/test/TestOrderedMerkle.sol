// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "../utils/OrderedMerkle.sol";

/**
 * @title TestOrderedMerkle
 * @dev Test contract to expose OrderedMerkle library functions for testing
 */
contract TestOrderedMerkle {
    using OrderedMerkle for bytes32;

    /**
     * @dev Test wrapper for processProof with boolean array
     */
    function processProofBoolArray(
        bytes32[] memory proof,
        bool[] memory isRight,
        bytes32 leaf
    ) external pure returns (bytes32) {
        return OrderedMerkle.processProof(proof, isRight, leaf);
    }

    /**
     * @dev Test wrapper for processProof with bitfield
     */
    function processProofBitfield(
        bytes32 leaf,
        bytes32[] memory proof,
        uint256 positions
    ) external pure returns (bytes32) {
        return OrderedMerkle.processProof(leaf, proof, positions);
    }

    /**
     * @dev Test wrapper for verify with boolean array
     */
    function verifyBoolArray(
        bytes32[] memory proof,
        bool[] memory isRight,
        bytes32 root,
        bytes32 leaf
    ) external pure returns (bool) {
        return OrderedMerkle.verify(proof, isRight, root, leaf);
    }

    /**
     * @dev Test wrapper for verify with bitfield
     */
    function verifyBitfield(
        bytes32 leaf,
        bytes32[] memory proof,
        uint256 positions,
        bytes32 root
    ) external pure returns (bool) {
        return OrderedMerkle.verify(leaf, proof, positions, root);
    }
}
