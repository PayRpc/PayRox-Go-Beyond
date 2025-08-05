// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/**
 * @title IVRFCoordinator
 * @dev Interface for Chainlink VRF Coordinator
 */
interface IVRFCoordinator {
    function requestRandomWords(
        bytes32 keyHash,
        uint64 subId,
        uint16 minimumRequestConfirmations,
        uint32 callbackGasLimit,
        uint32 numWords
    ) external returns (uint256 requestId);
}
