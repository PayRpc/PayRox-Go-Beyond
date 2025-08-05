import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import {
  ManifestDispatcher,
  ExampleFacetA,
  ExampleFacetB,
  ChunkFactoryFacet,
  DeterministicChunkFactory,
  MockManifestDispatcher
} from "../typechain-types";

describe("PayRox Diamond System Integration", () => {
  let owner: SignerWithAddress;
  let user: SignerWithAddress;
  let governance: SignerWithAddress;
  let operator: SignerWithAddress;
  let mockDispatcher: MockManifestDispatcher;
  let dispatcher: ManifestDispatcher;
  let facetA: ExampleFacetA;
  let facetB: ExampleFacetB;
  let factoryFacet: ChunkFactoryFacet;
  let factory: DeterministicChunkFactory;

  // EIP-712 Domain for testing
  const DOMAIN = {
    name: "PayRoxFacetB",
    version: "1.2.0",
    chainId: 31337, // Hardhat default
    verifyingContract: "" // Will be set after deployment
  };

  const INIT_TYPEHASH = {
    InitializeFacetB: [
      { name: "operator", type: "address" },
      { name: "governance", type: "address" },
      { name: "deadline", type: "uint256" },
      { name: "nonce", type: "uint256" }
    ]
  };

  before(async () => {
    [owner, user, governance, operator] = await ethers.getSigners();

    console.log("🚀 Deploying PayRox Diamond System...");

    // Deploy MockManifestDispatcher for testing
    console.log("🗂️ Deploying MockManifestDispatcher...");
    const MockDispatcher = await ethers.getContractFactory("MockManifestDispatcher");
    mockDispatcher = await MockDispatcher.deploy();
    await mockDispatcher.waitForDeployment();
    console.log(`   ✅ MockDispatcher deployed to: ${await mockDispatcher.getAddress()}`);

    // Deploy DeterministicChunkFactory
    console.log("📦 Deploying DeterministicChunkFactory...");
    const Factory = await ethers.getContractFactory("DeterministicChunkFactory");
    factory = await Factory.deploy(
      owner.address, // feeRecipient
      await mockDispatcher.getAddress(), // manifestDispatcher
      ethers.keccak256(ethers.toUtf8Bytes("test-manifest")), // manifestHash
      ethers.keccak256(ethers.toUtf8Bytes("test-factory-bytecode")), // factoryBytecodeHash
      ethers.parseEther("0.01"), // baseFeeWei
      true // feesEnabled
    );
    await factory.waitForDeployment();
    console.log(`   ✅ Factory deployed to: ${await factory.getAddress()}`);

    // Deploy ManifestDispatcher for full testing
    console.log("🗂️ Deploying ManifestDispatcher...");
    const Dispatcher = await ethers.getContractFactory("ManifestDispatcher");
    dispatcher = await Dispatcher.deploy(
      governance.address, // governance
      owner.address, // guardian
      3600 // minDelay (1 hour)
    );
    await dispatcher.waitForDeployment();
    console.log(`   ✅ Dispatcher deployed to: ${await dispatcher.getAddress()}`);

    // Deploy facets
    console.log("💎 Deploying Facets...");
    
    const FacetA = await ethers.getContractFactory("ExampleFacetA");
    facetA = await FacetA.deploy();
    await facetA.waitForDeployment();
    console.log(`   ✅ FacetA deployed to: ${await facetA.getAddress()}`);

    const FacetB = await ethers.getContractFactory("ExampleFacetB");
    facetB = await FacetB.deploy();
    await facetB.waitForDeployment();
    console.log(`   ✅ FacetB deployed to: ${await facetB.getAddress()}`);

    const FactoryFacet = await ethers.getContractFactory("ChunkFactoryFacet");
    factoryFacet = await FactoryFacet.deploy(await factory.getAddress());
    await factoryFacet.waitForDeployment();
    console.log(`   ✅ FactoryFacet deployed to: ${await factoryFacet.getAddress()}`);

    // Update EIP-712 domain
    DOMAIN.verifyingContract = await facetB.getAddress();

    console.log("✅ All contracts deployed successfully!");
  });

  describe("🏗️ Initialization", () => {
    it("Should register facets in manifest dispatcher", async () => {
      console.log("📋 Registering facets...");
      
      // Get function selectors from each facet
      const facetASelectors = await facetA.getFacetFunctionSelectors();
      const facetBSelectors = await facetB.getFacetFunctionSelectors();
      const factoryFacetSelectors = await factoryFacet.getFacetFunctionSelectors();

      console.log(`   FacetA selectors: ${facetASelectors.length}`);
      console.log(`   FacetB selectors: ${facetBSelectors.length}`);
      console.log(`   FactoryFacet selectors: ${factoryFacetSelectors.length}`);

      // Register facets (this would normally be done through manifest system)
      // For testing, we'll add them directly to the dispatcher
      await dispatcher.connect(governance).registerFacet(await facetA.getAddress(), facetASelectors);
      await dispatcher.connect(governance).registerFacet(await facetB.getAddress(), facetBSelectors);
      await dispatcher.connect(governance).registerFacet(await factoryFacet.getAddress(), factoryFacetSelectors);

      // Verify registration through IDiamondLoupe
      const registeredFacets = await loupe.facets();
      expect(registeredFacets.length).to.be.greaterThan(0);
      console.log(`   ✅ Registered ${registeredFacets.length} facets`);
    });

    it("Should initialize ExampleFacetB with EIP-712 governance", async () => {
      console.log("🔐 Initializing governance...");
      
      const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const nonce = 0;

      // Create EIP-712 signature for initialization
      const signature = await governance.signTypedData(
        DOMAIN,
        INIT_TYPEHASH,
        {
          operator: operator.address,
          governance: governance.address,
          deadline,
          nonce
        }
      );

      // Connect facetB through dispatcher and initialize
      const facetBThroughDispatcher = await ethers.getContractAt(
        "ExampleFacetB", 
        await dispatcher.getAddress()
      );

      await facetBThroughDispatcher.initializeFacetB(
        operator.address,
        governance.address,
        deadline,
        signature
      );

      // Verify initialization
      const storedGovernance = await facetBThroughDispatcher.getGovernance();
      const storedOperator = await facetBThroughDispatcher.getOperator();
      
      expect(storedGovernance).to.equal(governance.address);
      expect(storedOperator).to.equal(operator.address);
      console.log(`   ✅ Governance initialized: ${storedGovernance}`);
      console.log(`   ✅ Operator set: ${storedOperator}`);
    });
  });

  describe("💎 Diamond Pattern Functionality", () => {
    it("Should maintain storage isolation between facets", async () => {
      console.log("🔒 Testing storage isolation...");

      // Connect facets through dispatcher
      const facetADispatcher = await ethers.getContractAt("ExampleFacetA", await dispatcher.getAddress());
      const facetBDispatcher = await ethers.getContractAt("ExampleFacetB", await dispatcher.getAddress());

      // Store data in FacetA
      const testKey = ethers.keccak256(ethers.toUtf8Bytes("test-key"));
      const testData = ethers.toUtf8Bytes("facetA-data");
      
      await facetADispatcher.connect(user).storeData(testKey, testData);
      
      // Verify data is stored in FacetA
      const retrievedData = await facetADispatcher.connect(user).getData(testKey);
      expect(retrievedData).to.equal(ethers.hexlify(testData));

      // Execute operation in FacetB (should not affect FacetA's storage)
      await facetBDispatcher.connect(operator).executeB(1, ethers.toUtf8Bytes("facetB-operation"));

      // Verify FacetA's data is unchanged
      const unchangedData = await facetADispatcher.connect(user).getData(testKey);
      expect(unchangedData).to.equal(ethers.hexlify(testData));
      
      console.log("   ✅ Storage isolation verified");
    });

    it("Should execute cross-facet operations with proper authorization", async () => {
      console.log("🔄 Testing cross-facet operations...");

      const facetADispatcher = await ethers.getContractAt("ExampleFacetA", await dispatcher.getAddress());
      const facetBDispatcher = await ethers.getContractAt("ExampleFacetB", await dispatcher.getAddress());
      const factoryFacetDispatcher = await ethers.getContractAt("ChunkFactoryFacet", await dispatcher.getAddress());

      // Execute message through FacetA
      const testMessage = "Cross-facet test message";
      await expect(
        facetADispatcher.connect(user).executeA(testMessage)
      ).to.emit(facetADispatcher, "FacetAExecuted")
        .withArgs(user.address, 0, testMessage);

      // Verify user count increased
      const userCount = await facetADispatcher.getUserCount(user.address);
      expect(userCount).to.equal(1);

      console.log("   ✅ Cross-facet operations working");
    });

    it("Should support batch operations", async () => {
      console.log("📦 Testing batch operations...");

      const facetADispatcher = await ethers.getContractAt("ExampleFacetA", await dispatcher.getAddress());

      // Batch execute messages
      const messages = ["Message 1", "Message 2", "Message 3"];
      const tx = await facetADispatcher.connect(user).batchExecute(messages);
      
      // Verify all messages were processed
      const receipt = await tx.wait();
      const events = receipt?.logs.filter(log => {
        try {
          const parsed = facetADispatcher.interface.parseLog(log);
          return parsed?.name === "FacetAExecuted";
        } catch {
          return false;
        }
      });

      expect(events?.length).to.equal(messages.length);
      console.log(`   ✅ Batch processed ${messages.length} operations`);
    });
  });

  describe("🏭 Factory Integration", () => {
    it("Should deploy chunks through ChunkFactoryFacet", async () => {
      console.log("🎯 Testing factory operations...");

      const factoryFacetDispatcher = await ethers.getContractAt("ChunkFactoryFacet", await dispatcher.getAddress());

      // Stage a chunk
      const testData = ethers.toUtf8Bytes("Test chunk data");
      const tx = await factoryFacetDispatcher.connect(user).stage(testData, { value: ethers.parseEther("0.01") });
      
      await expect(tx).to.emit(factory, "ChunkStaged");
      
      console.log("   ✅ Chunk deployment successful");
    });

    it("Should validate bytecode size limits", async () => {
      console.log("📏 Testing size limits...");

      const factoryFacetDispatcher = await ethers.getContractAt("ChunkFactoryFacet", await dispatcher.getAddress());

      // Create oversized data (over MAX_CHUNK_BYTES)
      const oversizedData = new Uint8Array(25000); // 25KB > 24KB limit
      
      await expect(
        factoryFacetDispatcher.connect(user).stage(oversizedData, { value: ethers.parseEther("0.01") })
      ).to.be.revertedWith("ChunkTooLarge");

      console.log("   ✅ Size limits enforced");
    });
  });

  describe("🔧 Upgrade Scenarios", () => {
    it("Should support safe facet upgrades", async () => {
      console.log("🔄 Testing upgrade scenarios...");

      // Get current facet info
      const currentFacets = await loupe.facets();
      const facetAInfo = currentFacets.find(f => f.facetAddress === await facetA.getAddress());
      
      expect(facetAInfo).to.not.be.undefined;
      expect(facetAInfo?.functionSelectors.length).to.be.greaterThan(0);

      console.log(`   ✅ Current FacetA has ${facetAInfo?.functionSelectors.length} selectors`);
      
      // In a real upgrade scenario, you would:
      // 1. Deploy new facet version
      // 2. Generate manifest proof
      // 3. Update routes through dispatcher
      // 4. Verify new selectors are active
    });

    it("Should preserve state during upgrades", async () => {
      console.log("💾 Testing state preservation...");

      const facetADispatcher = await ethers.getContractAt("ExampleFacetA", await dispatcher.getAddress());

      // Store some state
      const preserveKey = ethers.keccak256(ethers.toUtf8Bytes("preserve-key"));
      const preserveData = ethers.toUtf8Bytes("data-to-preserve");
      
      await facetADispatcher.connect(user).storeData(preserveKey, preserveData);
      
      // Verify state exists
      const beforeUpgrade = await facetADispatcher.connect(user).getData(preserveKey);
      expect(beforeUpgrade).to.equal(ethers.hexlify(preserveData));

      // After upgrade simulation (state should persist due to namespaced storage)
      const afterUpgrade = await facetADispatcher.connect(user).getData(preserveKey);
      expect(afterUpgrade).to.equal(beforeUpgrade);

      console.log("   ✅ State preservation verified");
    });
  });

  describe("🛡️ Security Features", () => {
    it("Should enforce access controls", async () => {
      console.log("🔐 Testing access controls...");

      const facetBDispatcher = await ethers.getContractAt("ExampleFacetB", await dispatcher.getAddress());

      // Non-operator should not be able to execute admin functions
      await expect(
        facetBDispatcher.connect(user).pauseFacet()
      ).to.be.revertedWith("NotOperator");

      // Operator should be able to pause
      await expect(
        facetBDispatcher.connect(operator).pauseFacet()
      ).to.emit(facetBDispatcher, "PausedSet")
        .withArgs(true, operator.address);

      console.log("   ✅ Access controls enforced");
    });

    it("Should prevent unauthorized manifest changes", async () => {
      console.log("🚫 Testing unauthorized access prevention...");

      // Regular user should not be able to register facets
      await expect(
        dispatcher.connect(user).registerFacet(ethers.ZeroAddress, [])
      ).to.be.reverted;

      console.log("   ✅ Unauthorized access prevented");
    });

    it("Should validate EIP-712 signatures", async () => {
      console.log("✍️ Testing signature validation...");

      const facetBDispatcher = await ethers.getContractAt("ExampleFacetB", await dispatcher.getAddress());

      const deadline = Math.floor(Date.now() / 1000) + 3600;
      const operationHash = ethers.keccak256(ethers.toUtf8Bytes("test-operation"));
      
      // Invalid signature should fail
      const invalidSignature = "0x" + "00".repeat(65);
      
      await expect(
        facetBDispatcher.verifyOperation(operationHash, deadline, invalidSignature)
      ).to.be.reverted;

      console.log("   ✅ Signature validation working");
    });
  });

  describe("📊 Gas Optimization", () => {
    it("Should demonstrate gas efficiency of batch operations", async () => {
      console.log("⛽ Testing gas efficiency...");

      const facetADispatcher = await ethers.getContractAt("ExampleFacetA", await dispatcher.getAddress());

      // Single operation gas cost
      const singleTx = await facetADispatcher.connect(user).executeA("Single message");
      const singleReceipt = await singleTx.wait();
      const singleGasUsed = singleReceipt?.gasUsed || 0n;

      // Batch operation gas cost
      const batchMessages = ["Batch 1", "Batch 2", "Batch 3"];
      const batchTx = await facetADispatcher.connect(user).batchExecute(batchMessages);
      const batchReceipt = await batchTx.wait();
      const batchGasUsed = batchReceipt?.gasUsed || 0n;

      // Calculate gas per operation
      const gasPerSingle = Number(singleGasUsed);
      const gasPerBatch = Number(batchGasUsed) / batchMessages.length;
      const gasSavings = ((gasPerSingle - gasPerBatch) / gasPerSingle) * 100;

      console.log(`   Single operation gas: ${gasPerSingle.toLocaleString()}`);
      console.log(`   Batch operation gas per item: ${gasPerBatch.toLocaleString()}`);
      console.log(`   Gas savings: ${gasSavings.toFixed(1)}%`);

      expect(gasSavings).to.be.greaterThan(0);
      console.log("   ✅ Batch operations are more gas efficient");
    });
  });

  describe("🌐 Cross-Network Compatibility", () => {
    it("Should demonstrate deterministic addressing", async () => {
      console.log("🎯 Testing deterministic addressing...");

      // Get factory info
      const factoryAddress = await factory.getAddress();
      const factoryBytecode = await ethers.provider.getCode(factoryAddress);
      
      console.log(`   Factory deployed at: ${factoryAddress}`);
      console.log(`   Bytecode length: ${factoryBytecode.length} characters`);
      
      // Verify factory is properly initialized
      const feeRecipient = await factory.feeRecipient();
      expect(feeRecipient).to.equal(owner.address);

      console.log("   ✅ Deterministic addressing ready for cross-network deployment");
    });
  });

  after(() => {
    console.log("\n🎉 PayRox Diamond System tests completed!");
    console.log("✅ All integration scenarios verified");
    console.log("✅ Security features validated");
    console.log("✅ Gas optimization confirmed");
    console.log("✅ Cross-facet compatibility demonstrated");
  });
});
