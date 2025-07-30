// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title PingFacet
 * @notice Minimal facet for smoke testing the route system
 */
contract PingFacet {
    /**
     * @dev Simple ping function for testing
     * @return The function selector for verification
     */
    function ping() external pure returns (bytes4) {
        return 0x5dfc5e9a; // bytes4(keccak256("ping()"))
    }

    /**
     * @dev Echo function for testing with parameters
     * @param data The data to echo back
     * @return The same data that was passed in
     */
    function echo(bytes32 data) external pure returns (bytes32) {
        return data;
    }
}
