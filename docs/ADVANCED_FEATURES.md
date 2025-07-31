# PayRox Advanced Features

## 🏛️ Governance System

The PayRox protocol includes a sophisticated governance system managed by the
`GovernanceOrchestrator` contract.

### Features

- **Proposal Creation**: Authorized proposers can create governance proposals with target manifest
  hashes
- **Decentralized Voting**: Token-weighted voting system with configurable quorum thresholds
- **Execution Engine**: Automatic execution of passed proposals after voting deadline
- **Access Control**: Role-based permissions for proposers, administrators, and emergency actions
- **Pause Mechanism**: Emergency pause functionality for critical situations

### Key Components

#### Governance Proposal Structure

```solidity
struct GovernanceProposal {
    bytes32 proposalId;
    address proposer;
    string description;
    bytes32[] targetHashes;
    uint256 votingDeadline;
    uint256 forVotes;
    uint256 againstVotes;
    bool executed;
}
```

#### Roles

- **PROPOSER_ROLE**: Can create new governance proposals
- **EMERGENCY_ROLE**: Can pause/unpause the system in emergencies
- **DEFAULT_ADMIN_ROLE**: Full administrative control

### Usage via CLI

Access governance features through the interactive CLI:

```bash
cd cli
npm run dev
# Select option 4: 🏛️ GovernanceOrchestrator
```

Available operations:

1. ✍️ Create proposal
2. ✍️ Cast vote
3. ✍️ Execute proposal
4. 👁️ Get proposal details
5. 👁️ Check proposal status
6. ⚙️ Update voting power

## 🔍 Security Audit System

The `AuditRegistry` contract provides comprehensive security audit management for all PayRox
manifests and contracts.

### Features

- **Auditor Certification**: Manage certified security auditors
- **Audit Submission**: Submit and verify security audit reports
- **Audit Validity**: Time-based audit expiration and renewal
- **Report Tracking**: Immutable audit report storage with IPFS/URI links
- **Compliance Checking**: Automated audit requirement verification

### Key Components

#### Audit Information Structure

```solidity
struct AuditInfo {
    address auditor;
    bytes32 auditHash;
    uint256 auditTimestamp;
    bool passed;
    string reportUri;
}
```

#### Roles

- **AUDITOR_ROLE**: Can submit security audit reports
- **AUDIT_ADMIN_ROLE**: Can certify/revoke auditors and manage settings
- **DEFAULT_ADMIN_ROLE**: Full administrative control

### Audit Process

1. **Certification**: Audit administrators certify trusted security auditors
2. **Audit Execution**: Certified auditors perform security reviews
3. **Report Submission**: Auditors submit findings via `submitAudit()`
4. **Verification**: System verifies audit integrity and authenticity
5. **Compliance**: Manifests marked as audit-required until passed

### Usage via CLI

Access audit registry features through the interactive CLI:

```bash
cd cli
npm run dev
# Select option 5: 🔍 AuditRegistry
```

Available operations:

1. ✍️ Submit audit
2. ✍️ Certify auditor
3. ✍️ Revoke auditor
4. 👁️ Get audit status
5. 👁️ Check if audit required
6. 👁️ Get auditor info

## 📊 Enhanced Manifest Types

The `ManifestTypes` library has been extended with advanced structures for governance and security:

### New Structures

#### UpgradeManifest

```solidity
struct UpgradeManifest {
    bytes32 fromVersion;
    bytes32 toVersion;
    address[] affectedContracts;
    bytes32[] migrationHashes;
    uint256 upgradeDeadline;
    bool requiresEmergencyPause;
}
```

#### AuditInfo

```solidity
struct AuditInfo {
    address auditor;
    bytes32 auditHash;
    uint256 auditTimestamp;
    bool passed;
    string reportUri;
}
```

#### GovernanceProposal

```solidity
struct GovernanceProposal {
    bytes32 proposalId;
    address proposer;
    string description;
    bytes32[] targetHashes;
    uint256 votingDeadline;
    uint256 forVotes;
    uint256 againstVotes;
    bool executed;
}
```

### Enhanced Events

- `UpgradeProposed`: Emitted when protocol upgrades are proposed
- `AuditCompleted`: Emitted when security audits are completed
- `GovernanceVoteCast`: Emitted when governance votes are cast

### Enhanced Errors

- `UpgradeDeadlineExceeded`: Upgrade window has expired
- `AuditRequired`: Operation requires valid security audit
- `InsufficientVotes`: Governance proposal lacks required votes
- `ProposalNotFound`: Referenced proposal doesn't exist

## 🔧 Enhanced Utilities

The `ManifestUtils` library includes new advanced utility functions:

### Governance Utilities

- `validateUpgrade()`: Validate upgrade manifest compatibility
- `calculateProposalHash()`: Generate governance proposal hashes
- `checkGovernanceQuorum()`: Verify voting quorum requirements

### Audit Utilities

- `verifyAudit()`: Verify audit information integrity
- `checkAuditValidity()`: Check if audits are still valid

## 🚀 Integration Examples

### Creating a Governance Proposal

```typescript
// Via CLI
const cli = new PayRoxCLI();
await cli.start();
// Select: 4 -> 1 -> Enter proposal details

// Direct contract interaction
const governance = await ethers.getContractAt('GovernanceOrchestrator', address);
await governance.createProposal(
  proposalId,
  'Upgrade PayRox to v2.0',
  [targetHash1, targetHash2],
  7 * 24 * 60 * 60 // 7 days
);
```

### Submitting a Security Audit

```typescript
// Via CLI
const cli = new PayRoxCLI();
await cli.start();
// Select: 5 -> 1 -> Enter audit details

// Direct contract interaction
const auditRegistry = await ethers.getContractAt('AuditRegistry', address);
await auditRegistry.submitAudit(
  manifestHash,
  true, // passed
  'ipfs://QmAuditReport...'
);
```

## 🔒 Security Considerations

### Governance Security

- All proposals have minimum/maximum voting periods
- Quorum thresholds prevent small-group manipulation
- Role-based access control prevents unauthorized actions
- Emergency pause capability for critical situations

### Audit Security

- Only certified auditors can submit reports
- Audit hashes prevent report tampering
- Time-based expiration ensures fresh security reviews
- Multiple auditors can audit the same manifest

### System Integration

- Governance proposals can trigger system upgrades
- Audit requirements can block unsafe deployments
- Emergency roles can override normal operations
- All actions are logged for transparency

## 📈 Next Steps

This advanced governance and audit system provides:

1. **Decentralized Decision Making**: Community-driven protocol evolution
2. **Security Assurance**: Comprehensive audit management
3. **Operational Safety**: Emergency controls and validation
4. **Compliance Framework**: Automated security requirement enforcement
5. **Transparency**: Full audit trail of all governance and security actions

The system is now ready for production deployment with enterprise-grade governance and security
capabilities.
