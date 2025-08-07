# PayRox Template System v2

## Hybrid Architecture: Pre-made Archetypes + On-Demand Generation

This template system combines the safety of audited, pre-made archetypes with the flexibility of on-demand generation.

## Template Structure

```
templates/v2/
├── archetypes/           # Battle-tested, audited scaffolds
│   ├── core/            # Minimal facet (init, pause, reentrancy)
│   ├── trading/         # Order management, quotes, SafeERC20
│   ├── vault/           # Deposit/withdraw, accounting
│   ├── staking/         # Stake/unstake, rewards
│   ├── governance/      # Proposals, voting, quorum
│   └── insurance/       # Premium/claim/process
├── generator/           # On-demand generation logic
└── manifests/          # Deployment configurations
```

## Design Principles

1. **Safety First**: All archetypes pass MUST-FIX validation
2. **Namespaced Storage**: Each facet uses unique storage slots
3. **No Constructors**: Initialize pattern only
4. **Role-based Access**: Dispatcher and operator gating
5. **CEI Pattern**: Checks-Effects-Interactions enforced
6. **Gas Efficient**: Custom errors, optimized patterns

## Usage

```bash
# Analyze existing contract
npm run payrox:analyze contracts/MyContract.sol

# Generate facets from archetypes
npm run payrox:scaffold --archetypes trading,governance

# Validate generated code
npm run payrox:validate

# Build deployment manifest
npm run payrox:manifest
```

## Versioning

Templates are versioned with semver and include hash traceability:
- `Facet.Trading@2.1.0`
- Template hash in comments for reproducibility
- Lockfile tracks exact versions used

## Security

- MUST-FIX validator runs automatically
- Slither analysis on generation
- Property-based tests included
- Whitelist-only constructs allowed
