// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title PingFacet
 * @dev Simple test facet for communication testing
 */
contract PingFacet {
    event Ping(address sender, uint256 timestamp);
    
    function ping() external {
        emit Ping(msg.sender, block.timestamp);
    }
}