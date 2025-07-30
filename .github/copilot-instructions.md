<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# PayRox Go Beyond - Copilot Instructions

## Project Overview

PayRox Go Beyond is a comprehensive blockchain deployment and orchestration framework built on Hardhat with TypeScript. The system enables deterministic contract deployment, dynamic function routing, and sophisticated upgrade management.

## Architecture Guidelines

### Core Components

1. **DeterministicChunkFactory** - Deploys contracts with predictable CREATE2 addresses
2. **ManifestDispatcher** - Routes function calls based on manifest configuration  
3. **Orchestrator** - Coordinates complex deployment processes
4. **Manifest System** - Manages deployment configuration and verification

### Coding Standards

- Use TypeScript for all scripts and utilities
- Follow Solidity 0.8.20+ best practices for smart contracts
- Implement comprehensive error handling with custom error types
- Include detailed NatSpec documentation for all public functions
- Use events for all significant state changes
- Follow the checks-effects-interactions pattern

### Security Requirements

- All contracts must include access control mechanisms
- Use deterministic salts for CREATE2 deployments
- Implement emergency pause functionality where appropriate
- Validate all inputs and revert with descriptive error messages
- Use cryptographic verification for manifest integrity
- Follow principle of least privilege for contract permissions

### Testing Guidelines

- Maintain >90% test coverage for all smart contracts
- Include edge case and failure scenario tests
- Use property-based testing for complex logic
- Test gas usage and optimization
- Validate security controls and access restrictions

### Documentation Standards

- Provide clear README files for each major component
- Include deployment and usage examples
- Document security considerations and threat models
- Maintain up-to-date API documentation
- Include troubleshooting guides and FAQs

## Development Patterns

### Smart Contracts

```solidity
// Use this pattern for state-changing functions
function exampleFunction(uint256 param) external onlyAuthorized whenNotPaused {
    require(param > 0, "ExampleContract: invalid parameter");
    
    // Checks
    require(someCondition, "ExampleContract: condition not met");
    
    // Effects
    state = newState;
    
    // Interactions
    externalContract.call(data);
    
    emit ExampleEvent(param, msg.sender, block.timestamp);
}
```

### TypeScript Scripts

```typescript
// Use this pattern for deployment scripts
export async function main(hre: HardhatRuntimeEnvironment, params?: any) {
  console.log("🚀 Starting deployment...");
  
  try {
    // Validate inputs
    validateParameters(params);
    
    // Execute deployment
    const result = await deployContract(hre, params);
    
    // Verify deployment
    await verifyDeployment(result);
    
    console.log("✅ Deployment completed successfully!");
    return result;
  } catch (error) {
    console.error("❌ Deployment failed:", error);
    throw error;
  }
}
```

### Error Handling

```solidity
// Define custom errors for gas efficiency
error Unauthorized(address caller);
error InvalidParameter(string param, uint256 value);
error InsufficientBalance(uint256 required, uint256 available);

// Use custom errors in functions
function withdraw(uint256 amount) external {
    if (msg.sender != owner) revert Unauthorized(msg.sender);
    if (amount == 0) revert InvalidParameter("amount", amount);
    if (amount > balance) revert InsufficientBalance(amount, balance);
    
    // Function logic here
}
```

## Manifest System Guidelines

### Manifest Structure

- Always include version and timestamp in manifest headers
- Use Merkle trees for chunk verification
- Sign manifests with authorized keys
- Validate compatibility before upgrades
- Maintain audit trails for all manifest changes

### Deployment Process

1. Generate and validate manifest
2. Stage chunks with size and gas validation
3. Deploy through deterministic factory
4. Update dispatcher routing
5. Verify deployment integrity
6. Update monitoring and documentation

## CLI and SDK Guidelines

### CLI Commands

- Provide clear help text and examples
- Use consistent flag naming conventions
- Include dry-run options for safety
- Implement progress indicators for long operations
- Support both interactive and scriptable modes

### SDK Design

- Export typed interfaces for all major functions
- Provide async/await patterns for blockchain operations
- Include comprehensive error handling
- Support multiple network configurations
- Maintain backward compatibility where possible

## Monitoring and Observability

### Events and Logging

```solidity
// Use structured events for monitoring
event ComponentDeployed(
    bytes32 indexed deploymentId,
    address indexed component,
    string componentType,
    uint256 timestamp
);

event SecurityAlert(
    uint256 indexed alertType,
    address indexed actor,
    bytes32 indexed context,
    uint256 severity
);
```

### Gas Optimization

- Use calldata instead of memory for external function parameters
- Pack structs to minimize storage slots
- Use events instead of storage for historical data
- Implement efficient loops and avoid unnecessary operations
- Use assembly for low-level optimizations when needed

## Security Considerations

### Access Control

```solidity
// Use role-based access control
bytes32 public constant DEPLOYER_ROLE = keccak256("DEPLOYER_ROLE");
bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

modifier onlyRole(bytes32 role) {
    require(hasRole(role, msg.sender), "AccessControl: insufficient privileges");
    _;
}
```

### Upgrade Safety

- Use timelock for critical upgrades
- Implement upgrade compatibility checks
- Test upgrades on testnets first
- Maintain emergency pause mechanisms
- Document all upgrade procedures

## File Organization

```
contracts/
├── factory/           # Deployment factory contracts
├── dispatcher/        # Function routing contracts
├── orchestrator/      # Coordination contracts
├── manifest/          # Manifest utilities
└── facets/           # Modular contract components

scripts/
├── preflight.ts      # Pre-deployment validation
├── build-manifest.ts # Manifest generation
├── deploy-*.ts       # Deployment scripts
└── postverify.ts     # Post-deployment verification

test/
├── *.spec.ts         # Contract test suites
└── helpers/          # Test utilities

docs/
├── ManifestSpec.md   # Manifest specification
├── ThreatModel.md    # Security analysis
└── Runbook.md        # Operations guide
```

## Best Practices

- Always validate inputs and handle edge cases
- Use deterministic deployment for reproducibility
- Implement comprehensive logging and monitoring
- Follow security-first development principles
- Maintain clear separation of concerns
- Document decisions and trade-offs
- Test thoroughly across different networks
- Keep dependencies up to date
- Use semantic versioning for releases
- Implement graceful error recovery
