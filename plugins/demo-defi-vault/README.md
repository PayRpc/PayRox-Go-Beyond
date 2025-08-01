# demo-defi-vault

A defi-vault dApp built with PayRox

## Features

- 🏦 **Vault Token System** - ERC20 shares representing vault deposits
- 🌾 **Yield Farming** - Automated reward distribution
- 🔒 **Security Features** - Time locks and emergency controls
- ⚡ **PayRox Integration** - Built on PayRox Go Beyond infrastructure
- 🛡️ **Audited Contracts** - OpenZeppelin based security

## Quick Start

### Installation

```bash
npm install
```

### Compilation

```bash
npm run build
```

### Testing

```bash
npm run test
```

### Deployment

```bash
# Deploy to local network
npx hardhat run scripts/deploy.js

# Deploy to testnet
npx hardhat run scripts/deploy.js --network goerli

# Deploy to mainnet
npx hardhat run scripts/deploy.js --network mainnet
```

## Architecture

### Core Contracts

- **VaultToken.sol** - Main vault contract with deposit/withdraw functionality
- **YieldFarm.sol** - Yield farming and reward distribution logic  
- **RewardDistributor.sol** - Automated reward distribution system

### Key Features

#### Deposit & Withdraw
- Users deposit underlying tokens to receive vault shares
- Shares represent proportional ownership of vault assets
- 7-day lock period prevents flash loan attacks
- Pro-rata withdrawal based on share ownership

#### Reward System
- Vault owner can distribute rewards to all participants
- Rewards are distributed proportionally to share ownership
- Users can claim pending rewards at any time
- Automatic compounding available

#### Security Features
- ReentrancyGuard on all external functions
- Time-locked withdrawals
- Emergency pause functionality
- Maximum supply cap protection

## Usage

### For Vault Owners

```javascript
// Deploy vault
const vault = await VaultToken.deploy("My Vault", "MVT", underlyingTokenAddress);

// Distribute rewards
await vault.distributeRewards(ethers.parseEther("1000"));
```

### For Users

```javascript
// Deposit tokens
await underlyingToken.approve(vault.address, amount);
await vault.deposit(amount);

// Check rewards
const pending = await vault.pendingRewards(userAddress);

// Claim rewards
await vault.claimRewards();

// Withdraw (after lock period)
await vault.withdraw(shares);
```

## Configuration

Edit `hardhat.config.js` to configure networks and deployment settings:

```javascript
module.exports = {
  solidity: "0.8.30",
  networks: {
    goerli: {
      url: process.env.GOERLI_URL,
      accounts: [process.env.PRIVATE_KEY]
    }
  }
};
```

## Testing

The project includes comprehensive tests:

```bash
# Run all tests
npm test

# Run with coverage
npx hardhat coverage

# Run specific test
npx hardhat test test/VaultToken.test.js
```

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Support

For support and questions:
- GitHub Issues: Create an issue in this repository
- Documentation: Check the docs/ folder
- Community: Join our Discord server

---

Built with ❤️ using PayRox Go Beyond
