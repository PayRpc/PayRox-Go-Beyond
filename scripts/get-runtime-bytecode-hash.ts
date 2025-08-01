import { artifacts, ethers } from 'hardhat';

async function main() {
  console.log('🔍 Getting Factory Runtime Bytecode Hash...');

  const FactoryContract = await ethers.getContractFactory(
    'DeterministicChunkFactory'
  );

  // The creation bytecode includes constructor parameters
  const creationBytecode = FactoryContract.bytecode;
  console.log('Creation bytecode hash:', ethers.keccak256(creationBytecode));

  // To get runtime bytecode, we need to extract it from the contract factory
  // The runtime bytecode is what gets stored on-chain after deployment
  const artifact = await artifacts.readArtifact('DeterministicChunkFactory');
  const runtimeBytecode = artifact.deployedBytecode;
  const runtimeBytecodeHash = ethers.keccak256(runtimeBytecode);

  console.log('Runtime bytecode hash:', runtimeBytecodeHash);
  console.log(
    'This hash should be used in factory constructor as expectedFactoryBytecodeHash'
  );

  // Also show what empty bytecode hash looks like (for debugging)
  console.log('Empty bytecode hash:', ethers.keccak256('0x'));
}

main().catch(console.error);
