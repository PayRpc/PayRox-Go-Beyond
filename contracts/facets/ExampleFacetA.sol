// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title ExampleFacetA
 * @notice Delegatecalled facet routed by a Manifest‑gated dispatcher.
 * @dev Uses a fixed storage slot layout (diamond‑safe). Non‑payable; no external calls.
 */
contract ExampleFacetA {

    /* ───────────────────────────── Errors ───────────────────────────── */
    error EmptyMessage();
    error InvalidKey();
    error EmptyData();
    error DataTooLarge();
    error TooManyMessages();

    /* ─────────────────────── Gas / L2‑friendly caps ─────────────────── */
    uint256 private constant MAX_DATA_BYTES = 4096; // per-key bound
    uint256 private constant MAX_MESSAGES   = 10;   // batch bound

    /* ───────────────────────────── Events ────────────────────────────── */
    // Emit a hash to keep logs light; include size + setter for auditability.
    event DataStored(bytes32 indexed key, bytes32 indexed dataHash, uint256 size, address indexed setter);
    // Retain the readable message event for parity with your prior API.
    event FacetAExecuted(address indexed caller, uint256 indexed value, string message);

    /* ─────────────── Diamond‑safe storage (fixed slot) ──────────────── */
    // Unique slot for this facet’s state.
    bytes32 private constant _SLOT = keccak256("payrox.facets.exampleA.v1");

    struct Layout {
        mapping(bytes32 => bytes) data;     // bounded by MAX_DATA_BYTES
        mapping(address => uint256) userCounts;
        uint256 totalExecutions_;
        address lastCaller_;
    }

    function _layout() private pure returns (Layout storage l) {
        bytes32 slot = _SLOT;
        assembly { l.slot := slot }
    }

    /* ───────────────────────────── API ──────────────────────────────── */

    /// Execute an action and emit a human‑readable message.
    function executeA(string calldata message) external returns (bool success) {
        if (bytes(message).length == 0) revert EmptyMessage();

        Layout storage l = _layout();
        unchecked {
            l.userCounts[msg.sender] += 1;
            l.totalExecutions_ += 1;
        }
        l.lastCaller_ = msg.sender;

        emit FacetAExecuted(msg.sender, 0, message);
        return true;
    }

    /// Store bounded bytes under a key; emits a hashed event for gas savings.
    function storeData(bytes32 key, bytes calldata data_) external {
        if (key == bytes32(0)) revert InvalidKey();
        if (data_.length == 0) revert EmptyData();
        if (data_.length > MAX_DATA_BYTES) revert DataTooLarge();

        Layout storage l = _layout();
        l.data[key] = data_;
        emit DataStored(key, keccak256(data_), data_.length, msg.sender);
    }

    /// Read stored data.
    function getData(bytes32 key) external view returns (bytes memory data) {
        return _layout().data[key];
    }

    /// Per‑user execution count.
    function getUserCount(address user) external view returns (uint256 count) {
        return _layout().userCounts[user];
    }

    /// Batch execute bounded messages.
    function batchExecute(string[] calldata messages) external returns (bool[] memory results) {
        uint256 n = messages.length;
        if (n == 0) revert EmptyMessage();
        if (n > MAX_MESSAGES) revert TooManyMessages();

        Layout storage l = _layout();
        results = new bool[](n);

        for (uint256 i; i < n; ) {
            if (bytes(messages[i]).length > 0) {
                unchecked {
                    l.userCounts[msg.sender] += 1;
                    l.totalExecutions_ += 1;
                }
                emit FacetAExecuted(msg.sender, 0, messages[i]);
                results[i] = true;
            } else {
                results[i] = false;
            }
            unchecked { ++i; }
        }

        l.lastCaller_ = msg.sender;
    }

    /// Keccak256 convenience hash.
    function calculateHash(bytes calldata input) external pure returns (bytes32 hash) {
        return keccak256(input);
    }

    /// Personal‑sign verification (EIP‑191 style). For production intents, prefer an EIP‑712 facet.
    function verifySignature(
        bytes32 hash,
        bytes calldata signature,
        address expectedSigner
    ) external pure returns (bool isValid) {
        if (signature.length != 65 || expectedSigner == address(0)) return false;
        bytes32 ethSigned = MessageHashUtils.toEthSignedMessageHash(hash);
        address recovered = ECDSA.recover(ethSigned, signature);
        return recovered == expectedSigner;
    }

    /// Backwards‑compatible getters to preserve selectors.
    function totalExecutions() external view returns (uint256) {
        return _layout().totalExecutions_;
    }

    function lastCaller() external view returns (address) {
        return _layout().lastCaller_;
    }

    /// Facet metadata and selector list (for manifest tooling).
    function getFacetInfo()
        external
        pure
        returns (string memory name, string memory version, bytes4[] memory selectors)
    {
        name = "ExampleFacetA";
        version = "1.1.0";

        selectors = new bytes4[](10);
        selectors[0] = this.executeA.selector;
        selectors[1] = this.storeData.selector;
        selectors[2] = this.getData.selector;
        selectors[3] = this.getUserCount.selector;
        selectors[4] = this.batchExecute.selector;
        selectors[5] = this.calculateHash.selector;
        selectors[6] = this.verifySignature.selector;
        selectors[7] = this.totalExecutions.selector;
        selectors[8] = this.lastCaller.selector;
        selectors[9] = this.getFacetInfo.selector;
    }
}
