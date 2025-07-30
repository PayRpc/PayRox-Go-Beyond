import { ethers } from "hardhat";

async function main() {
    const [deployer] = await ethers.getSigners();
    
    // Load addresses
    const dispatcherData = require('../deployments/localhost/dispatcher.json');
    const dispatcherAddress = dispatcherData.address;
    
    console.log(`Dispatcher address: ${dispatcherAddress}`);
    
    // Get dispatcher contract using the ABI directly
    const ManifestDispatcher = await ethers.getContractFactory("ManifestDispatcher");
    const dispatcher = ManifestDispatcher.attach(dispatcherAddress);
    
    // Check the route for getFacetInfo
    const getFacetInfoSelector = "0x7ab7b94b";
    console.log(`\n--- Checking route for selector ${getFacetInfoSelector} ---`);
    
    try {
        const route = await dispatcher.getRoute(getFacetInfoSelector);
        console.log("Route found:");
        console.log("  Facet address:", route.facet);
        console.log("  Expected codehash:", route.codehash);
        
        // Check the actual codehash of the facet
        const actualCodehash = await deployer.provider.getCode(route.facet);
        const actualHash = ethers.keccak256(actualCodehash);
        console.log("  Actual codehash:", actualHash);
        console.log("  Codehash match:", route.codehash === actualHash);
        
        // Test if we can call the facet directly
        console.log("\n--- Testing direct call to facet ---");
        const ExampleFacetA = await ethers.getContractFactory("ExampleFacetA");
        const facetA = ExampleFacetA.attach(route.facet);
        
        const directResult = await facetA.getFacetInfo();
        console.log("Direct call result:", directResult);
        
    } catch (error: any) {
        console.log("Error getting route:", error.message);
    }
    
    // Let's also check if the dispatcher is properly receiving the call
    console.log("\n--- Testing with manual call data ---");
    try {
        const callData = getFacetInfoSelector; // Just the selector, no params
        console.log("Call data:", callData);
        
        const result = await deployer.provider.call({
            to: dispatcherAddress,
            data: callData
        });
        console.log("Manual call result length:", result.length);
        console.log("Manual call first 100 chars:", result.substring(0, 100));
    } catch (error: any) {
        console.log("Manual call error:", error.message);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
