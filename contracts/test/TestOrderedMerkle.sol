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
     * @dev Test wrapper for processProof with bitfield
     */
    function processProof(
        bytes32 leaf,
        bytes32[] calldata proof,
        uint256 positions
    ) external pure returns (bytes32) {
        return OrderedMerkle.processProof(leaf, proof, positions);
    }

    /**
     * @dev Test wrapper for verify with bitfield
     */
    function verify(
        bytes32 leaf,
        bytes32[] calldata proof,
        uint256 positions,
        bytes32 root
    ) external pure returns (bool) {
        return OrderedMerkle.verify(leaf, proof, positions, root);
    }

    /**
     * @dev Test wrapper for verify with boolean array (legacy compatibility)
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
     * @dev Test wrapper for leafOfSelectorRoute
     */
    function leafOfSelectorRoute(
        bytes4 selector,
        address facet,
        bytes32 codehash
    ) external pure returns (bytes32) {
        return OrderedMerkle.leafOfSelectorRoute(selector, facet, codehash);
    }

    /**
     * @dev Test wrapper for verifyRoute
     */
    function verifyRoute(
        bytes4 selector,
        address facet,
        bytes32 codehash,
        bytes32[] calldata proof,
        uint256 positions,
        bytes32 root
    ) external pure returns (bool) {
        return OrderedMerkle.verifyRoute(selector, facet, codehash, proof, positions, root);
    }

    /**
     * @dev Helper to convert boolean array to bitfield for testing
     */
    function boolArrayToBitfield(bool[] memory isRight) external pure returns (uint256 positions) {
        uint256 length = isRight.length;
        require(length <= 256, "Array too long");

        positions = 0;
        for (uint256 i = 0; i < length; i++) {
            if (isRight[i]) {
                positions |= (1 << i);
            }
        }
    }
}
