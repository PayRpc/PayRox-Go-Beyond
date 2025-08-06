# TerraStakeNFT Demo Contract

## Overview

The TerraStakeNFT contract is a sophisticated demonstration of PayRox Go Beyond's capabilities, showcasing how complex real-world applications can be built and deployed through our deterministic deployment system.

## Features

### 🌱 Environmental Impact NFTs
- **Multi-tier Token System**: Four tiers of environmental NFTs (Basic, Premium, Legendary, Mythic)
- **Carbon Offset Tracking**: Each NFT tracks real carbon offset data in tons (scaled by 1e18)
- **Environmental Scoring**: Impact scores from 0-100 with verification hashes
- **Regional Tracking**: Geographic region identifiers for location-based environmental data

### 💰 Dynamic Staking System
- **Variable APY Rates**: Different reward rates based on token tier
  - Basic: 5% APY
  - Premium: 7.5% APY  
  - Legendary: 10% APY
  - Mythic: 15% APY
- **Environmental Bonuses**: Additional rewards based on environmental impact scores
- **Time-based Rewards**: Pro-rated rewards based on staking duration

### 🎲 VRF Integration
- **Chainlink VRF**: Integration for randomized rewards and rarity generation
- **Random Minting**: VRF-powered random token generation with tier probabilities
- **Secure Randomness**: Cryptographically secure random number generation

### 🔧 Fractionalization Support
- **High-Value Assets**: Legendary and Mythic tokens can be fractionalized
- **Vault System**: Integration with fractionalization vault for managing ownership shares
- **Liquidity Enhancement**: Enable trading of fractions for expensive environmental assets

### 🔐 Comprehensive Security
- **Role-Based Access Control**: Granular permissions for different operations
- **Emergency Controls**: Pause functionality and emergency withdrawal mechanisms
- **Signature Verification**: Oracle signature verification for environmental data updates
- **Reentrancy Protection**: All state-changing functions protected against reentrancy attacks

### ⬆️ Upgradeability
- **UUPS Pattern**: Universal Upgradeable Proxy Standard implementation
- **Role-Based Upgrades**: Only authorized upgraders can deploy new implementations
- **Storage Layout Safety**: Proper storage gap management for safe upgrades

## Contract Architecture

```
TerraStakeNFT (UUPS Proxy)
├── ERC1155Upgradeable (Multi-token standard)
├── AccessControlUpgradeable (Role management)
├── PausableUpgradeable (Emergency controls)
├── ReentrancyGuardUpgradeable (Attack protection)
└── UUPSUpgradeable (Upgrade mechanism)
```

## Token Tiers & Supply Limits

| Tier | Token ID | Max Supply | Base APY | Fractionalization |
|------|----------|------------|----------|-------------------|
| Basic | 1 | 1,000,000 | 5% | ❌ |
| Premium | 2 | 100,000 | 7.5% | ❌ |
| Legendary | 3 | 10,000 | 10% | ✅ |
| Mythic | 4 | 1,000 | 15% | ✅ |

## Environmental Data Structure

```solidity
struct EnvironmentalData {
    uint256 carbonOffset;      // Carbon offset in tons (scaled by 1e18)
    uint256 impactScore;       // Environmental impact score (0-100)
    uint256 regionId;          // Geographic region identifier
    bytes32 certificationHash; // Environmental certification hash
    uint256 lastUpdated;      // Timestamp of last update
}
```

## Deployment Instructions

### Prerequisites
- Node.js 18+
- Hardhat development environment
- OpenZeppelin contracts v5.4.0+

### Deploy Contract

```bash
# Compile contracts
npx hardhat compile

# Run tests
npx hardhat test test/TerraStakeNFT.test.ts

# Deploy to local network
npx hardhat run scripts/deploy-terrastake-demo.ts

# Deploy to testnet
npx hardhat run scripts/deploy-terrastake-demo.ts --network sepolia
```

### Configuration

Update deployment script parameters:
- `baseURI`: Metadata base URI for token metadata
- `vrfCoordinator`: Chainlink VRF Coordinator address
- `vrfKeyHash`: VRF key hash for your network
- `vrfSubscriptionId`: VRF subscription ID

## Usage Examples

### Minting Environmental NFTs

