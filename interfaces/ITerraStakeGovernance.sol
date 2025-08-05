// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ITerraStakeGovernance
 * @dev Minimal interface for TerraStake governance functionality
 */
interface ITerraStakeGovernance {
    function propose(string memory description) external returns (uint256);
    function vote(uint256 proposalId, bool support) external;
    function execute(uint256 proposalId) external;
}
