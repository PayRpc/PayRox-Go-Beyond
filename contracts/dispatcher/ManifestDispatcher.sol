// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {OrderedMerkle} from "../utils/OrderedMerkle.sol";
import {IManifestDispatcher} from "./interfaces/IManifestDispatcher.sol";

/**
 * @title ManifestDispatcher
 * @notice Non-upgradeable dispatcher with manifest-gated routes.
 *         Flow: commitRoot(root, epoch) → applyRoutes(...) with proofs → activateCommittedRoot().
 *         Per-call EXTCODEHASH gating ensures the facet's code matches the manifest expectation.
 *
 * Governance hardening:
 * - Optional activation delay after commit.
 * - One-way freeze() to permanently lock configuration.
 */
contract ManifestDispatcher is IManifestDispatcher, AccessControl, Pausable {
    // ───────────────────────── Roles ─────────────────────────
    bytes32 public constant COMMIT_ROLE     = keccak256("COMMIT_ROLE");
    bytes32 public constant APPLY_ROLE      = keccak256("APPLY_ROLE");
    bytes32 public constant EMERGENCY_ROLE  = keccak256("EMERGENCY_ROLE");

    // selector => route
    mapping(bytes4 => Route) public routes;

    // Manifest lifecycle
    bytes32 public pendingRoot;
    uint64  public pendingEpoch;
    uint64  public pendingSince; // commit timestamp
    bytes32 public activeRoot;
    uint64  public activeEpoch;

    // Governance guards
    uint64  public activationDelay; // seconds; 0 = no delay
    bool    public frozen;

    // ──────────────────────── Errors ─────────────────────────
    error FrozenError();
    error NoPendingRoot();
    error BadEpoch();
    error ActivationNotReady(uint64 earliestActivation, uint64 nowTs, uint64 pendingEpoch, uint64 epochArg);
    error LenMismatch();
    error NoRoute();
    error UnknownSelector(bytes4 selector);
    error CodehashMismatch(); // Runtime validation (gas-efficient)
    error ApplyCodehashMismatch(address facet, bytes32 expected, bytes32 actual); // Apply-time validation (detailed)
    error FacetIsSelf();
    error RootZero();

    // ───────────────────── Constructor ───────────────────────
    constructor(address admin, uint64 _activationDelay) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(COMMIT_ROLE, admin);
        _grantRole(APPLY_ROLE, admin);
        _grantRole(EMERGENCY_ROLE, admin);
        activationDelay = _activationDelay;
    }

    // ───────────────── Manifest governance ───────────────────

    /**
     * @dev Commit a new manifest root for the next epoch (activeEpoch + 1).
     */
    function commitRoot(bytes32 newRoot, uint64 newEpoch)
        external
        override
        onlyRole(COMMIT_ROLE)
    {
        if (frozen) revert FrozenError();
        if (newRoot == bytes32(0)) revert RootZero();
        if (newEpoch != activeEpoch + 1) revert BadEpoch();

        pendingRoot  = newRoot;
        pendingEpoch = newEpoch;
        pendingSince = uint64(block.timestamp);

        emit RootCommitted(newRoot, newEpoch);
    }

    /**
     * @dev Apply routes proven against `pendingRoot`.
     *      Leaf = keccak256(abi.encode(selector, facet, codehash)).
     *      Uses ordered-pair Merkle verification with position-aware proofs.
     */
    function applyRoutes(
        bytes4[] calldata selectors,
        address[] calldata facets,
        bytes32[] calldata codehashes,
        bytes32[][] calldata proofs,
        bool[][] calldata isRight
    )
        external
        override
        onlyRole(APPLY_ROLE)
    {
        if (frozen) revert FrozenError();
        if (pendingRoot == bytes32(0)) revert NoPendingRoot();

        uint256 n = selectors.length;
        if (facets.length != n || codehashes.length != n || proofs.length != n || isRight.length != n) {
            revert LenMismatch();
        }

        for (uint256 i; i < n; ++i) {
            // Merkle inclusion with ordered-pair verification
            bytes32 leaf = keccak256(abi.encode(selectors[i], facets[i], codehashes[i]));
            require(OrderedMerkle.verify(proofs[i], isRight[i], pendingRoot, leaf), "bad proof");

            // Safety: don't allow routing back to the dispatcher itself
            if (facets[i] == address(this)) revert FacetIsSelf();

            // Apply-time EXTCODEHASH validation as fail-fast guard
            bytes32 actualCodehash = facets[i].codehash;
            if (actualCodehash != codehashes[i]) revert ApplyCodehashMismatch(facets[i], codehashes[i], actualCodehash);

            routes[selectors[i]] = Route({facet: facets[i], codehash: codehashes[i]});
            emit RouteAdded(selectors[i], facets[i], codehashes[i]);
        }
    }

    /**
     * @dev Activate the currently committed root after optional delay.
     */
    function activateCommittedRoot()
        external
        override
        onlyRole(APPLY_ROLE)
    {
        if (frozen) revert FrozenError();
        if (pendingRoot == bytes32(0)) revert NoPendingRoot();
        if (activationDelay != 0) {
            uint64 earliestActivation = uint64(pendingSince + activationDelay);
            if (block.timestamp < earliestActivation) {
                revert ActivationNotReady(earliestActivation, uint64(block.timestamp), pendingEpoch, pendingEpoch);
            }
        }

        activeRoot  = pendingRoot;
        activeEpoch = pendingEpoch;

        pendingRoot  = bytes32(0);
        pendingEpoch = 0;
        pendingSince = 0;

        emit RootActivated(activeRoot, activeEpoch);
    }

    /**
     * @dev Emergency removal of routes (e.g., if a facet is found vulnerable) before freeze().
     */
    function removeRoutes(bytes4[] calldata selectors)
        external
        override
        onlyRole(EMERGENCY_ROLE)
    {
        if (frozen) revert FrozenError();
        for (uint256 i; i < selectors.length; ++i) {
            delete routes[selectors[i]];
            emit RouteRemoved(selectors[i]);
        }
    }

    /**
     * @dev Set/adjust the activation delay (in seconds). Disabled after freeze().
     */
    function setActivationDelay(uint64 newDelay)
        external
        override
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        if (frozen) revert FrozenError();
        uint64 old = activationDelay;
        activationDelay = newDelay;
        emit ActivationDelaySet(old, newDelay);
    }

    /**
     * @dev One‑way governance freeze. Irreversible.
     *      Disables: commitRoot, applyRoutes, activateCommittedRoot, removeRoutes, setActivationDelay.
     *      Pause/unpause remains available (operational control).
     */
    function freeze()
        external
        override
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        if (frozen) revert FrozenError();
        frozen = true;
        emit Frozen();
    }

    // ───────────────────── Operational control ───────────────

    function pause() external override onlyRole(EMERGENCY_ROLE) { _pause(); }
    function unpause() external override onlyRole(EMERGENCY_ROLE) { _unpause(); }

    // ──────────────────── Fallback dispatcher ────────────────

    /**
     * @dev Routes all unknown function selectors to the configured facet via DELEGATECALL,
     *      enforcing the facet's EXTCODEHASH per call.
     */
    fallback() external payable whenNotPaused {
        Route memory r = routes[msg.sig];
        address facet = r.facet;
        if (facet == address(0)) revert NoRoute();

        // Per-call EXTCODEHASH gate (cheap, prevents facet code swaps)
        if (facet.codehash != r.codehash) revert CodehashMismatch();

        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), facet, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch result
            case 0 { revert(0, returndatasize()) }
            default { return(0, returndatasize()) }
        }
    }

    receive() external payable {}
}
