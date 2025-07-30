import { ethers } from "hardhat";

async function main() {
    const [deployer] = await ethers.getSigners();
    
    // Load addresses
    const dispatcherData = require('../deployments/localhost/dispatcher.json');
    const dispatcherAddress = dispatcherData.address;
    
    // Load facet addresses from the manifest
    const manifestData = require('../manifests/current.manifest.json');
    const facetA = manifestData.facets.find((f: any) => f.name === "ExampleFacetA");
    const facetB = manifestData.facets.find((f: any) => f.name === "ExampleFacetB");
    
    console.log("FacetA address:", facetA.address);
    console.log("FacetB address:", facetB.address);
    
    // Check if the facets work when called directly
    console.log("\n=== DIRECT FACET CALLS ===");
    
    try {
        const ExampleFacetA = await ethers.getContractFactory("ExampleFacetA");
        const facetAContract = ExampleFacetA.attach(facetA.address);
        
        const resultA = await facetAContract.getFacetInfo();
        console.log("FacetA direct call result:", resultA);
    } catch (error: any) {
        console.log("FacetA direct call error:", error.message);
    }
    
    try {
        const ExampleFacetB = await ethers.getContractFactory("ExampleFacetB");
        const facetBContract = ExampleFacetB.attach(facetB.address);
        
        const resultB = await facetBContract.getFacetInfoB();
        console.log("FacetB direct call result:", resultB);
    } catch (error: any) {
        console.log("FacetB direct call error:", error.message);
    }
    
    // Check codehashes
    console.log("\n=== CODEHASH VERIFICATION ===");
    
    const facetACode = await deployer.provider.getCode(facetA.address);
    const facetACodehash = ethers.keccak256(facetACode);
    console.log("FacetA expected codehash:", facetA.runtimeCodehash);
    console.log("FacetA actual codehash:  ", facetACodehash);
    console.log("FacetA codehash match:", facetA.runtimeCodehash === facetACodehash);
    
    const facetBCode = await deployer.provider.getCode(facetB.address);
    const facetBCodehash = ethers.keccak256(facetBCode);
    console.log("FacetB expected codehash:", facetB.runtimeCodehash);
    console.log("FacetB actual codehash:  ", facetBCodehash);
    console.log("FacetB codehash match:", facetB.runtimeCodehash === facetBCodehash);
    
    // Let's try to decode what the dispatcher is returning
    console.log("\n=== DISPATCHER RESPONSE ANALYSIS ===");
    
    const getFacetInfoSelector = "0x7ab7b94b";
    const response = await deployer.provider.call({
        to: dispatcherAddress,
        data: getFacetInfoSelector
    });
    
    console.log("Dispatcher response length:", response.length);
    console.log("FacetA bytecode length:", facetACode.length);
    console.log("Response matches FacetA bytecode:", response === facetACode);
    
    // Check if the response is actually the runtime code
    if (response === facetACode) {
        console.log("🔍 The dispatcher is returning the facet's runtime bytecode!");
        console.log("This suggests the DELEGATECALL is failing and falling back to something else.");
    }
    
    // Let's check if there's an issue with the assembly in the fallback
    console.log("\n=== FALLBACK ASSEMBLY DEBUG ===");
    
    // Try a very simple call with minimal data
    const minimalResponse = await deployer.provider.call({
        to: dispatcherAddress,
        data: getFacetInfoSelector,
        gasLimit: 1000000 // ensure enough gas
    });
    
    console.log("Minimal call response length:", minimalResponse.length);
    console.log("Still returns bytecode:", minimalResponse === facetACode);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
