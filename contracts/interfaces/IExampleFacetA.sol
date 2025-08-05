// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IExampleFacetA
 * @dev AI-Generated interface for PayRox Go Beyond
 * @notice This interface is PayRox-compatible and future-ready
 * 
 * Compatibility: PayRox, OpenZeppelin, EIP
 * AI-Generated: Yes
 * PayRox Ready: Yes
 */

interface IExampleFacetA {
// Custom Errors for Gas Efficiency
error EmptyMessage();
error InvalidKey();
error EmptyData();
error DataTooLarge();
error TooManyMessages();

// Events
event DataStored(bytes32 indexed, bytes32 indexed, uint256 size, address indexed);
event FacetAExecuted(address indexed, uint256 indexed, string message);
event FacetAExecutedHash(address indexed, bytes32 indexed);

// Interface Functions
function executeA(string calldata) external returns (bool success);
    function storeData(bytes32 key, bytes calldata) external;
    function getData(bytes32 key) external view returns (bytes memory);
    function getUserCount(address user) external view returns (uint256 count);
    function batchExecute(string[] calldata) external returns (bool[] memory);
    function calculateHash(bytes calldata) external pure returns (bytes32 hash);
    function verifySignature(bytes32 hash, bytes calldata, address expectedSigner) external pure returns (bool isValid);
    function totalExecutions() external view returns (uint256 param7si76jnu1);
    function lastCaller() external view returns (address param1jh6fyryu);
    function getFacetInfo() external pure returns (string memory, string memory, bytes4[] memory);
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