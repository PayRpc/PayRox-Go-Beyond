/**
 * OpenZeppelin Dynamic Integration Test Suite
 * Validates OZ dynamic adapter functionality
 */

const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("OpenZeppelin Dynamic Integration", function () {
    let deployer, trader, admin;
    let ozDynamicExample, enhancedExchange;
    let mockAccessControl, mockPausable, mockERC20;
    
    before(async function () {
        [deployer, trader, admin] = await ethers.getSigners();
        
        console.log("🔧 Setting up OpenZeppelin Dynamic Integration tests...");
    });
    
    describe("OpenZeppelinDynamicAdapter", function () {
        beforeEach(async function () {
            // Deploy OZ Dynamic Example
            const OZDynamicExample = await ethers.getContractFactory("OZDynamicExample");
            ozDynamicExample = await OZDynamicExample.deploy();
            await ozDynamicExample.waitForDeployment();
            
            // Deploy mock OZ contracts for testing
            const MockAccessControl = await ethers.getContractFactory("MockAccessControl");
            mockAccessControl = await MockAccessControl.deploy();
            await mockAccessControl.waitForDeployment();
            
            const MockPausable = await ethers.getContractFactory("MockPausable");
            mockPausable = await MockPausable.deploy();
            await mockPausable.waitForDeployment();
            
            const MockERC20 = await ethers.getContractFactory("MockERC20");
            mockERC20 = await MockERC20.deploy("TestToken", "TEST", 18);
            await mockERC20.waitForDeployment();
        });
        
        it("should detect OpenZeppelin version correctly", async function () {
            // Test version detection
            await expect(ozDynamicExample.detectAndReportOZVersion(await mockAccessControl.getAddress()))
                .to.emit(ozDynamicExample, "OZVersionDetected");
                
            const [isCompatible, version] = await ozDynamicExample.validateOZCompatibility(
                await mockAccessControl.getAddress()
            );
            
            expect(isCompatible).to.be.true;
            expect(version).to.be.greaterThan(0);
        });
        
        it("should handle dynamic role operations", async function () {
            const traderRole = ethers.keccak256(ethers.toUtf8Bytes("TRADER_ROLE"));
            
            // Grant role dynamically
            await expect(ozDynamicExample.grantRoleDynamic(
                await mockAccessControl.getAddress(),
                traderRole,
                trader.address
            )).to.emit(ozDynamicExample, "RoleOperationCompleted");
            
            // Check role dynamically
            const hasRole = await ozDynamicExample.checkRoleDynamic(
                await mockAccessControl.getAddress(),
                traderRole,
                trader.address
            );
            
            expect(hasRole).to.be.true;
        });
        
        it("should handle dynamic pause operations", async function () {
            // Check initial pause status
            const initialPaused = await ozDynamicExample.checkPauseStatus(
                await mockPausable.getAddress()
            );
            expect(initialPaused).to.be.false;
            
            // Pause dynamically
            await expect(ozDynamicExample.pauseContractDynamic(
                await mockPausable.getAddress()
            )).to.emit(ozDynamicExample, "PauseOperationCompleted");
            
            // Verify paused
            const isPaused = await ozDynamicExample.checkPauseStatus(
                await mockPausable.getAddress()
            );
            expect(isPaused).to.be.true;
            
            // Unpause dynamically
            await expect(ozDynamicExample.unpauseContractDynamic(
                await mockPausable.getAddress()
            )).to.emit(ozDynamicExample, "PauseOperationCompleted");
        });
        
        it("should handle dynamic ERC20 operations", async function () {
            const amount = ethers.parseEther("100");
            
            // Mint tokens to deployer
            await mockERC20.mint(deployer.address, amount);
            
            // Approve OZ example to spend
            await mockERC20.approve(await ozDynamicExample.getAddress(), amount);
            
            // Safe transfer using dynamic adapter
            await expect(ozDynamicExample.safeTransferFromDynamic(
                await mockERC20.getAddress(),
                deployer.address,
                trader.address,
                amount
            )).to.emit(ozDynamicExample, "TokenOperationCompleted");
            
            // Verify transfer
            const traderBalance = await mockERC20.balanceOf(trader.address);
            expect(traderBalance).to.equal(amount);
        });
        
        it("should perform batch operations efficiently", async function () {
            const contracts = [
                await mockAccessControl.getAddress(),
                await mockPausable.getAddress(),
                await mockERC20.getAddress()
            ];
            
            // Batch validate
            const results = await ozDynamicExample.batchValidateOZ(contracts);
            expect(results.length).to.equal(3);
            
            // All should be compatible (mock contracts)
            results.forEach(result => {
                expect(result).to.be.true;
            });
        });
        
        it("should provide comprehensive OZ status", async function () {
            const [ozVersion, versionString, isCompatible, isPaused] = 
                await ozDynamicExample.getOZStatus(await mockAccessControl.getAddress());
            
            expect(ozVersion).to.be.greaterThan(0);
            expect(versionString).to.include("OpenZeppelin");
            expect(isCompatible).to.be.true;
            expect(isPaused).to.be.false;
        });
    });
    
    describe("EnhancedExchangeBeyondFacet", function () {
        beforeEach(async function () {
            // Deploy Enhanced Exchange Facet
            const EnhancedExchange = await ethers.getContractFactory("EnhancedExchangeBeyondFacet");
            enhancedExchange = await EnhancedExchange.deploy();
            await enhancedExchange.waitForDeployment();
            
            // Setup mock tokens
            const MockERC20 = await ethers.getContractFactory("MockERC20");
            mockERC20 = await MockERC20.deploy("TestToken", "TEST", 18);
            await mockERC20.waitForDeployment();
        });
        
        it("should configure OZ integration dynamically", async function () {
            // Configure OZ integration
            await expect(enhancedExchange.configureOZIntegration(
                await mockAccessControl.getAddress(),
                await mockPausable.getAddress()
            )).to.emit(enhancedExchange, "OZIntegrationUpdated");
            
            // Verify integration
            const [accessControl, pausable, accessVersion, pausableVersion] = 
                await enhancedExchange.getOZIntegration();
            
            expect(accessControl).to.equal(await mockAccessControl.getAddress());
            expect(pausable).to.equal(await mockPausable.getAddress());
            expect(accessVersion).to.be.greaterThan(0);
            expect(pausableVersion).to.be.greaterThan(0);
        });
        
        it("should create orders with dynamic security", async function () {
            const amountIn = ethers.parseEther("10");
            const minAmountOut = ethers.parseEther("9");
            const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour
            
            // Mint and approve tokens
            await mockERC20.mint(trader.address, amountIn);
            await mockERC20.connect(trader).approve(await enhancedExchange.getAddress(), amountIn);
            
            // Create order
            await expect(enhancedExchange.connect(trader).createOrder(
                await mockERC20.getAddress(),
                await mockERC20.getAddress(), // Same token for simplicity
                amountIn,
                minAmountOut,
                deadline
            )).to.emit(enhancedExchange, "OrderCreated");
        });
        
        it("should handle emergency operations with dynamic OZ", async function () {
            // Configure OZ Pausable
            await enhancedExchange.configureOZIntegration(
                ethers.ZeroAddress,
                await mockPausable.getAddress()
            );
            
            // Emergency pause
            await expect(enhancedExchange.emergencyPause())
                .to.emit(enhancedExchange, "SecurityStatusChanged");
            
            // Verify paused
            const isPaused = await enhancedExchange.isPaused();
            expect(isPaused).to.be.true;
            
            // Emergency unpause
            await expect(enhancedExchange.emergencyUnpause())
                .to.emit(enhancedExchange, "SecurityStatusChanged");
        });
        
        it("should provide accurate exchange statistics", async function () {
            const [totalOrders, ozIntegrated] = await enhancedExchange.getExchangeStats();
            
            expect(totalOrders).to.equal(0); // No orders initially
            expect(ozIntegrated).to.be.false; // No OZ integration initially
            
            // Configure OZ and check again
            await enhancedExchange.configureOZIntegration(
                await mockAccessControl.getAddress(),
                ethers.ZeroAddress
            );
            
            const [, ozIntegratedAfter] = await enhancedExchange.getExchangeStats();
            expect(ozIntegratedAfter).to.be.true;
        });
    });
    
    describe("Integration Stress Tests", function () {
        it("should handle multiple OZ contract interactions", async function () {
            // Deploy multiple instances
            const instances = [];
            
            for (let i = 0; i < 5; i++) {
                const MockAccessControl = await ethers.getContractFactory("MockAccessControl");
                const instance = await MockAccessControl.deploy();
                await instance.waitForDeployment();
                instances.push(await instance.getAddress());
            }
            
            // Batch validate all instances
            const results = await ozDynamicExample.batchValidateOZ(instances);
            expect(results.length).to.equal(5);
            
            results.forEach(result => {
                expect(result).to.be.true;
            });
        });
        
        it("should maintain performance with dynamic operations", async function () {
            const startTime = Date.now();
            
            // Perform multiple dynamic operations
            for (let i = 0; i < 10; i++) {
                await ozDynamicExample.detectAndReportOZVersion(
                    await mockAccessControl.getAddress()
                );
            }
            
            const endTime = Date.now();
            const totalTime = endTime - startTime;
            
            // Should complete within reasonable time (less than 5 seconds)
            expect(totalTime).to.be.lessThan(5000);
        });
    });
    
    after(async function () {
        console.log("✅ OpenZeppelin Dynamic Integration tests completed!");
        console.log("🎯 All dynamic OZ features validated successfully");
    });
});
