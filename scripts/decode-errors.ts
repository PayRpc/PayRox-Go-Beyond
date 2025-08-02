import { ethers } from 'hardhat';

async function main() {
  // Error signatures from the log
  const errorSig1 = '0xdfcd25ba';
  const errorSig2 = '0x6586e129';

  console.log('🔍 Analyzing Error Signatures...\n');

  // Common errors from EnhancedManifestDispatcher
  const errors = [
    'FrozenError()',
    'ManifestMismatch(bytes32,bytes32)',
    'CodehashMismatch()',
    'NoRoute()',
    'InvalidSelector()',
    'AlreadyApplied(bytes32)',
    'HashNotCommitted(bytes32)',
    'Unauthorized(address)',
    'InvalidDelay(uint256)',
    'RotationNotReady(uint64,uint64)',
    'AlreadyPending()',
    'InvalidNonce(uint256,uint256)',
    'OperationNotReady(uint64,uint64)',
    'OperationExists(uint256)',
    'ETATooEarly(uint64,uint64)',
    'InvalidManifestLength()',
    'ChunkTooBig()',
    'InvalidChunk()',
    'InvalidNonce(uint256,uint256)',
    'EmptyCommittedHash()',
    'NoCommittedManifest()',
    'ManifestAlreadyActive()',
  ];

  console.log(`Checking against ${errors.length} known errors...`);

  for (const errorDef of errors) {
    const hash = ethers.keccak256(ethers.toUtf8Bytes(errorDef)).slice(0, 10);
    if (hash === errorSig1) {
      console.log(`✅ ${errorSig1} = ${errorDef}`);
    }
    if (hash === errorSig2) {
      console.log(`✅ ${errorSig2} = ${errorDef}`);
    }
  }

  console.log(`\n🎯 Target signatures: ${errorSig1}, ${errorSig2}`);
}

main().catch(console.error);
