// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title GovernanceFacet
 * @notice PayRox facet following native patterns from ExampleFacetA/B
 * @dev Standalone contract for manifest-dispatcher routing
 */

/// ------------------------
/// Errors (gas-efficient custom errors)
/// ------------------------
error NotInitialized();
error AlreadyInitialized();
error Paused();
error Unauthorized();
error InvalidTokenAddress();
error InsufficientBalance();

/// ------------------------
/// Structs and Types (define before usage, NO visibility keywords)
/// ------------------------
struct Proposal {
    uint256 id;
    address proposer;
    uint256 startTime;
    uint256 endTime;
    uint256 forVotes;
    uint256 againstVotes;
    bool executed;
    string description;
}

/// ------------------------
/// Storage (native pattern: direct slots, no LibDiamond)
/// ------------------------
bytes32 constant STORAGE_SLOT = keccak256("payrox.facet.governance.v1");

struct Layout {
    // Governance state
    mapping(address => uint256) votingPower;
    mapping(uint256 => Proposal) proposals;
    uint256 proposalCount;
    uint256 votingDelay;
    uint256 votingPeriod;
    uint256 quorumVotes;
    
    // Lifecycle management
    bool initialized;
    bool paused;
    address operator;
    uint8 version;
}

contract GovernanceFacet {
    using SafeERC20 for IERC20;

    function _layout() private pure returns (Layout storage l) {
        bytes32 slot = STORAGE_SLOT;
        assembly { l.slot := slot }
    }

    /// ------------------------
    /// Events
    /// ------------------------
    event GovernanceActionExecuted(address indexed user, uint256 amount, uint256 timestamp);
    event GovernanceFacetInitialized(address indexed operator, uint256 timestamp);
    event PauseStatusChanged(bool paused);

    /// ------------------------
    /// Modifiers (native PayRox pattern - facet-owned)
    /// ------------------------
    modifier whenInitialized() {
        if (!_layout().initialized) revert NotInitialized();
        _;
    }

    modifier whenNotPaused() {
        if (_layout().paused) revert Paused();
        _;
    }

    modifier onlyOperator() {
        if (msg.sender != _layout().operator) revert Unauthorized();
        _;
    }

    /// ------------------------
    /// Initialization (no dispatcher enforcement like natives)
    /// ------------------------
    function initializeGovernanceFacet(address operator_) external {
        if (operator_ == address(0)) revert Unauthorized();
        
        Layout storage l = _layout();
        if (l.initialized) revert AlreadyInitialized();
        
        l.initialized = true;
        l.version = 1;
        l.operator = operator_;
        l.paused = false;
        
        emit GovernanceFacetInitialized(operator_, block.timestamp);
    }

    /// ------------------------
    /// Admin Functions (operator-gated like ExampleFacetB)
    /// ------------------------
    function setPaused(bool _paused) external onlyOperator {
        _layout().paused = _paused;
        emit PauseStatusChanged(_paused);
    }

    /// ------------------------
    /// Core Business Logic (native security patterns)
    /// ------------------------
    function createProposal(string calldata description, uint256 votingPeriod_)
        external
        whenInitialized
        whenNotPaused
    {
        if (bytes(description).length == 0) revert Unauthorized();
        
        Layout storage l = _layout();
        l.proposalCount += 1;
        
        l.proposals[l.proposalCount] = Proposal({
            id: l.proposalCount,
            proposer: msg.sender,
            startTime: block.timestamp,
            endTime: block.timestamp + votingPeriod_,
            forVotes: 0,
            againstVotes: 0,
            executed: false,
            description: description
        });
        
        emit GovernanceActionExecuted(msg.sender, l.proposalCount, block.timestamp);
    }

    /// ------------------------
    /// View Functions
    /// ------------------------
    function isGovernanceFacetInitialized() external view returns (bool) {
        return _layout().initialized;
    }

    function getGovernanceFacetVersion() external view returns (uint256) {
        return _layout().version;
    }

    function isGovernanceFacetPaused() external view returns (bool) {
        return _layout().paused;
    }

    function getProposal(uint256 proposalId) external view returns (Proposal memory) {
        return _layout().proposals[proposalId];
    }

    /// ------------------------
    /// Manifest Integration (REQUIRED for PayRox deployment)
    /// ------------------------
    function getFacetInfo()
        external
        pure
        returns (string memory name, string memory version, bytes4[] memory selectors)
    {
        name = "Governance";
        version = "1.0.0";

        // CRITICAL: All external function selectors for manifest routing
        selectors = new bytes4[](7);
        selectors[0] = this.initializeGovernanceFacet.selector;
        selectors[1] = this.setPaused.selector;
        selectors[2] = this.createProposal.selector;
        selectors[3] = this.isGovernanceFacetInitialized.selector;
        selectors[4] = this.getGovernanceFacetVersion.selector;
        selectors[5] = this.isGovernanceFacetPaused.selector;
        selectors[6] = this.getProposal.selector;
    }
}