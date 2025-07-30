import { ethers } from "hardhat";

async function main() {
    const [deployer] = await ethers.getSigners();
    
    // Load addresses
    const dispatcherData = require('../deployments/localhost/dispatcher.json');
    const dispatcherAddress = dispatcherData.address;
    
    console.log(`Dispatcher address: ${dispatcherAddress}`);
    
    // Get dispatcher contract
    const dispatcher = await ethers.getContractAt("ManifestDispatcher", dispatcherAddress);
    
    // Try calling getFacetInfo() directly on dispatcher
    try {
        console.log("\n--- Testing getFacetInfo() call ---");
        const result = await dispatcher.getFacetInfo();
        console.log("getFacetInfo() result:", result);
    } catch (error: any) {
        console.log("getFacetInfo() error:", error.message);
        
        // Try to decode the error data
        if (error.data) {
            console.log("Error data (hex):", error.data);
            
            // Check if it's contract bytecode
            if (error.data.length > 100) {
                console.log("This looks like contract bytecode (length:", error.data.length, "chars)");
                console.log("First 100 chars:", error.data.substring(0, 100));
            }
        }
    }
    
    // Check if the dispatcher has the route for getFacetInfo
    const getFacetInfoSelector = "0x7ab7b94b";
    console.log("\n--- Checking route for getFacetInfo ---");
    
    try {
        const route = await dispatcher.getRoute(getFacetInfoSelector);
        console.log("Route for getFacetInfo:", route);
    } catch (error: any) {
        console.log("Error getting route:", error.message);
    }
    
    // Check dispatcher's own code
    console.log("\n--- Dispatcher contract info ---");
    const dispatcherCode = await deployer.provider.getCode(dispatcherAddress);
    console.log("Dispatcher code length:", dispatcherCode.length);
    console.log("Dispatcher code starts with:", dispatcherCode.substring(0, 50));
    
    // Check if dispatcher has the fallback function
    console.log("\n--- Testing static call to see what happens ---");
    try {
        const staticCallData = await deployer.provider.call({
            to: dispatcherAddress,
            data: getFacetInfoSelector
        });
        console.log("Static call result:", staticCallData);
        console.log("Static call result length:", staticCallData.length);
    } catch (error: any) {
        console.log("Static call error:", error.message);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
