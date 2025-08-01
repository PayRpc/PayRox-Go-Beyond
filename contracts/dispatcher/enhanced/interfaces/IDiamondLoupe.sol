// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IDiamondLoupe
 * @notice Diamond standard loupe interface for facet introspection
 * @dev Provides compatibility with diamond ecosystem tooling
 */
interface IDiamondLoupe {
    struct Facet {
        address facetAddress;
        bytes4[] functionSelectors;
    }

    struct FacetCut {
        address facetAddress;
        uint8 action;  // 0=add, 1=replace, 2=remove
        bytes4[] functionSelectors;
    }

    /**
     * @notice Gets all facet addresses used by a diamond
     * @return facetAddresses_ Array of facet addresses
     */
    function facetAddresses() external view returns (address[] memory facetAddresses_);

    /**
     * @notice Gets all the function selectors provided by a facet
     * @param _facet The facet address
     * @return facetFunctionSelectors_ Array of function selectors
     */
    function facetFunctionSelectors(address _facet)
        external
        view
        returns (bytes4[] memory facetFunctionSelectors_);

    /**
     * @notice Get all the facets and their selectors
     * @return facets_ Array of Facet structs
     */
    function facets() external view returns (Facet[] memory facets_);

    /**
     * @notice Gets the facet that supports the given selector
     * @param _functionSelector The function selector
     * @return facetAddress_ The facet address
     */
    function facetAddress(bytes4 _functionSelector)
        external
        view
        returns (address facetAddress_);
}
