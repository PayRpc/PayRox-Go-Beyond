// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IChunkFactory} from "../factory/interfaces/IChunkFactory.sol";

contract InterfaceIdHelper {
    function chunkFactoryInterfaceId() external pure returns (bytes4) {
        return type(IChunkFactory).interfaceId;
    }

    function selector_isDeployed() external pure returns (bytes4) {
        return IChunkFactory.isDeployed.selector;
    }
}
