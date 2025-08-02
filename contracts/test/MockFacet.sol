// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MockFacet
 * @notice Simple mock facet for testing the OptimizedManifestDispatcher
 */
contract MockFacet {

    function mockFunction1() external pure returns (string memory) {
        return "Mock Function 1";
    }

    function mockFunction2() external pure returns (string memory) {
        return "Mock Function 2";
    }

    function getImplementation() external view returns (address) {
        return address(this);
    }
}
