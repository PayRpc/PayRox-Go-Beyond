// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IExampleFacetB
 * @dev AI-Generated interface for PayRox Go Beyond
 * @notice This interface is PayRox-compatible and future-ready
 * 
 * Compatibility: PayRox, OpenZeppelin, EIP
 * AI-Generated: Yes
 * PayRox Ready: Yes
 */

interface IExampleFacetB {
// Struct definitions
struct OperationData {
    bytes32 id;
    uint256 operationType;
    bytes data;
    address executor;
    uint256 timestamp;
    bool completed;
}

// Custom Errors for Gas Efficiency
error Paused();
error InvalidOperationType();
error EmptyData();
error DataTooLarge();
error TooManyOperations();
error EmptyBatch();
error LengthMismatch();
error NotOperator();
error AlreadyInitialized();
error NotInitialized();
error ZeroAddress();
error InvalidInitSignature();
error ExpiredSignature();

// Events
event FacetBExecuted(address indexed, uint256 indexed, bytes32 indexed);
event StateChanged(uint256 oldValue, uint256 newValue, address indexed);
event BatchOperationCompleted(uint256 operationCount, uint256 successCount, address indexed);
event PausedSet(bool paused, address indexed);
event Initialized(address operator);
event GovernanceRotated(address indexed, address indexed);
event OperatorRotated(address indexed, address indexed);

// Interface Functions
function initializeFacetB(address operator_, address governance_, uint256 deadline, bytes calldata) external;
    function setPaused(bool paused_) external;
    function rotateGovernance(address newGovernance, uint256 deadline, bytes calldata) external;
    function rotateOperator(address newOperator, uint256 deadline, bytes calldata) external;
    function executeB(uint256 operationType, bytes calldata) external;
    function batchExecuteB(uint256[] calldata, bytes[] calldata) external;
    function getOperation(bytes32 operationId) external view returns (OperationData memory);
    function getUserOperations(address user) external view returns (uint256[] memory);
    function complexCalculation(uint256[] calldata) external pure returns (uint256 result);
    function getStateSummary() external view returns (uint256 value, uint256 operations, address executor, bool paused);
    function getAdvancedAnalytics() external view returns (uint256 value, uint256 totalOps, address lastExecutor, bool isPaused, bool isInitialized, address operatorAddr, address governanceAddr);
    function getInitNonce() external view returns (uint256 nonce);
    function getGovernance() external view returns (address governance);
    function getUserStatistics(address user) external view returns (uint256 totalUserOps, uint256 mostRecentOp, uint256 uniqueOpTypes);
    function validateOperation(uint256 operationType, bytes calldata) external pure returns (bool isValid, uint256 reason);
    function simulateOperation(uint256 operationType, bytes calldata) external view returns (uint256 newValue, uint256 gasEstimate);
    function getFacetInfoB() external pure returns (string memory, string memory, bytes4[] memory);
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