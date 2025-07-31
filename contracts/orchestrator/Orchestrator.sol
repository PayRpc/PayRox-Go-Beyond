// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IChunkFactory} from "../factory/interfaces/IChunkFactory.sol";
import {IManifestDispatcher} from "../dispatcher/interfaces/IManifestDispatcher.sol";

/**
 * @title Orchestrator
 * @notice Coordinates factory deployments (staging/direct) and dispatcher manifest updates.
 * @dev Grant this contract COMMIT/APPLY/EMERGENCY roles on the ManifestDispatcher.
 */
contract Orchestrator {
    /* ───────────────────────── Events ───────────────────────── */
    event OrchestrationStarted(bytes32 indexed id, address indexed initiator, uint256 timestamp);
    event ChunksStaged(bytes32 indexed id, uint256 count, uint256 gasUsed, uint256 feePaid);
    event ComponentNoted(bytes32 indexed id, address indexed component, string tag);
    event OrchestrationCompleted(bytes32 indexed id, bool success);

    /* ──────────────────────── Storage ───────────────────────── */
    struct Plan {
        address initiator;
        uint256 gasLimit;
        bool    completed;
    }

    IChunkFactory       public immutable factory;
    IManifestDispatcher public immutable dispatcher;

    address public immutable admin;
    mapping(bytes32 => Plan) public plans;
    mapping(address => bool) public authorized;

    /* ──────────────────────── Errors ───────────────────────── */
    error NotAdmin();
    error NotAuthorized();
    error PlanExists();
    error PlanMissing();
    error PlanDone();
    error BadId();
    error BadGas();

    /* ───────────────────── Modifiers ───────────────────────── */
    modifier onlyAdmin() { if (msg.sender != admin) revert NotAdmin(); _; }
    modifier onlyAuth()  { if (!authorized[msg.sender] && msg.sender != admin) revert NotAuthorized(); _; }

    /* ───────────────────── Constructor ─────────────────────── */
    constructor(IChunkFactory _factory, IManifestDispatcher _dispatcher) {
        require(address(_factory) != address(0) && address(_dispatcher) != address(0), "zero addr");
        factory    = _factory;
        dispatcher = _dispatcher;
        admin      = msg.sender;
        authorized[msg.sender] = true;
    }

    /* ───────────────── Governance ──────────────────────────── */
    function setAuthorized(address who, bool ok) external onlyAdmin {
        authorized[who] = ok;
    }

    /* ───────────────── Orchestration API ───────────────────── */
    function startOrchestration(bytes32 id, uint256 gasLimit) external onlyAuth {
        if (id == bytes32(0)) revert BadId();
        if (gasLimit == 0)     revert BadGas();
        if (plans[id].initiator != address(0)) revert PlanExists();

        plans[id] = Plan({initiator: msg.sender, gasLimit: gasLimit, completed: false});
        emit OrchestrationStarted(id, msg.sender, block.timestamp);
    }

    /// @notice Stage a batch of content-addressed chunks via the standard factory API.
    /// @dev Pass any required factory fee via msg.value (applies to batch internally).
    function orchestrateStageBatch(bytes32 id, bytes[] calldata blobs)
        external
        payable
        onlyAuth
        returns (address[] memory chunks, bytes32[] memory hashes)
    {
        Plan storage p = plans[id];
        if (p.initiator == address(0)) revert PlanMissing();
        if (p.completed)               revert PlanDone();

        uint256 g0 = gasleft();
        (chunks, hashes) = factory.stageBatch{value: msg.value}(blobs);
        uint256 used = g0 - gasleft();

        emit ChunksStaged(id, blobs.length, used, msg.value);
        // Optional: note each component address for off-chain indexing
        for (uint256 i; i < chunks.length; ) {
            emit ComponentNoted(id, chunks[i], "chunk");
            unchecked { ++i; }
        }
    }

    /// @notice Convenience: stage a single blob
    function orchestrateStage(bytes32 id, bytes calldata data)
        external
        payable
        onlyAuth
        returns (address chunk, bytes32 hash)
    {
        Plan storage p = plans[id];
        if (p.initiator == address(0)) revert PlanMissing();
        if (p.completed)               revert PlanDone();

        uint256 g0 = gasleft();
        (chunk, hash) = factory.stage{value: msg.value}(data);
        uint256 used = g0 - gasleft();

        emit ChunksStaged(id, 1, used, msg.value);
        emit ComponentNoted(id, chunk, "chunk");
    }

    /// @notice Apply routes (proofs verified by dispatcher)
    function orchestrateManifestUpdate(
        bytes32 id,
        bytes4[] calldata selectors,
        address[] calldata facets,
        bytes32[] calldata codehashes,
        bytes32[][] calldata proofs,
        bool[][] calldata isRight
    ) external onlyAuth {
        Plan storage p = plans[id];
        if (p.initiator == address(0)) revert PlanMissing();
        if (p.completed)               revert PlanDone();

        dispatcher.applyRoutes(selectors, facets, codehashes, proofs, isRight);
    }

    /// @notice Optionally activate after any configured delay has elapsed
    function activateCommittedRoot(bytes32 id) external onlyAuth {
        Plan storage p = plans[id];
        if (p.initiator == address(0)) revert PlanMissing();
        if (p.completed)               revert PlanDone();

        dispatcher.activateCommittedRoot();
    }

    /// @notice Mark orchestration complete (bookkeeping + event)
    function complete(bytes32 id, bool success) external onlyAuth {
        Plan storage p = plans[id];
        if (p.initiator == address(0)) revert PlanMissing();
        if (p.completed)               revert PlanDone();

        p.completed = true;
        emit OrchestrationCompleted(id, success);
    }

    /// @notice Note a component in the orchestration for tracking
    function noteComponent(bytes32 id, address component, string calldata tag) external onlyAuth {
        Plan storage p = plans[id];
        if (p.initiator == address(0)) revert PlanMissing();
        if (p.completed)               revert PlanDone();

        emit ComponentNoted(id, component, tag);
    }
}
