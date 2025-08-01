# PayRox‑Go‑Beyond

**One‑click manifest‑gated modular deployments** with deterministic content addressing (CREATE2
salts from code hashes), dispatcher gating, and per‑facet proofs.

## Quick start

```bash
pnpm i           # or npm/yarn
pnpm build
cp .env.example .env
# set PRIVATE_KEY and RPC URLs

npx payrox-go-beyond release --network sepolia
# or: npx payrox release -n sepolia
```

## Documentation

- **[Complete Documentation](docs/README.md)** - Full implementation guides and technical
  documentation
- **[OrderedMerkle API Reference](docs/OrderedMerkle_API.md)** - Position-aware Merkle proof
  verification library
- **[System Architecture](docs/SYSTEM_ARCHITECTURE.md)** - Core system design and patterns
- **[Quick Start Guide](docs/QUICK_START_GUIDE.md)** - Choose your implementation path
