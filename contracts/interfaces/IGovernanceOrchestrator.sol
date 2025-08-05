// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IGovernanceOrchestrator
 * @dev AI-Generated interface for PayRox Go Beyond
 * @notice This interface is PayRox-compatible and future-ready
 * 
 * Compatibility: PayRox, OpenZeppelin, EIP
 * AI-Generated: Yes
 * PayRox Ready: Yes
 */

interface IGovernanceOrchestrator {
// Custom Errors for Gas Efficiency
error ProposalAlreadyExists(bytes32 proposalId);
error ProposalNotFound(bytes32 proposalId);
error VotingPeriodInvalid(uint256 period);
error VotingEnded(bytes32 proposalId);
error VotingActive(bytes32 proposalId);
error InsufficientVotingPower(address voter, uint256 required);
error ProposalAlreadyExecuted(bytes32 proposalId);
error QuorumNotMet(bytes32 proposalId);
error InvalidQuorumThreshold(uint256 threshold);

// Events
event ProposalCreated(bytes32 indexed, address indexed, string description, uint256 votingDeadline);
event VoteCast(bytes32 indexed, address indexed, bool support, uint256 weight);
event ProposalExecuted(bytes32 indexed, bool success);
event VotingPowerUpdated(address indexed, uint256 oldPower, uint256 newPower);
event QuorumThresholdUpdated(uint256 oldThreshold, uint256 newThreshold);

// Interface Functions
function createProposal(bytes32 proposalId, string calldata, bytes32[] calldata, uint256 votingPeriod) external;
    function castVote(bytes32 proposalId, bool support) external;
    function executeProposal(bytes32 proposalId) external;
    function updateVotingPower(address account, uint256 newPower) external;
    function updateQuorumThreshold(uint256 newThreshold) external;
    function getProposal(bytes32 proposalId) external view returns (ManifestTypes.GovernanceProposal memory);
    function getProposalCount() external view returns (uint256 count);
    function checkProposalStatus(bytes32 proposalId) external view returns (bool hasPassed);
    function emergencyPause() external;
    function emergencyUnpause() external;
}

/**
 * @dev PayRox Integration Notes:
 * - This interface is designed for facet compatibility
 * - All functions are gas-optimized for dispatcher routing
 * - Custom errors used for efficient error handling
 * - Events follow PayRox monitoring standards
 * 
 * Future Enhancement Ready:
 * - Easy to swap with production interface
 * - Maintains signature compatibility
 * - Supports cross-chain deployment
 * - Compatible with CREATE2 deterministic deployment
 */