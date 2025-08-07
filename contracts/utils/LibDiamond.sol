// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/**
 * @title IDiamondLoupe
 * @notice PayRox Go Beyond manifest-based facet introspection interface
 * @dev Enhanced with:
 *       - Versioned facet metadata
 *       - Security flags for dangerous selectors
 *       - Cross-facet dependency tracking
 *       - Gas-optimized batch queries
 */
interface IDiamondLoupe {
    struct Facet {
        address facetAddress;
        bytes4[] functionSelectors;
        bytes32 versionTag;
        uint8 securityLevel; // 0=untrusted, 1=user, 2=admin, 3=system
    }

    struct FacetCut {
        address facetAddress;
        uint8 action;  // 0=add, 1=replace, 2=remove
        bytes4[] functionSelectors;
        bytes32 salt; // Manifest-specific deployment salt
    }

    struct FacetMetadata {
        string name;
        string category;
        string[] dependencies;
        bool isUpgradeable;
    }

    /// @notice Emitted when manifest detects selector conflict
    event SelectorConflict(bytes4 selector, address existingFacet, address newFacet);

    /**
     * @notice Gets all facet addresses with optional filter
     * @param includeUnsafe Whether to include facets marked as untrusted
     * @return facetAddresses_ Filtered array of facet addresses
     */
    function facetAddresses(bool includeUnsafe)
        external
        view
        returns (address[] memory facetAddresses_);

    /**
     * @notice Gets function selectors with security filtering
     * @param _facet The facet address
     * @param minSecurityLevel Minimum required security level (0-3)
     * @return selectors_ Filtered array of function selectors
     */
    function facetFunctionSelectors(
        address _facet,
        uint8 minSecurityLevel
    ) external view returns (bytes4[] memory selectors_);

    /**
     * @notice Get all facets with metadata
     * @param includeMetadata Whether to include extended metadata
     * @return facets_ Array of Facet structs with optional metadata
     */
    function facets(bool includeMetadata)
        external
        view
        returns (Facet[] memory facets_);

    /**
     * @notice Resolves facet address with version check
     * @param _functionSelector The function selector
     * @param requiredVersion Minimum required version tag (bytes32(0) for any)
     * @return facetAddress_ The facet address meeting version requirements
     */
    function facetAddress(
        bytes4 _functionSelector,
        bytes32 requiredVersion
    ) external view returns (address facetAddress_);

    /**
     * @notice Batch resolve multiple selectors
     * @param _functionSelectors Array of function selectors
     * @return facetAddresses_ Corresponding facet addresses
     */
    function facetAddressesBatch(
        bytes4[] calldata _functionSelectors
    ) external view returns (address[] memory facetAddresses_);

    /**
     * @notice Get facet metadata
     * @param _facet The facet address
     * @return metadata_ Structured facet metadata
     */
    function facetMetadata(address _facet)
        external
        view
        returns (FacetMetadata memory metadata_);

    /**
     * @notice Check for storage slot conflicts
     * @dev Returns conflicting facets and slots
     * @param _facet The facet address to check
     * @return conflicts_ Array of slot hashes with conflicting facets
     */
    function checkStorageConflicts(address _facet)
        external
        view
        returns (bytes32[] memory conflicts_);

    /**
     * @notice Get implementation address for proxy facets
     * @param _facet The facet proxy address
     * @return implementation_ The current implementation address
     */
    function facetImplementation(address _facet)
        external
        view
        returns (address implementation_);
}
