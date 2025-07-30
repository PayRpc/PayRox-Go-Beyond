import { ethers } from "hardhat";

async function main() {
  const dispatcher = await ethers.getContractAt("ManifestDispatcher", "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0");
  console.log("Dispatcher paused:", await dispatcher.paused());
}

main().catch(console.error);
