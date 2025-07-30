import { ethers } from "hardhat";

async function main() {
    console.log("=== FRESH DEPLOYMENT TEST ===");
    
    const [deployer] = await ethers.getSigners();
    
    // Deploy a fresh instance of ExampleFacetA
    console.log("Deploying fresh ExampleFacetA...");
    const ExampleFacetA = await ethers.getContractFactory("ExampleFacetA");
    const freshFacetA = await ExampleFacetA.deploy();
    await freshFacetA.waitForDeployment();
    
    const freshAddress = await freshFacetA.getAddress();
    console.log("Fresh FacetA deployed to:", freshAddress);
    
    // Test the fresh instance
    console.log("\n=== TESTING FRESH INSTANCE ===");
    
    try {
        console.log("Calling getFacetInfo() on fresh instance...");
        const result = await freshFacetA.getFacetInfo();
        console.log("Fresh instance result:", result);
        console.log("SUCCESS: Fresh instance works correctly!");
        
    } catch (error: any) {
        console.log("Fresh instance error:", error.message);
        
        if (error.message.includes("invalid length for result data")) {
            console.log("Fresh instance ALSO returns bytecode - this is a Hardhat/provider issue!");
        }
    }
    
    // Test with low-level call on fresh instance
    console.log("\n=== LOW-LEVEL TEST ON FRESH INSTANCE ===");
    
    try {
        const lowLevelResult = await deployer.provider.call({
            to: freshAddress,
            data: "0x7ab7b94b" // getFacetInfo selector
        });
        
        console.log("Low-level call result length:", lowLevelResult.length);
        
        if (lowLevelResult.length > 100) {
            console.log("Fresh instance ALSO returns bytecode via low-level call!");
            console.log("This confirms the issue is NOT with the manifest deployment.");
        } else {
            console.log("Fresh instance works correctly with low-level call:");
            console.log("Result:", lowLevelResult);
        }
        
    } catch (error: any) {
        console.log("Low-level call error:", error.message);
    }
    
    // Compare the original deployed address with the fresh one
    console.log("\n=== COMPARISON ===");
    const manifestData = require('../manifests/current.manifest.json');
    const originalFacetA = manifestData.facets.find((f: any) => f.name === "ExampleFacetA");
    console.log("Original FacetA address:", originalFacetA.address);
    console.log("Fresh FacetA address:   ", freshAddress);
    
    // Check if they have the same bytecode
    const originalCode = await deployer.provider.getCode(originalFacetA.address);
    const freshCode = await deployer.provider.getCode(freshAddress);
    
    console.log("Bytecode lengths match:", originalCode.length === freshCode.length);
    console.log("Bytecode content match:", originalCode === freshCode);
    
    if (originalCode === freshCode) {
        console.log("✅ Both instances have identical bytecode");
        console.log("✅ The issue is likely with the Hardhat local network or provider");
    } else {
        console.log("❌ Different bytecode - investigating deployment differences");
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
