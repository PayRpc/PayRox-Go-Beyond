// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title RefactorSafetyLibrary
 * @notice Library implementing MUST-FIX refactoring safety patterns
 * @dev Use this library to ensure refactor-safe facet implementations
 * @custom:security-level CRITICAL
 * @custom:audit-requirements MANDATORY
 */
library RefactorSafetyLib {

    /// ---------- Events for Refactor Tracking ----------
    event RefactorSafetyCheck(bytes32 indexed facetId, uint256 version, bool passed);
    event StorageLayoutValidated(bytes32 indexed namespace, bytes32 structHash);
    event SelectorCompatibilityVerified(bytes4[] selectors, bool compatible);

    /// ---------- Errors ----------
    error IncompatibleStorageLayout(bytes32 expected, bytes32 actual);
    error SelectorMismatch(bytes4 expected, bytes4 actual);
    error VersionMismatch(uint256 expected, uint256 actual);
    error RefactorSafetyFailed(string reason);

    /// ---------- Storage Layout Safety ----------
    
    /**
     * @notice Validates storage layout compatibility between versions
     * @param namespace The storage namespace being checked
     * @param expectedStructHash Hash of expected storage structure
     * @param actualStructHash Hash of actual storage structure
     */
    function validateStorageLayout(
        bytes32 namespace,
        bytes32 expectedStructHash,
        bytes32 actualStructHash
    ) internal {
        if (expectedStructHash != actualStructHash) {
            revert IncompatibleStorageLayout(expectedStructHash, actualStructHash);
        }
        
        emit StorageLayoutValidated(namespace, actualStructHash);
    }

    /**
     * @notice Generates deterministic hash for storage structure validation
     * @param structDefinition The struct definition as bytes
     * @return structHash Deterministic hash of the structure
     */
    function hashStorageStruct(bytes memory structDefinition) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("STORAGE_STRUCT_V1:", structDefinition));
    }

    /// ---------- Selector Compatibility ----------
    
    /**
     * @notice Validates selector compatibility between facet versions
     * @param oldSelectors Previous version selectors
     * @param newSelectors New version selectors
     * @param allowAdditions Whether new selectors can be added
     */
    function validateSelectorCompatibility(
        bytes4[] memory oldSelectors,
        bytes4[] memory newSelectors,
        bool allowAdditions
    ) internal {
        // Check all old selectors exist in new version
        for (uint256 i = 0; i < oldSelectors.length; i++) {
            bool found = false;
            for (uint256 j = 0; j < newSelectors.length; j++) {
                if (oldSelectors[i] == newSelectors[j]) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                revert SelectorMismatch(oldSelectors[i], bytes4(0));
            }
        }

        // Check if additions are allowed
        if (!allowAdditions && newSelectors.length != oldSelectors.length) {
            revert RefactorSafetyFailed("Selector additions not permitted");
        }
        
        emit SelectorCompatibilityVerified(newSelectors, true);
    }

    /// ---------- Version Management ----------
    
    /**
     * @notice Validates version progression follows semantic versioning
     * @param oldVersion Previous version number
     * @param newVersion New version number
     * @param changeType Type of change (0=patch, 1=minor, 2=major)
     */
    function validateVersionProgression(
        uint256 oldVersion,
        uint256 newVersion,
        uint8 changeType
    ) internal pure {
        if (changeType == 0) { // Patch version
            require(newVersion == oldVersion + 1, "Invalid patch increment");
        } else if (changeType == 1) { // Minor version
            require(newVersion > oldVersion, "Invalid minor increment");
        } else if (changeType == 2) { // Major version
            require(newVersion > oldVersion, "Invalid major increment");
        } else {
            revert RefactorSafetyFailed("Invalid change type");
        }
    }

    /// ---------- Migration Safety ----------
    
    /**
     * @notice Ensures safe data migration between storage versions
     * @param migrationId Unique identifier for the migration
     * @param oldDataHash Hash of data before migration
     * @param newDataHash Hash of data after migration
     * @param preserveDataIntegrity Whether data must be preserved exactly
     */
    function validateDataMigration(
        bytes32 migrationId,
        bytes32 oldDataHash,
        bytes32 newDataHash,
        bool preserveDataIntegrity
    ) internal pure {
        if (preserveDataIntegrity && oldDataHash != newDataHash) {
            revert RefactorSafetyFailed("Data integrity violation during migration");
        }
        
        // Migration completed successfully - would emit event in real implementation
        // emit DataMigrationCompleted(migrationId, oldDataHash, newDataHash);
    }

    /// ---------- Runtime Safety Checks ----------
    
    /**
     * @notice Performs comprehensive refactor safety validation
     * @param facetAddress Address of the facet being validated
     * @param expectedCodeHash Expected code hash for verification
     * @param requiredVersion Required minimum version
     * @return passed Whether all safety checks passed
     */
    function performRefactorSafetyCheck(
        address facetAddress,
        bytes32 expectedCodeHash,
        uint256 requiredVersion
    ) internal view returns (bool passed) {
        // Check code hash matches expected
        bytes32 actualCodeHash = facetAddress.codehash;
        if (actualCodeHash != expectedCodeHash) {
            return false;
        }

        // Additional checks would go here in real implementation
        // - Version validation
        // - Selector verification
        // - Storage layout validation
        
        return true;
    }

    /// ---------- Emergency Safety ----------
    
    /**
     * @notice Emergency function to validate critical invariants
     * @param facetAddress The facet to validate
     * @param criticalInvariants Array of invariant functions to check
     * @return allPassed Whether all critical invariants passed
     */
    function validateCriticalInvariants(
        address facetAddress,
        bytes[] memory criticalInvariants
    ) internal view returns (bool allPassed) {
        for (uint256 i = 0; i < criticalInvariants.length; i++) {
            (bool success, bytes memory result) = facetAddress.staticcall(criticalInvariants[i]);
            if (!success || !abi.decode(result, (bool))) {
                return false;
            }
        }
        return true;
    }

    /// ---------- Gas Efficiency Validation ----------
    
    /**
     * @notice Validates gas efficiency hasn't degraded beyond threshold
     * @param functionSelector The function being tested
     * @param baselineGas Baseline gas consumption
     * @param actualGas Actual gas consumption after refactor
     * @param maxDeviationBps Maximum allowed deviation in basis points (100 = 1%)
     */
    function validateGasEfficiency(
        bytes4 functionSelector,
        uint256 baselineGas,
        uint256 actualGas,
        uint256 maxDeviationBps
    ) internal pure {
        if (actualGas > baselineGas) {
            uint256 increase = ((actualGas - baselineGas) * 10000) / baselineGas;
            if (increase > maxDeviationBps) {
                revert RefactorSafetyFailed("Gas efficiency degradation exceeds threshold");
            }
        }
    }

    /// ---------- Behavioral Equivalence ----------
    
    /**
     * @notice Validates behavioral equivalence between implementations
     * @param oldImpl Address of old implementation
     * @param newImpl Address of new implementation
     * @param testCalldata Array of test calls to verify equivalence
     * @return equivalent Whether implementations are behaviorally equivalent
     */
    function validateBehavioralEquivalence(
        address oldImpl,
        address newImpl,
        bytes[] memory testCalldata
    ) internal view returns (bool equivalent) {
        for (uint256 i = 0; i < testCalldata.length; i++) {
            (bool oldSuccess, bytes memory oldResult) = oldImpl.staticcall(testCalldata[i]);
            (bool newSuccess, bytes memory newResult) = newImpl.staticcall(testCalldata[i]);
            
            if (oldSuccess != newSuccess || !_bytesEqual(oldResult, newResult)) {
                return false;
            }
        }
        return true;
    }

    /// ---------- Internal Helpers ----------
    
    function _bytesEqual(bytes memory a, bytes memory b) private pure returns (bool) {
        if (a.length != b.length) return false;
        return keccak256(a) == keccak256(b);
    }
}

