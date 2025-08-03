// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/**
 * @title IDiamondLoupe
 * @notice PayRox Go Beyond manifest-based facet introspection interface
 * @dev NON-STANDARD: Provides limited compatibility with diamond ecosystem while maintaining
 *      PayRox's unique manifest-based architecture with isolated facet storage
 */
interface IDiamondLoupe {
    struct Facet {
        address facetAddress;
        bytes4[] functionSelectors;
    }

    struct FacetCut {
        address facetAddress;
        uint8 action;  // 0=add, 1=replace, 2=remove (legacy compatibility only)
        bytes4[] functionSelectors;
    }

    /**
     * @notice Gets all facet addresses used by the manifest dispatcher
     * @dev NON-STANDARD: Returns facets deployed via PayRox manifest system
     * @return facetAddresses_ Array of facet addresses
     */
    function facetAddresses() external view returns (address[] memory facetAddresses_);

    /**
     * @notice Gets all the function selectors provided by a facet
     * @dev NON-STANDARD: Returns selectors from manifest routing, not traditional diamond cuts
     * @param _facet The facet address
     * @return facetFunctionSelectors_ Array of function selectors
     */
    function facetFunctionSelectors(address _facet)
        external
        view
        returns (bytes4[] memory facetFunctionSelectors_);

    /**
     * @notice Get all the facets and their selectors from current manifest
     * @dev NON-STANDARD: Returns current manifest state, not diamond cuts
     * @return facets_ Array of Facet structs
     */
    function facets() external view returns (Facet[] memory facets_);

    /**
     * @notice Gets the facet that supports the given selector in current manifest
     * @dev NON-STANDARD: Resolves via manifest routes, not diamond storage
     * @param _functionSelector The function selector
     * @return facetAddress_ The facet address (or address(0) if not found)
     */
    function facetAddress(bytes4 _functionSelector)
        external
        view
        returns (address facetAddress_);
}
