// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {RefactorSafetyLib} from "../libraries/RefactorSafetyLib.sol";

/**
 * @title RefactorSafetyHarness
 * @notice Thin wrappers around RefactorSafetyLib for use in tests and preflight scripts.
 * @dev Not intended for production deployment; provides external access to internal helpers.
 */
contract RefactorSafetyHarness {
    using RefactorSafetyLib for *;

    event Ok();

    function computeStructHash(bytes calldata defn) external pure returns (bytes32) {
        return RefactorSafetyLib.hashStorageStruct(defn);
    }

    function validateStorage(bytes32 ns, bytes32 expected, bytes32 actual) external {
        RefactorSafetyLib.validateStorageLayout(ns, expected, actual);
        emit Ok();
    }

    function validateSelectors(bytes4[] calldata oldSels, bytes4[] calldata newSels, bool allowAdditions) external {
        // copy to memory for library call
        bytes4[] memory a = oldSels;
        bytes4[] memory b = newSels;
        RefactorSafetyLib.validateSelectorCompatibility(a, b, allowAdditions);
        emit Ok();
    }

    function validateGas(bytes4 /*sel*/, uint256 baselineGas, uint256 actualGas, uint256 maxDeviationBps)
        external
        pure
        returns (bool)
    {
        RefactorSafetyLib.validateGasEfficiency(bytes4(0), baselineGas, actualGas, maxDeviationBps);
        return true;
    }

    function safetyCheck(address facet, bytes32 expectedCodeHash, uint256 version) external view returns (bool) {
        return RefactorSafetyLib.performRefactorSafetyCheck(facet, expectedCodeHash, version);
    }
}
