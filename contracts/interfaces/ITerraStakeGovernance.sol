// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.28;

/**
 * @title ITerraStakeGovernance
 * @notice Interface for governance functionality
 */
interface ITerraStakeGovernance {
    function recordVote(uint256 proposalId, address voter, uint256 votingPower, bool support) external;
    function createProposal(
        uint256 nonce,
        address proposer,
        string calldata description,
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata calldatas
    ) external returns (uint256);
    function getProposal(uint256 proposalId) external view returns (
        address proposer,
        string memory description,
        uint256 voteCount,
        bool executed
    );
    function executeProposal(uint256 proposalId) external;
}
