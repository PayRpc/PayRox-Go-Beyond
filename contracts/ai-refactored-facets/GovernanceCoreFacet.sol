// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../utils/LibDiamond.sol";

/// ---------- Errors ----------
error NotInitialized();
error AlreadyInitialized();
error Paused();
error Unauthorized();
error InvalidParam();
error Reentrancy();

/// ---------- Types ----------
enum ProposalStatus { PENDING, ACTIVE, SUCCEEDED, DEFEATED, EXECUTED }

struct Proposal {
    string description;
    address proposer;
    uint256 votesFor;
    uint256 votesAgainst;
    uint256 deadline;
    bool executed;
    ProposalStatus status;
}

// ---------- Storage ----------
bytes32 constant GOVERNANCE_CORE_SLOT = keccak256("payrox.facet.governancecore.v1");

struct GovernanceCoreLayout {
    // governance
    mapping(address => uint256) votingPower;
    mapping(uint256 => Proposal) proposals;
    mapping(address => mapping(uint256 => bool)) hasVoted;
    uint256 proposalCount;
    uint256 votingDelay;   // seconds after create before voting opens
    uint256 votingPeriod;  // seconds voting stays open
    uint256 quorumVotes;

    // lifecycle & security
    bool initialized;
    bool paused;
    address operator;
    uint8  version;
    uint256 _reentrancy; // 1=unlocked, 2=locked
}

function _g() pure returns (GovernanceCoreLayout storage l) {
    bytes32 slot = GOVERNANCE_CORE_SLOT;
    assembly { l.slot := slot }
}

/**
 * @title GovernanceCoreFacet
 * @notice Minimal governance core facet with weighted voting
 * @dev Facet-safe: namespaced storage, custom reentrancy, dispatcher gating
 */
contract GovernanceCoreFacet {

    /// ---------- Events ----------
    event GovernanceCoreFacetInitialized(address indexed operator, uint256 timestamp);
    event PauseStatusChanged(bool paused);
    event ProposalCreated(uint256 indexed proposalId, address indexed proposer, string description);
    event VoteCast(address indexed voter, uint256 indexed proposalId, bool support, uint256 weight);

    /// ---------- Modifiers ----------
    modifier onlyDispatcher() {
        LibDiamond.enforceManifestCall();
        _;
    }
    modifier onlyOperator() {
        if (msg.sender != _g().operator) revert Unauthorized();
        _;
    }
    modifier whenInitialized() {
        if (!_g().initialized) revert NotInitialized();
        _;
    }
    modifier whenNotPaused() {
        if (_g().paused) revert Paused();
        _;
    }
    modifier nonReentrant() {
        GovernanceCoreLayout storage l = _g();
        if (l._reentrancy == 2) revert Reentrancy();
        l._reentrancy = 2; _;
        l._reentrancy = 1;
    }

    /// ---------- Initialization (no constructor) ----------
    function initializeGovernanceCoreFacet(
        address operator_,
        uint256 votingDelay_,
        uint256 votingPeriod_,
        uint256 quorumVotes_
    ) external onlyDispatcher {
        if (operator_ == address(0)) revert Unauthorized();
        GovernanceCoreLayout storage l = _g();
        if (l.initialized) revert AlreadyInitialized();

        l.initialized   = true;
        l.operator      = operator_;
        l.version       = 1;
        l.paused        = false;
        l._reentrancy   = 1;

        // sensible defaults if 0 provided
        l.votingDelay   = votingDelay_  == 0 ? 0 days : votingDelay_;
        l.votingPeriod  = votingPeriod_ == 0 ? 3 days : votingPeriod_;
        l.quorumVotes   = quorumVotes_  == 0 ? 1 : quorumVotes_;

        emit GovernanceCoreFacetInitialized(operator_, block.timestamp);
    }

    /// ---------- Admin (operator-gated, via dispatcher) ----------
    function setPaused(bool p) external onlyDispatcher onlyOperator whenInitialized {
        _g().paused = p;
        emit PauseStatusChanged(p);
    }

    function setVotingParams(uint256 votingDelay_, uint256 votingPeriod_, uint256 quorumVotes_)
        external onlyDispatcher onlyOperator whenInitialized
    {
        GovernanceCoreLayout storage l = _g();
        l.votingDelay  = votingDelay_;
        l.votingPeriod = votingPeriod_;
        l.quorumVotes  = quorumVotes_;
    }

    function setVotingPower(address account, uint256 power)
        external onlyDispatcher onlyOperator whenInitialized
    {
        _g().votingPower[account] = power;
    }

    /// ---------- Core Logic ----------
    function createProposal(string calldata description)
        external onlyDispatcher whenInitialized whenNotPaused nonReentrant
        returns (uint256 id)
    {
        if (bytes(description).length == 0) revert InvalidParam();

        GovernanceCoreLayout storage l = _g();
        id = l.proposalCount++;

        uint256 deadline = block.timestamp + l.votingDelay + l.votingPeriod;
        l.proposals[id] = Proposal({
            description: description,
            proposer: msg.sender,
            votesFor: 0,
            votesAgainst: 0,
            deadline: deadline,
            executed: false,
            status: ProposalStatus.ACTIVE
        });

        emit ProposalCreated(id, msg.sender, description);
    }

    function vote(uint256 proposalId, bool support)
        external onlyDispatcher whenInitialized whenNotPaused nonReentrant
    {
        GovernanceCoreLayout storage l = _g();
        if (proposalId >= l.proposalCount) revert InvalidParam();

        Proposal storage p = l.proposals[proposalId];
        if (block.timestamp > p.deadline) revert InvalidParam();
        if (l.hasVoted[msg.sender][proposalId]) revert Unauthorized();

        uint256 weight = l.votingPower[msg.sender];
        if (weight == 0) revert Unauthorized();

        l.hasVoted[msg.sender][proposalId] = true;
        if (support) { p.votesFor += weight; } else { p.votesAgainst += weight; }

        emit VoteCast(msg.sender, proposalId, support, weight);
    }

    /// ---------- Views ----------
    function isGovernanceCoreFacetInitialized() external view returns (bool) { return _g().initialized; }
    function getGovernanceCoreFacetVersion() external view returns (uint8) { return _g().version; }
    function isGovernanceCoreFacetPaused() external view returns (bool) { return _g().paused; }

    /// ---------- Manifest/Tooling helper ----------
    function getFacetInfo()
        external
        pure
        returns (string memory name, string memory version, bytes4[] memory selectors)
    {
        name = "GovernanceCore";
        version = "1.0.0";

        // exactly 6 selectors (no zeros)
        selectors = new bytes4[](6);
        uint256 i;
        selectors[i++] = this.initializeGovernanceCoreFacet.selector;
        selectors[i++] = this.setPaused.selector;
        selectors[i++] = this.setVotingParams.selector;
        selectors[i++] = this.setVotingPower.selector;
        selectors[i++] = this.createProposal.selector;
        selectors[i++] = this.vote.selector;
    }
}