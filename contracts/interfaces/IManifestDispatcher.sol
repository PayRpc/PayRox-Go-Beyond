struct SystemStats {
    uint256 total;
    uint256 active;
    uint256 lastUpdate;
    bool isValid;
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../dispatcher/enhanced/interfaces/IDiamondLoupe.sol";

/**
 * @title IManifestDispatcher
 * @dev AI-Generated interface for PayRox Go Beyond
 * @notice This interface is PayRox-compatible and future-ready
 * 
 * Compatibility: PayRox, OpenZeppelin, EIP
 * AI-Generated: Yes
 * PayRox Ready: Yes
 */

interface IManifestDispatcher {
// Struct definitions for PayRox manifest system
enum PreflightError {
    NONE,
    INVALID_MANIFEST,
    MERKLE_VERIFICATION_FAILED,
    UNAUTHORIZED_DEPLOYER,
    EXPIRED_MANIFEST
}

struct FacetInfo {
    address facetAddress;
    bytes4[] selectors;
    bool active;
    uint256 deploymentBlock;
}

// Custom Errors for Gas Efficiency
error FrozenError();
error NoRoute();
error CodehashMismatch();
error InvalidSelector();
error DuplicateSelector(bytes4 selector);
error BatchTooLarge(uint256 size);
error ManifestMismatch(bytes32 expected, bytes32 actual);
error AlreadyApplied(bytes32 hash);
error HashNotCommitted(bytes32 hash);
error Unauthorized(address caller);
error InvalidDelay(uint256 delay);
error RotationNotReady(uint64 eta, uint64 current);
error AlreadyPending();
error InvalidManifest();
error FacetCodeMismatch(address facet, bytes32 expected, bytes32 actual);
error ReturnDataTooLarge(uint256 size);
error CodeSizeExceeded(address facet, uint256 size);
error ZeroCodeFacet(address facet);
error InvalidManifestFormat();
error ManifestTooLarge(uint256 size);
error RootZero();
error BadEpoch();
error NoPendingRoot();
error ActivationNotReady(uint64 earliestActivation, uint64 currentTime);
error LenMismatch();
error FacetIsSelf();
error ZeroAddress();
error InvalidProof();

// Events
event RootUpdated(bytes32 indexed, uint256 routeCount);
event DiamondCut(IDiamondLoupe.FacetCut[] diamondCut);
event ReturnDataSizeUpdated(uint256 oldSize, uint256 newSize);

// Interface Functions
function queueRotateGovernance(address newGov) external;
    function executeRotateGovernance() external;
    function guardianPause() external;
    function setMaxReturnDataSize(uint256 newSize) external;
    function preflightManifest(bytes calldata) external override view returns (bool valid, uint256 entryCount, PreflightError error);
    function facetAddresses() external override view;
    function facetFunctionSelectors(address facet) external override view;
    function facetAddress(bytes4 selector) external override view;
    function facets() external override view;
    function routes(bytes4 selector) external override view;
    function pendingRoot() external override view;
    function pendingEpoch() external override view;
    function pendingSince() external override view;
    function activeRoot() external override view;
    function activeEpoch() external override view;
    function activationDelay() external override view;
    function frozen() external override view;
    function getManifestVersion() external override view;
    function getRoute(bytes4 selector) external override view;
    function getRouteCount() external override view;
    function verifyManifest(bytes32 manifestHash) external override view;
    function getManifestInfo() external override view;
    function commitRoot(bytes32 newRoot, uint64 newEpoch) external;
    function applyRoutes(bytes4[] calldata, address[] calldata, bytes32[] calldata, bytes32[][] calldata, bool[][] calldata) external;
    function updateManifest(bytes32 manifestHash, bytes calldata) external;
    function routeCall(bytes calldata) external override payable;
    function activateCommittedRoot() external;
    function removeRoutes(bytes4[] calldata) external;
    function setActivationDelay(uint64 newDelay) external;
    function freeze() external;
    function pause() external;
    function unpause() external;
    function getSystemStatus() external override view returns (bytes32 activeRoot_, uint64 activeEpoch_, uint64 manifestVersion_, uint256 routeCount_, uint256 facetCount_, bool frozen_, bool paused_, bytes32 committedHash_, uint64 committedAt_);
    function getOperationalState() external override view returns (bool canCommit, bool canActivate, bool canApplyRoutes, bool canUpdateManifest, bool canRemoveRoutes, bool canRoute, string memory);
    function getOperationalFlags() external override view returns (bool canCommit, bool canActivate, bool canApplyRoutes, bool canUpdateManifest, bool canRemoveRoutes, bool canRoute);
    function getFacetInfo(address facetAddr) external override view returns (FacetInfo memory);
    function getSystemStats() external override view returns (SystemStats memory);
    function isSelectorRegistered(bytes4 selector) external override view returns (bool isRegistered, address facetAddr);
    function getFacetAddressesPaginated(uint256 offset, uint256 limit) external override view returns (address[] memory, uint256 total);
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