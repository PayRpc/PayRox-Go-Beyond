import { ethers } from "hardhat";

async function main() {
    console.log("=== FACET CONTRACT VERIFICATION ===");
    
    // Load the manifest to get facet addresses
    const manifestData = require('../manifests/current.manifest.json');
    const facetA = manifestData.facets.find((f: any) => f.name === "ExampleFacetA");
    const facetB = manifestData.facets.find((f: any) => f.name === "ExampleFacetB");
    
    console.log("FacetA address:", facetA.address);
    console.log("FacetB address:", facetB.address);
    
    // Let's check if these contracts actually have the expected functions
    // by inspecting their bytecode and selectors
    
    const provider = ethers.provider;
    
    // Check FacetA
    console.log("\n=== FACET A ANALYSIS ===");
    const facetACode = await provider.getCode(facetA.address);
    console.log("FacetA code length:", facetACode.length);
    
    // Check for function selectors in the bytecode
    const getFacetInfoSelector = "7ab7b94b"; // without 0x
    const selectorInCode = facetACode.includes(getFacetInfoSelector);
    console.log(`getFacetInfo selector (${getFacetInfoSelector}) found in bytecode:`, selectorInCode);
    
    // Try to get the contract factory and check the ABI
    console.log("\n=== CONTRACT FACTORY CHECK ===");
    try {
        const ExampleFacetA = await ethers.getContractFactory("ExampleFacetA");
        console.log("ExampleFacetA factory loaded successfully");
        
        // Check the interface
        const iface = ExampleFacetA.interface;
        console.log("Interface fragments:", iface.fragments.length);
        
        // Check if getFacetInfo is in the interface
        try {
            const func = iface.getFunction('getFacetInfo');
            if (func) {
                console.log("getFacetInfo function found in interface:");
                console.log("  selector:", func.selector);
                console.log("  signature:", func.format());
            }
        } catch (error: any) {
            console.log("getFacetInfo function NOT found in interface!");
        }
        
    } catch (error: any) {
        console.log("Error loading contract factory:", error.message);
    }
    
    // Let's try a completely different approach - use low-level calls
    console.log("\n=== LOW-LEVEL CALL TEST ===");
    
    const [deployer] = await ethers.getSigners();
    
    try {
        // Try calling a simple function that should return a small value
        const result = await deployer.provider.call({
            to: facetA.address,
            data: "0x7ab7b94b" // getFacetInfo selector
        });
        
        console.log("Low-level call result length:", result.length);
        
        if (result.length > 100) {
            console.log("Result is contract bytecode (starts with):", result.substring(0, 100));
            
            // This suggests the contract is somehow returning its own code
            // Let's check if this is a proxy pattern gone wrong
            console.log("\n=== PROXY PATTERN CHECK ===");
            
            // Check if the contract has a fallback that returns its code
            const emptyCallResult = await deployer.provider.call({
                to: facetA.address,
                data: "0x"
            });
            console.log("Empty call result length:", emptyCallResult.length);
            console.log("Empty call returns code:", emptyCallResult === facetACode);
            
        } else {
            console.log("Normal result:", result);
        }
        
    } catch (error: any) {
        console.log("Low-level call error:", error.message);
    }
    
    // Check if we deployed the wrong contracts
    console.log("\n=== DEPLOYMENT CHECK ===");
    console.log("Expected bytecode hash from manifest:", facetA.bytecodeHash);
    console.log("Actual bytecode hash:", ethers.keccak256(facetACode));
    
    // Let's also check the transaction that deployed this contract
    try {
        const deployTx = await provider.getTransaction(facetA.deploymentTx || "");
        if (deployTx) {
            console.log("Deployment transaction found");
            console.log("Transaction data length:", deployTx.data.length);
        }
    } catch (error: any) {
        console.log("Could not find deployment transaction");
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
