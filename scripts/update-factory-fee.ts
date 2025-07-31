import { HardhatRuntimeEnvironment } from 'hardhat/types';

export async function main(hre: HardhatRuntimeEnvironment) {
  console.log('🔧 Updating factory fee...');

  const { ethers } = hre;
  const [signer] = await ethers.getSigners();

  // Connect to existing factory
  const factoryAddress = '0xD8a5a9b31c3C0232E196d518E89Fd8bF83AcAd43';
  const factory = await ethers.getContractAt(
    'DeterministicChunkFactory',
    factoryAddress,
    signer
  );

  // Update fee to 0.0007 ETH
  const newFee = ethers.parseEther('0.0007');
  const tx = await factory.setFees(newFee, true, signer.address);
  await tx.wait();

  console.log('✅ Factory fee updated to 0.0007 ETH');

  // Verify the update
  const currentFee = await factory.baseFeeWei();
  console.log(`📊 Current fee: ${ethers.formatEther(currentFee)} ETH`);
}

if (require.main === module) {
  const hre: HardhatRuntimeEnvironment = require('hardhat');
  main(hre)
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}
