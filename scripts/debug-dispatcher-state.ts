import { ethers } from "hardhat";

async function main() {
    const [deployer] = await ethers.getSigners();
    
    // Load dispatcher
    const dispatcherData = require('../deployments/localhost/dispatcher.json');
    const dispatcherAddress = dispatcherData.address;
    console.log(`Dispatcher address: ${dispatcherAddress}`);
    
    // Get dispatcher contract
    const ManifestDispatcher = await ethers.getContractFactory("ManifestDispatcher");
    const dispatcher = ManifestDispatcher.attach(dispatcherAddress);
    
    try {
        console.log("\n=== DISPATCHER STATE ===");
        
        // Check basic state
        const paused = await dispatcher.paused();
        console.log("Paused:", paused);
        
        const frozen = await dispatcher.frozen();
        console.log("Frozen:", frozen);
        
        // Check epoch info
        const activeEpoch = await dispatcher.activeEpoch();
        console.log("Active epoch:", activeEpoch.toString());
        
        // Check if there's a pending root
        try {
            const pendingRoot = await dispatcher.pendingRoot();
            console.log("Pending root:", pendingRoot);
        } catch (error: any) {
            console.log("No pending root or error:", error.message);
        }
        
        // Check the active root
        try {
            const activeRoot = await dispatcher.activeRoot();
            console.log("Active root:", activeRoot);
        } catch (error: any) {
            console.log("No active root or error:", error.message);
        }
        
        // Check if we can find any routes
        console.log("\n=== ROUTE TESTING ===");
        const testSelectors = [
            "0x7ab7b94b", // getFacetInfo
            "0x3c7264b2", // getFacetInfoB
            "0x03e8837c", // first selector from manifest
        ];
        
        for (const selector of testSelectors) {
            try {
                const result = await deployer.provider.call({
                    to: dispatcherAddress,
                    data: selector
                });
                
                if (result === "0x") {
                    console.log(`${selector}: Empty response (no route)`);
                } else if (result.length > 1000) {
                    console.log(`${selector}: Returns bytecode (${result.length} chars)`);
                } else {
                    console.log(`${selector}: Returns data (${result.length} chars): ${result}`);
                }
            } catch (error: any) {
                console.log(`${selector}: Error - ${error.message}`);
            }
        }
        
        // Check roles
        console.log("\n=== PERMISSIONS ===");
        const COMMIT_ROLE = await dispatcher.COMMIT_ROLE();
        const APPLY_ROLE = await dispatcher.APPLY_ROLE();
        
        console.log("COMMIT_ROLE:", COMMIT_ROLE);
        console.log("APPLY_ROLE:", APPLY_ROLE);
        
        const hasCommitRole = await dispatcher.hasRole(COMMIT_ROLE, deployer.address);
        const hasApplyRole = await dispatcher.hasRole(APPLY_ROLE, deployer.address);
        
        console.log("Deployer has COMMIT_ROLE:", hasCommitRole);
        console.log("Deployer has APPLY_ROLE:", hasApplyRole);
        
    } catch (error: any) {
        console.log("Error checking dispatcher state:", error.message);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
