import { ethers } from "hardhat";

async function main() {
    const [deployer] = await ethers.getSigners();
    
    // Load addresses
    const dispatcherData = require('../deployments/localhost/dispatcher.json');
    const dispatcherAddress = dispatcherData.address;
    
    console.log(`Dispatcher address: ${dispatcherAddress}`);
    
    // Test 1: Check if dispatcher has a receive() function
    console.log("\n--- Testing empty call (should hit receive) ---");
    try {
        const emptyResult = await deployer.provider.call({
            to: dispatcherAddress,
            data: "0x"
        });
        console.log("Empty call result:", emptyResult);
    } catch (error: any) {
        console.log("Empty call error:", error.message);
    }
    
    // Test 2: Check with a non-existent selector
    console.log("\n--- Testing non-existent selector ---");
    try {
        const badResult = await deployer.provider.call({
            to: dispatcherAddress,
            data: "0x12345678" // random selector
        });
        console.log("Bad selector result:", badResult);
    } catch (error: any) {
        console.log("Bad selector error (expected):", error.message);
    }
    
    // Test 3: Let's manually check what's at the route storage location
    console.log("\n--- Testing storage inspection ---");
    
    // The routes mapping is at slot 7 (based on the contract storage layout)
    // routes[bytes4] => Route struct
    const getFacetInfoSelector = "0x7ab7b94b";
    const selectorBytes = ethers.zeroPadValue(getFacetInfoSelector, 32);
    const slot7 = ethers.zeroPadValue("0x07", 32); // routes mapping slot
    const storageKey = ethers.keccak256(ethers.concat([selectorBytes, slot7]));
    
    console.log("Storage key for routes[0x7ab7b94b]:", storageKey);
    
    const routeData = await deployer.provider.getStorage(dispatcherAddress, storageKey);
    console.log("Route storage data:", routeData);
    
    if (routeData !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
        console.log("Route exists in storage!");
        // The route struct contains: address facet (20 bytes) + bytes32 codehash
        // Address is stored in the lower 20 bytes of the first word
        const facetAddress = "0x" + routeData.slice(-40);
        console.log("Facet address from storage:", facetAddress);
        
        // Get the codehash from the next storage slot
        const codehashSlot = ethers.toBeHex(ethers.toBigInt(storageKey) + 1n);
        const codehashData = await deployer.provider.getStorage(dispatcherAddress, codehashSlot);
        console.log("Expected codehash:", codehashData);
        
        // Check actual codehash
        const actualCode = await deployer.provider.getCode(facetAddress);
        const actualCodehash = ethers.keccak256(actualCode);
        console.log("Actual codehash:", actualCodehash);
        console.log("Codehash match:", codehashData === actualCodehash);
    } else {
        console.log("No route found in storage - this is the problem!");
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
