import { ethers } from 'hardhat';

async function main() {
  console.log('🔍 Getting Factory Bytecode Hash...');

  const FactoryContract = await ethers.getContractFactory(
    'DeterministicChunkFactory'
  );
  const bytecodeHash = ethers.keccak256(FactoryContract.bytecode);

  console.log('Factory bytecode hash:', bytecodeHash);
  console.log('Zero hash for comparison:', ethers.ZeroHash);

  // Also check deployment bytecode
  const deployTx = await FactoryContract.getDeployTransaction(
    ethers.ZeroAddress,
    ethers.ZeroAddress,
    0,
    ethers.ZeroHash,
    ethers.ZeroHash,
    ethers.ZeroAddress
  );
  console.log('Deploy transaction data hash:', ethers.keccak256(deployTx.data));
}

main().catch(console.error);
