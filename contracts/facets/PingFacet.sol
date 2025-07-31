// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @title PingFacet - minimal facet for smoke tests & EXTCODEHASH routing checks
/// @notice Returns its canonical selector and echoes input. No storage; tiny runtime.
interface IPingFacet {
    /// @return s The function selector of ping() to verify routing correctness
    function ping() external pure returns (bytes4 s);

    /// @notice Echoes the input back verbatim (handy for calldata/ABI tests)
    function echo(bytes32 data) external pure returns (bytes32);
}

/// @dev Standardized revert used by fallbacks; helpful for direct-call diagnostics.
error UnknownSelector(bytes4 selector);

contract PingFacet is IPingFacet {
    /// @dev Canonical selector for "ping()"
    /// bytes4(keccak256("ping()")) == 0x5c36b186
    bytes4 public constant PING_SELECTOR = 0x5c36b186;

    /// @inheritdoc IPingFacet
    function ping() external pure returns (bytes4 s) {
        // Return the canonical selector directly
        return PING_SELECTOR;
    }

    /// @inheritdoc IPingFacet
    function echo(bytes32 data) external pure returns (bytes32) {
        return data;
    }

    /// @dev Reject unknown selectors on direct calls (dispatcher never hits this on valid routes).
    fallback() external payable {
        revert UnknownSelector(msg.sig);
    }

    /// @dev Reject stray ETH transfers.
    receive() external payable {
        revert UnknownSelector(0xffffffff);
    }
}
