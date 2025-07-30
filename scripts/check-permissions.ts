import { ethers } from "hardhat";

async function main() {
  console.log("🔍 Checking dispatcher permissions...");

  const dispatcher = await ethers.getContractAt("ManifestDispatcher", "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0");
  const [signer] = await ethers.getSigners();
  
  console.log("Account:", signer.address);
  
  // Check roles
  const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";
  const COMMIT_ROLE = ethers.keccak256(ethers.toUtf8Bytes("COMMIT_ROLE"));
  const APPLY_ROLE = ethers.keccak256(ethers.toUtf8Bytes("APPLY_ROLE"));
  
  const hasAdmin = await dispatcher.hasRole(DEFAULT_ADMIN_ROLE, signer.address);
  const hasCommit = await dispatcher.hasRole(COMMIT_ROLE, signer.address);
  const hasApply = await dispatcher.hasRole(APPLY_ROLE, signer.address);
  
  console.log("Permissions:");
  console.log("  DEFAULT_ADMIN_ROLE:", hasAdmin);
  console.log("  COMMIT_ROLE:", hasCommit);
  console.log("  APPLY_ROLE:", hasApply);
  
  if (!hasCommit) {
    console.log("\n🔧 Granting COMMIT_ROLE...");
    const grantTx = await dispatcher.grantRole(COMMIT_ROLE, signer.address);
    await grantTx.wait();
    console.log("✅ COMMIT_ROLE granted");
  }
  
  if (!hasApply) {
    console.log("\n🔧 Granting APPLY_ROLE...");
    const grantTx = await dispatcher.grantRole(APPLY_ROLE, signer.address);
    await grantTx.wait();
    console.log("✅ APPLY_ROLE granted");
  }
  
  console.log("\n✅ Permission check complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