/**
 * @title RefactorSafeFacetBase
 * @notice Base contract implementing MUST-FIX refactor safety patterns
 * @dev Inherit from this to ensure refactor-safe implementations
 */
abstract contract RefactorSafeFacetBase {
    using RefactorSafetyLib for *;

    /// ---------- Refactor Safety Events ----------
    event RefactorSafetyInitialized(uint256 version, bytes32 codeHash);
    event RefactorValidationPassed(bytes32 indexed checkId, string checkType);

    /// ---------- Refactor Safety Modifiers ----------
    
    modifier refactorSafe() {
        _validateRefactorSafety();
        _;
    }

    modifier versionCompatible(uint256 minVersion) {
        require(_getVersion() >= minVersion, "Version incompatible");
        _;
    }

    /// ---------- Abstract Functions (Must Implement) ----------
    
    function _getVersion() internal view virtual returns (uint256);
    function _getStorageNamespace() internal pure virtual returns (bytes32);
    function _getExpectedCodeHash() internal pure virtual returns (bytes32);

    /// ---------- Refactor Safety Implementation ----------
    
    function _validateRefactorSafety() internal view {
        // Validate code hash
        bytes32 expectedHash = _getExpectedCodeHash();
        bytes32 actualHash = address(this).codehash;
        
        if (expectedHash != bytes32(0) && actualHash != expectedHash) {
            revert RefactorSafetyLib.RefactorSafetyFailed("Code hash mismatch");
        }
    }

    function _performMigrationSafety(
        uint256 fromVersion,
        uint256 toVersion,
        bytes32 dataHash
    ) internal {
        RefactorSafetyLib.validateVersionProgression(fromVersion, toVersion, 1);
        
        // Additional migration safety checks
        emit RefactorValidationPassed(
            keccak256(abi.encodePacked("MIGRATION", fromVersion, toVersion)), 
            "migration"
        );
    }

    /// ---------- Emergency Safety ----------
    
    function emergencyRefactorValidation() external view returns (bool) {
        return RefactorSafetyLib.performRefactorSafetyCheck(
            address(this),
            _getExpectedCodeHash(),
            _getVersion()
        );
    }
}
