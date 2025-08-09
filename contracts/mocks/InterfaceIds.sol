// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IManifestDispatcher} from "../dispatcher/interfaces/IManifestDispatcher.sol";
import {IDiamondLoupe} from "../interfaces/diamond/IDiamondLoupe.sol";

contract InterfaceIds {
    function idManifestDispatcher() external pure returns (bytes4) {
        return type(IManifestDispatcher).interfaceId;
    }
    function idDiamondLoupe() external pure returns (bytes4) {
        return type(IDiamondLoupe).interfaceId;
    }
}