```javascript
const environmentalData = {
  carbonOffset: ethers.parseEther("10"), // 10 tons CO2
  impactScore: 85, // High environmental impact score
  regionId: 1, // Pacific Northwest
  certificationHash: ethers.keccak256(ethers.toUtf8Bytes("VERIFIED_GREEN_CERT_2024")),
  lastUpdated: 0
};

await terraStakeNFT.mintWithEnvironmentalData(
  userAddress,
  1, // TERRA_BASIC
  100, // Amount
  environmentalData
);
```

### Starting Staking

```javascript
// User must approve contract to transfer tokens
await terraStakeNFT.connect(user).startStaking(
  1, // TERRA_BASIC
  50 // Amount to stake
);
```

### Ending Staking and Claiming Rewards

```javascript
await terraStakeNFT.connect(user).endStaking(1); // TERRA_BASIC
```

### Requesting VRF Randomness

```javascript
await terraStakeNFT.connect(user).requestRandomness();
// VRF coordinator will call fulfillRandomWords with random result
```

## Testing

The contract includes comprehensive test coverage:

- ✅ Deployment and initialization
- ✅ Environmental NFT minting with impact data
- ✅ Staking functionality with reward calculation
- ✅ Access control and role management
- ✅ Emergency functions and security controls
- ✅ Gas optimization testing
- ✅ Complete workflow integration testing

Run tests:
```bash
npx hardhat test test/TerraStakeNFT.test.ts
```

## Security Considerations

### Access Control
- **Admin Role**: Can manage other roles and contract configuration
- **Minter Role**: Can mint new tokens with environmental data
- **Oracle Role**: Can update environmental data with signatures
- **Upgrader Role**: Can authorize contract upgrades
- **Emergency Role**: Can pause/unpause contract operations
- **Fractionalization Role**: Can fractionalize high-tier tokens

### Emergency Mechanisms
- **Pause Functionality**: Complete contract pause for emergencies
- **Emergency Withdrawals**: Time-delayed emergency withdrawal system
- **Signature Replay Protection**: Used signatures tracking prevents replay attacks
- **Supply Limits**: Hard caps prevent unlimited token inflation

### Upgrade Safety
- **UUPS Pattern**: More gas-efficient than transparent proxy
- **Role-Based Upgrades**: Only authorized upgraders can upgrade
- **Storage Layout**: Proper storage gaps for safe upgrades
- **Initialization**: Secure initialization prevents re-initialization

## Gas Optimization

The contract implements several gas optimization techniques:

1. **Batch Operations**: Batch minting reduces per-token gas costs
2. **Packed Structs**: Efficient storage layout for environmental data
3. **Events Over Storage**: Use events for historical data where possible
4. **Custom Errors**: Gas-efficient error handling
5. **Assembly Optimizations**: Low-level optimizations where safe

## Integration with PayRox Ecosystem

This contract demonstrates how complex DeFi/NFT applications can leverage PayRox's:

1. **Deterministic Deployment**: CREATE2 addresses for predictable contract locations
2. **Diamond Architecture**: Modular functionality through facet pattern
3. **Manifest System**: Deployment verification and integrity checking
4. **Cross-Chain Support**: Same contract addresses across multiple networks
5. **Gas Optimization**: Batch operations and efficient deployment patterns

## Real-World Applications

### Environmental Impact Tracking
- Carbon credit NFTs with verifiable offset data
- Renewable energy certificates as tradeable tokens
- Environmental compliance tracking for corporations

### DeFi Integration
- Collateralized lending against environmental NFTs
- Liquidity pools for fractionalized environmental assets
- Yield farming with environmental impact bonuses

### Gaming and Metaverse
- Environmental achievements in sustainability games
- Virtual land with real-world environmental impact
- Carbon-neutral gaming economies

## Support and Documentation

- **PayRox Documentation**: [docs/README.md](../docs/README.md)
- **Manifest Specification**: [docs/ManifestSpec.md](../docs/ManifestSpec.md)
- **Security Guide**: [docs/PRODUCTION_OPS_PLAYBOOK.md](../docs/PRODUCTION_OPS_PLAYBOOK.md)
- **API Reference**: Auto-generated from NatSpec comments

## License

MIT License - See [LICENSE](../LICENSE) for details.

---

*This demo contract showcases the power and flexibility of the PayRox Go Beyond system for deploying complex, real-world blockchain applications with environmental impact and advanced DeFi features.*
