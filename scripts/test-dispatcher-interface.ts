import { ethers } from "hardhat";

async function main() {
    console.log("=== TESTING DISPATCHER WITH ETHERS INTERFACE ===");
    
    const [deployer] = await ethers.getSigners();
    
    // Load dispatcher address
    const dispatcherData = require('../deployments/localhost/dispatcher.json');
    const dispatcherAddress = dispatcherData.address;
    console.log("Dispatcher address:", dispatcherAddress);
    
    // Try to call the dispatcher using ExampleFacetA interface
    console.log("\n=== CALLING DISPATCHER AS FACET A ===");
    
    try {
        const ExampleFacetA = await ethers.getContractFactory("ExampleFacetA");
        const dispatcherAsFacetA = ExampleFacetA.attach(dispatcherAddress);
        
        console.log("Calling getFacetInfo() through dispatcher...");
        const result = await dispatcherAsFacetA.getFacetInfo();
        console.log("✅ SUCCESS! Dispatcher result:", result);
        
        // Test other functions
        console.log("\nTesting other functions...");
        const totalExecs = await dispatcherAsFacetA.totalExecutions();
        console.log("Total executions:", totalExecs.toString());
        
        const lastCaller = await dispatcherAsFacetA.lastCaller();
        console.log("Last caller:", lastCaller);
        
    } catch (error: any) {
        console.log("❌ Dispatcher as FacetA error:", error.message);
    }
    
    // Try calling dispatcher as FacetB
    console.log("\n=== CALLING DISPATCHER AS FACET B ===");
    
    try {
        const ExampleFacetB = await ethers.getContractFactory("ExampleFacetB");
        const dispatcherAsFacetB = ExampleFacetB.attach(dispatcherAddress);
        
        console.log("Calling getFacetInfoB() through dispatcher...");
        const resultB = await dispatcherAsFacetB.getFacetInfoB();
        console.log("✅ SUCCESS! Dispatcher FacetB result:", resultB);
        
    } catch (error: any) {
        console.log("❌ Dispatcher as FacetB error:", error.message);
    }
    
    // Test execution functions
    console.log("\n=== TESTING EXECUTION FUNCTIONS ===");
    
    try {
        const ExampleFacetA = await ethers.getContractFactory("ExampleFacetA");
        const dispatcherAsFacetA = ExampleFacetA.attach(dispatcherAddress);
        
        console.log("Calling executeA() through dispatcher...");
        const tx = await dispatcherAsFacetA.executeA("Hello from dispatcher!");
        const receipt = await tx.wait();
        console.log("✅ Execute transaction successful!");
        console.log("Gas used:", receipt?.gasUsed.toString());
        
        // Check if state was updated
        const newTotalExecs = await dispatcherAsFacetA.totalExecutions();
        console.log("New total executions:", newTotalExecs.toString());
        
    } catch (error: any) {
        console.log("❌ Execute function error:", error.message);
    }
    
    console.log("\n=== CONCLUSION ===");
    console.log("If the above calls worked, then the diamond pattern is functioning correctly!");
    console.log("The issue was that we were using raw provider.call() instead of the ethers interface.");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
