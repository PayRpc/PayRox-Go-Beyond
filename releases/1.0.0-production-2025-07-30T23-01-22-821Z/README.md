# PayRox Release Bundle v1.0.0-production

## Release Information

- **Version:** 1.0.0-production
- **Network:** localhost
- **Timestamp:** 2025-07-30T23:05:37.000Z
- **Deployer:** 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

## Deployment

- **Dispatcher:** 0x2538a10b7fFb1B78c890c870FC152b10be121f04
- **Factory:** 0xB9d9e972100a1dD01cd441774b45b5821e136043
- **Block Number:** 358

## Components

- **ExampleFacetA:** 0x24432a08869578aAf4d1eadA12e1e78f171b1a2b (3517 bytes)\n- **ExampleFacetA:** 0x24432a08869578aAf4d1eadA12e1e78f171b1a2b (3517 bytes)\n- **ExampleFacetB:** 0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9 (3517 bytes)

## Verification

- **Manifest Hash:** 0x4aacf1130cdc71c855523c27f2d63ebb69aa389c6bb5eff46e033bdc88b69e7a
- **Merkle Root:** 0x0000000000000000000000000000000000000000000000000000000000000000
- **Route Count:** 3
- **Verified:** ❌ Failed

## Security

- **Signatures:** production-key

## Usage

1. Verify checksums: `sha256sum -c checksums.txt`
2. Validate manifest: `npx hardhat payrox:manifest:selfcheck manifests/`
3. Deploy via manifest: `npx hardhat run scripts/deploy-via-manifest.ts`

## Support

For technical support and documentation, visit the PayRox repository.
