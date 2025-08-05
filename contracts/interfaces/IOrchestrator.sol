// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IOrchestrator
 * @dev AI-Generated interface for PayRox Go Beyond
 * @notice This interface is PayRox-compatible and future-ready
 * 
 * Compatibility: PayRox, OpenZeppelin, EIP
 * AI-Generated: Yes
 * PayRox Ready: Yes
 */

interface IOrchestrator {
// Custom Errors for Gas Efficiency
error NotAdmin();
error NotAuthorized();
error PlanExists();
error PlanMissing();
error PlanDone();
error BadId();
error BadGas();

// Events
event OrchestrationStarted(bytes32 indexed, address indexed, uint256 timestamp);
event ChunksStaged(bytes32 indexed, uint256 count, uint256 gasUsed, uint256 feePaid);
event ComponentNoted(bytes32 indexed, address indexed, string tag);
event OrchestrationCompleted(bytes32 indexed, bool success);
event EmergencyPause(bool paused, address admin);
event PlanEmergencyPause(bytes32 indexed, bool paused);

// Interface Functions
function setAuthorized(address who, bool ok) external;
    function startOrchestration(bytes32 id, uint256 gasLimit) external;
    function orchestrateStageBatch(bytes32 id, bytes[] calldata) external payable;
    function orchestrateStage(bytes32 id, bytes calldata) external payable;
    function orchestrateManifestUpdate(bytes32 id, bytes4[] calldata, address[] calldata, bytes32[] calldata, bytes32[][] calldata, bool[][] calldata) external;
    function complete(bytes32 id, bool success) external;
    function noteComponent(bytes32 id, address component, string calldata) external;
    function getPlan(bytes32 id) external view returns (address initiator, uint256 gasLimit, bool completed);
    function isPlanActive(bytes32 id) external view returns (bool paramth7wf3ied);
    function isAuthorized(address who) external view returns (bool param184jaakjs);
    function getIntegrationAddresses() external view returns (address factoryAddr, address dispatcherAddr);
    function setGlobalEmergencyPause(bool paused) external;
    function setPlanEmergencyPause(bytes32 id, bool paused) external;
    function startOrchestrationSecure(bytes32 id, uint256 gasLimit) external;
    function validateOrchestration(bytes32 id, uint256 gasLimit, address initiator) external view returns (bool isValid, string memory);
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