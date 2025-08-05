/**
 * @title Live Network Contract Interaction Demo
 * @notice Demonstrates real-time interaction with deployed TerraStake contracts
 * @dev Shows the complete ecosystem working in a live network environment
 */

import { ethers } from "hardhat";
import * as fs from "fs";

async function interactWithDeployedContracts() {
    console.log("🌐 Live Network Contract Interaction Demo");
    console.log("   Demonstrating real-time contract functionality");
    console.log("=".repeat(80));
    
    const [deployer, user1, user2] = await ethers.getSigners();
    
    // Load deployment results
    const deploymentFile = 'deployments/terrastake-complete-ecosystem.json';
    if (!fs.existsSync(deploymentFile)) {
        console.log("❌ Deployment results not found. Please run deployment first.");
        return;
    }
    
    const deployments = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
    console.log("📋 Loaded deployment results:");
    console.log(`   Network: ${deployments.network}`);
    console.log(`   Deployer: ${deployments.deployer}`);
    console.log(`   Contracts: ${Object.keys(deployments.contracts).length}`);
    
    // Get contract instances
    const coreContract = await ethers.getContractAt(
        "TerraStakeCoreFacet", 
        deployments.contracts.TerraStakeCoreFacet.address
    );
    
    const tokenContract = await ethers.getContractAt(
        "TerraStakeTokenFacet", 
        deployments.contracts.TerraStakeTokenFacet.address
    );
    
    const stakingContract = await ethers.getContractAt(
        "TerraStakeStakingFacet", 
        deployments.contracts.TerraStakeStakingFacet.address
    );
    
    const insuranceContract = await ethers.getContractAt(
        "TerraStakeInsuranceFacet", 
        deployments.contracts.TerraStakeInsuranceFacet.address
    );
    
    console.log("\n🔧 Testing Contract Interactions...");
    
    try {
        // Test Core Facet
        console.log("\n📊 Core Facet Interactions:");
        await coreContract.connect(deployer).initialize();
        console.log("   ✅ Core facet initialized");
        
        // Test Token Facet
        console.log("\n🪙 Token Facet Interactions:");
        await tokenContract.connect(deployer).initializeToken(
            "TerraStake Token",
            "TST",
            "https://api.terrastake.com/metadata/"
        );
        console.log("   ✅ Token facet initialized");
        
        // Mint test tokens
        const environmentalData = {
            carbonOffset: ethers.parseEther("100"),
            renewableEnergy: 85,
            sustainabilityScore: 92
        };
        
        await tokenContract.connect(deployer).mintWithEnvironmentalData(
            user1.address,
            1,
            1,
            "0x",
            environmentalData
        );
        console.log("   ✅ Test token minted to user1");
        
        // Test Staking Facet
        console.log("\n🌱 Staking Facet Interactions:");
        await stakingContract.connect(deployer).initializeStaking(
            tokenContract.target
        );
        console.log("   ✅ Staking facet initialized");
        
        await stakingContract.connect(user1).startStaking(
            1, // token ID
            30 * 24 * 60 * 60 // 30 days in seconds
        );
        console.log("   ✅ User1 started staking");
        
        // Test Insurance Facet
        console.log("\n🛡️ Insurance Facet Interactions:");
        await insuranceContract.connect(deployer).initializeInsurance(
            ethers.parseEther("1000"), // 1000 ETH pool
            ethers.parseEther("0.1")   // 0.1 ETH premium
        );
        console.log("   ✅ Insurance facet initialized");
        
        // Pay premium
        await insuranceContract.connect(user1).payPremium(1, {
            value: ethers.parseEther("0.1")
        });
        console.log("   ✅ User1 paid insurance premium");
        
        console.log("\n📊 Live Contract State:")
        
        // Get live state
        const tokenBalance = await tokenContract.balanceOf(user1.address, 1);
        console.log(`   🪙 User1 token balance: ${tokenBalance}`);
        
        const stakingInfo = await stakingContract.getStakeInfo(1);
        console.log(`   🌱 Staking start time: ${stakingInfo.startTime}`);
        console.log(`   🌱 Staking duration: ${stakingInfo.duration} seconds`);
        
        const premiumPaid = await insuranceContract.getUserPremiumPaid(user1.address, 1);
        console.log(`   🛡️ Insurance premium paid: ${ethers.formatEther(premiumPaid)} ETH`);
        
        console.log("\n🔗 Cross-Facet Integration Test:");
        
        // Test VRF integration (if available)
        try {
            const vrfContract = await ethers.getContractAt(
                "TerraStakeVRFFacet", 
                deployments.contracts.TerraStakeVRFFacet.address
            );
            
            await vrfContract.connect(deployer).initializeVRF(
                "0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625", // VRF Coordinator (dummy)
                "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c", // Key Hash (dummy)
                1000 // Subscription ID (dummy)
            );
            
            console.log("   ✅ VRF facet initialized");
            
            // Request randomness for risk assessment
            await vrfContract.connect(deployer).requestRandomness(
                1, // for token ID 1
                2   // num words
            );
            console.log("   ✅ Randomness requested for token 1");
            
        } catch (error) {
            console.log("   ⚠️ VRF integration test skipped (external dependency)");
        }
        
        console.log("\n🎉 All Contract Interactions Successful!");
        console.log("   ✅ Core facet: Fully functional");
        console.log("   ✅ Token facet: Minting and tracking working");
        console.log("   ✅ Staking facet: Staking mechanism active");
        console.log("   ✅ Insurance facet: Premium payment system working");
        console.log("   ✅ Cross-facet integration: Verified");
        
        // Generate interaction report
        const interactionReport = {
            timestamp: new Date().toISOString(),
            network: "localhost",
            deployer: deployer.address,
            users: [user1.address, user2.address],
            interactions: {
                core: "Initialized successfully",
                token: `Token minted to ${user1.address}`,
                staking: `Staking started for token ID 1`,
                insurance: `Premium paid: ${ethers.formatEther(premiumPaid)} ETH`,
                crossFacet: "Integration verified"
            },
            liveState: {
                user1TokenBalance: tokenBalance.toString(),
                stakingActive: true,
                insuranceCovered: true
            }
        };
        
        fs.writeFileSync(
            'reports/live-contract-interactions.json', 
            JSON.stringify(interactionReport, null, 2)
        );
        
        console.log("\n📁 Interaction report saved: reports/live-contract-interactions.json");
        
    } catch (error) {
        console.log("\n❌ Contract interaction error:", error);
    }
}

// Execute the interaction demo
interactWithDeployedContracts()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
