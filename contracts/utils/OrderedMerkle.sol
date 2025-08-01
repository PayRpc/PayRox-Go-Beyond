// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/**
 * @title OrderedMerkle
 * @notice Position-aware Merkle proof verification.
 *         Unlike sorted-pair proofs, this preserves left/right order.
 *
 *         Domain separation:
 *           - Leaves: keccak256(0x00 || leaf)
 *           - Inner nodes: keccak256(0x01 || left || right)
 *
 *         Provides both calldata (preferred) and memory overloads.
 *
 * @custom:security-contact security@payrox.com
 */
library OrderedMerkle {
    /*//////////////////////////////////////////////////////////////
                               ERRORS & CONSTANTS
    //////////////////////////////////////////////////////////////*/

    /// @dev Thrown when proof and position arrays (bool encoding) have mismatched lengths.
    error ProofLengthMismatch(uint256 proofLength, uint256 positionLength);

    /// @dev Thrown when proof length exceeds the safe bound.
    error ProofTooLong(uint256 length, uint256 maxLength);

    /// @notice Maximum number of proof steps allowed (prevents gas blowups).
    uint256 private constant MAX_PROOF_LENGTH = 32;

    /*//////////////////////////////////////////////////////////////
                              INTERNAL HELPERS
    //////////////////////////////////////////////////////////////*/

    /// @dev Domain-separated leaf hash: keccak256(0x00 || leaf)
    function _hashLeaf(bytes32 leaf) private pure returns (bytes32 out) {
        assembly {
            // layout: [0x00: 1 byte prefix=0x00][0x01..0x20: leaf] => 33 bytes
            mstore(0x01, leaf)
            mstore8(0x00, 0x00)
            out := keccak256(0x00, 33)
        }
    }

    /// @dev Domain-separated inner node hash: keccak256(0x01 || left || right)
    function _hashNode(bytes32 left, bytes32 right) private pure returns (bytes32 out) {
        assembly {
            // layout: [0x00: 1 byte prefix=0x01][0x01..0x20: left][0x21..0x40: right] => 65 bytes
            mstore(0x01, left)
            mstore(0x21, right)
            mstore8(0x00, 0x01)
            out := keccak256(0x00, 65)
        }
    }

    /*//////////////////////////////////////////////////////////////
                  PROCESS (BOOL ENCODING) — CALLDATA VERSION
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Compute root from ordered proof (calldata/bool positions).
     * @param proof   Sibling hashes (calldata)
     * @param isRight Bit array where isRight[i]=true means sibling is on the RIGHT of current
     * @param leaf    The leaf (already a content hash or payload hash)
     */
    function processProof(
        bytes32[] calldata proof,
        bool[] calldata isRight,
        bytes32 leaf
    ) internal pure returns (bytes32 computed) {
        uint256 n = proof.length;
        if (n != isRight.length) revert ProofLengthMismatch(n, isRight.length);
        if (n > MAX_PROOF_LENGTH) revert ProofTooLong(n, MAX_PROOF_LENGTH);

        computed = _hashLeaf(leaf);

        unchecked {
            for (uint256 i; i < n; ++i) {
                bytes32 s = proof[i];
                computed = isRight[i] ? _hashNode(computed, s) : _hashNode(s, computed);
            }
        }
    }

    /**
     * @notice Verify ordered proof (calldata/bool positions).
     */
    function verify(
        bytes32[] calldata proof,
        bool[] calldata isRight,
        bytes32 root,
        bytes32 leaf
    ) internal pure returns (bool) {
        return processProof(proof, isRight, leaf) == root;
    }

    /*//////////////////////////////////////////////////////////////
                  PROCESS (BITFIELD ENCODING) — CALLDATA VERSION
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Compute root from ordered proof (calldata/bitfield positions, LSB-first).
     * @param leaf       The leaf
     * @param proof      Sibling hashes (calldata)
     * @param positions  Bitfield: bit i = 1 means sibling at proof[i] is on the RIGHT
     */
    function processProof(
        bytes32 leaf,
        bytes32[] calldata proof,
        uint256 positions
    ) internal pure returns (bytes32 computed) {
        uint256 n = proof.length;
        if (n > MAX_PROOF_LENGTH) revert ProofTooLong(n, MAX_PROOF_LENGTH);

        // Mask out unused higher bits for robustness
        if (n < 256) {
            unchecked {
                uint256 mask = (uint256(1) << n) - 1;
                positions &= mask;
            }
        }

        computed = _hashLeaf(leaf);

        unchecked {
            for (uint256 i; i < n; ++i) {
                bool isRight = (positions >> i) & 1 == 1;
                bytes32 s = proof[i];
                computed = isRight ? _hashNode(computed, s) : _hashNode(s, computed);
            }
        }
    }

    /**
     * @notice Verify ordered proof (calldata/bitfield positions, LSB-first).
     */
    function verify(
        bytes32 leaf,
        bytes32[] calldata proof,
        uint256 positions,
        bytes32 root
    ) internal pure returns (bool) {
        return processProof(leaf, proof, positions) == root;
    }

    /*//////////////////////////////////////////////////////////////
                     OPTIONAL MEMORY OVERLOADS (ERGONOMICS)
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Compute root from ordered proof (memory/bool positions).
     *         Handy for internal contexts; prefer calldata overload when possible.
     */
    function processProofMem(
        bytes32[] memory proof,
        bool[] memory isRight,
        bytes32 leaf
    ) internal pure returns (bytes32 computed) {
        uint256 n = proof.length;
        if (n != isRight.length) revert ProofLengthMismatch(n, isRight.length);
        if (n > MAX_PROOF_LENGTH) revert ProofTooLong(n, MAX_PROOF_LENGTH);

        computed = _hashLeaf(leaf);
        unchecked {
            for (uint256 i; i < n; ++i) {
                computed = isRight[i] ? _hashNode(computed, proof[i]) : _hashNode(proof[i], computed);
            }
        }
    }

    /**
     * @notice Compute root from ordered proof (memory/bitfield positions, LSB-first).
     */
    function processProofMem(
        bytes32 leaf,
        bytes32[] memory proof,
        uint256 positions
    ) internal pure returns (bytes32 computed) {
        uint256 n = proof.length;
        if (n > MAX_PROOF_LENGTH) revert ProofTooLong(n, MAX_PROOF_LENGTH);

        if (n < 256) {
            unchecked {
                uint256 mask = (uint256(1) << n) - 1;
                positions &= mask;
            }
        }

        computed = _hashLeaf(leaf);
        unchecked {
            for (uint256 i; i < n; ++i) {
                bool isRight = (positions >> i) & 1 == 1;
                computed = isRight ? _hashNode(computed, proof[i]) : _hashNode(proof[i], computed);
            }
        }
    }

    /**
     * @notice Verify (memory/bool positions).
     */
    function verifyMem(
        bytes32[] memory proof,
        bool[] memory isRight,
        bytes32 root,
        bytes32 leaf
    ) internal pure returns (bool) {
        return processProofMem(proof, isRight, leaf) == root;
    }

    /**
     * @notice Verify (memory/bitfield positions).
     */
    function verifyMem(
        bytes32 leaf,
        bytes32[] memory proof,
        uint256 positions,
        bytes32 root
    ) internal pure returns (bool) {
        return processProofMem(leaf, proof, positions) == root;
    }

    /*//////////////////////////////////////////////////////////////
                          CONVENIENCE HELPERS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Produce a leaf hash from arbitrary payload with domain tag.
     *         Use this to standardize leaf creation across your app.
     */
    function leafOf(bytes memory data) internal pure returns (bytes32) {
        // keccak256(0x00 || data)
        bytes32 out;
        assembly {
            // Compute keccak256 over [prefix(1) | data(len)]
            // Write prefix at free memory, then copy `data` after it.
            let p := mload(0x40) // free mem ptr
            mstore8(p, 0x00)
            let d := add(data, 0x20)
            let len := mload(data)
            // copy `data` to p+1
            // memcpy loop
            for { let o := 0 } lt(o, len) { o := add(o, 0x20) } {
                mstore(add(add(p, 1), o), mload(add(d, o)))
            }
            out := keccak256(p, add(len, 1))
            // restore free mem pointer (no allocation kept)
        }
        return out;
    }
}
