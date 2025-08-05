// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IAuditRegistry
 * @dev AI-Generated interface for PayRox Go Beyond
 * @notice This interface is PayRox-compatible and future-ready
 * 
 * Compatibility: PayRox, OpenZeppelin, EIP
 * AI-Generated: Yes
 * PayRox Ready: Yes
 */

interface IAuditRegistry {
// Custom Errors for Gas Efficiency
error AuditorNotCertified(address auditor);
error AuditAlreadyExists(bytes32 manifestHash);
error AuditNotFound(bytes32 manifestHash);
error InvalidAuditPeriod(uint256 period);
error AuditExpiredError(bytes32 manifestHash);
error InvalidReportUri(string uri);
error AuditorAlreadyCertified(address auditor);

// Events
event AuditSubmitted(bytes32 indexed, address indexed, bool passed, string reportUri);
event AuditorCertified(address indexed, address indexed);
event AuditorRevoked(address indexed, address indexed);
event AuditValidityUpdated(uint256 oldPeriod, uint256 newPeriod);
event AuditExpired(bytes32 indexed, address indexed);

// Interface Functions
function submitAudit(bytes32 manifestHash, bool passed, string calldata) external;
    function certifyAuditor(address auditor) external;
    function revokeAuditor(address auditor) external;
    function updateAuditValidityPeriod(uint256 newPeriod) external;
    function getAuditStatus(bytes32 manifestHash) external view returns (bool isValid, ManifestTypes.AuditInfo memory);
    function requiresAudit(bytes32 manifestHash) external view returns (bool auditRequired);
    function getAuditorInfo(address auditor) external view returns (bool isCertified, uint256 auditCount);
    function getAuditCount() external view returns (uint256 count);
    function getAuditedManifests(uint256 offset, uint256 limit) external view returns (bytes32[] memory, uint256 total);
    function markExpiredAudits(bytes32[] calldata) external;
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