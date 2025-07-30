import { ethers } from "hardhat";

async function main() {
  const factoryAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
  const factory = await ethers.getContractAt("DeterministicChunkFactory", factoryAddress);

  console.log("🔍 Checking DeterministicChunkFactory fee settings:");
  
  const feesEnabled = await factory.feesEnabled();
  console.log("  Fees enabled:", feesEnabled);
  
  if (feesEnabled) {
    const baseFeeWei = await factory.baseFeeWei();
    console.log("  Base fee:", ethers.formatEther(baseFeeWei), "ETH");
    console.log("  Base fee wei:", baseFeeWei.toString());
  }
  
  const feeRecipient = await factory.feeRecipient();
  console.log("  Fee recipient:", feeRecipient);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
