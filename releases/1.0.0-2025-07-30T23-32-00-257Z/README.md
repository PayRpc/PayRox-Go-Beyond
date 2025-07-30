# PayRox Release Bundle v1.0.0

## Release Information

- **Version:** 1.0.0
- **Network:** hardhat
- **Timestamp:** 2025-07-30T23:31:59.000Z
- **Deployer:** 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

## Deployment

- **Dispatcher:** 0xdb54fa574a3e8c6aC784e1a5cdB575A737622CFf
- **Factory:** 0x90b97E83e22AFa2e6A96b3549A0E495D5Bae61aF
- **Block Number:** 0

## Components

- **ExampleFacetA:** 0xDDa0648FA8c9cD593416EC37089C2a2E6060B45c (0 bytes)\n- **ExampleFacetA:** 0xDDa0648FA8c9cD593416EC37089C2a2E6060B45c (0 bytes)\n- **ExampleFacetB:** 0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9 (0 bytes)\n- **ExampleFacetB:** 0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9 (0 bytes)

## Verification

- **Manifest Hash:** 0xec3945b6d6e4b79c5a54e403c5fd56e489b734e89b1ba03392569629480d498b
- **Merkle Root:** 0x0000000000000000000000000000000000000000000000000000000000000000
- **Route Count:** 4
- **Verified:** ❌ Failed

## Security

- **Signatures:** production-key

## Usage

1. Verify checksums: `sha256sum -c checksums.txt`
2. Validate manifest: `npx hardhat payrox:manifest:selfcheck manifests/`
3. Deploy via manifest: `npx hardhat run scripts/deploy-via-manifest.ts`

## Support

For technical support and documentation, visit the PayRox repository.
