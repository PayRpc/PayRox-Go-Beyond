# PayRox Release Bundle v1.0.0

## Release Information

- **Version:** 1.0.0
- **Network:** hardhat
- **Timestamp:** 2025-07-31T00:24:02.000Z
- **Deployer:** 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

## Deployment

- **Dispatcher:** 0x5FbDB2315678afecb367f032d93F642f64180aa3
- **Factory:** 0x5FbDB2315678afecb367f032d93F642f64180aa3
- **Block Number:** 0

## Components

- **ExampleFacetA:** 0xDDa0648FA8c9cD593416EC37089C2a2E6060B45c (0 bytes)\n- **ExampleFacetA:** 0xDDa0648FA8c9cD593416EC37089C2a2E6060B45c (0 bytes)\n- **ExampleFacetB:** 0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9 (0 bytes)\n- **ExampleFacetB:** 0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9 (0 bytes)

## Verification

- **Manifest Hash:** 0x93065fca6a772eeb06c9afc3830d45bcb1aa4f4603907ed28c81eec4feee16a5
- **Merkle Root:** 0x0000000000000000000000000000000000000000000000000000000000000000
- **Route Count:** 4
- **Verified:** ❌ Failed

## Security

- **Signatures:** None

## Usage

1. Verify checksums: `sha256sum -c checksums.txt`
2. Validate manifest: `npx hardhat payrox:manifest:selfcheck manifests/`
3. Deploy via manifest: `npx hardhat run scripts/deploy-via-manifest.ts`

## Support

For technical support and documentation, visit the PayRox repository.
