import { expect } from "chai";
import { ethers } from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

/**
 * @title TerraStakeNFT Test Suite
 * @dev Comprehensive testing for the TerraStakeNFT demo contract
 * 
 * This test suite validates:
 * - ERC1155 multi-token environmental NFTs
 * - Environmental impact tracking and carbon offset integration
 * - Staking mechanisms with variable APY rates
 * - Role-based access control system
 * - Emergency functions and security controls
 * 
 * @author PayRox Go Beyond Team
 */
describe("TerraStakeNFT Demo Contract", function () {
  let terraStakeNFT: any;
  let owner: HardhatEthersSigner;
  let user1: HardhatEthersSigner;
  let user2: HardhatEthersSigner;
  let oracle: HardhatEthersSigner;

  const baseURI = "https://api.terrastake.eco/metadata/";
  const vrfCoordinator = "0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625"; // Mock address
  const vrfKeyHash = "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c";
  const vrfSubscriptionId = 1;

  // Token IDs
  const TERRA_BASIC = 1;
  const TERRA_PREMIUM = 2;
  const TERRA_LEGENDARY = 3;
  const TERRA_MYTHIC = 4;

  beforeEach(async function () {
    console.log("🔧 Setting up TerraStakeNFT test environment...");

    // Get signers
    [owner, user1, user2, oracle] = await ethers.getSigners();

    // Deploy contract
    const TerraStakeNFTFactory = await ethers.getContractFactory("TerraStakeNFT");
    terraStakeNFT = await TerraStakeNFTFactory.deploy();
    await terraStakeNFT.waitForDeployment();

    // Initialize contract
    await terraStakeNFT.initialize(
      baseURI,
      owner.address,
      vrfCoordinator,
      vrfKeyHash,
      vrfSubscriptionId
    );

    // Grant oracle role
    const ORACLE_ROLE = await terraStakeNFT.ORACLE_ROLE();
    await terraStakeNFT.grantRole(ORACLE_ROLE, oracle.address);

    console.log(`   ✅ Contract deployed at: ${await terraStakeNFT.getAddress()}`);
  });

  describe("Deployment and Initialization", function () {
    it("Should initialize with correct parameters", async function () {
      const contractAddress = await terraStakeNFT.getAddress();
      expect(contractAddress).to.be.properAddress;

      // Check admin role
      const DEFAULT_ADMIN_ROLE = await terraStakeNFT.DEFAULT_ADMIN_ROLE();
      expect(await terraStakeNFT.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.be.true;

      // Check VRF configuration
      expect(await terraStakeNFT.vrfKeyHash()).to.equal(vrfKeyHash);
      expect(await terraStakeNFT.vrfSubscriptionId()).to.equal(vrfSubscriptionId);
    });

    it("Should have correct token supply limits", async function () {
      const [basicSupply, basicMax] = await terraStakeNFT.getSupplyInfo(TERRA_BASIC);
      const [premiumSupply, premiumMax] = await terraStakeNFT.getSupplyInfo(TERRA_PREMIUM);
      const [legendarySupply, legendaryMax] = await terraStakeNFT.getSupplyInfo(TERRA_LEGENDARY);
      const [mythicSupply, mythicMax] = await terraStakeNFT.getSupplyInfo(TERRA_MYTHIC);

      expect(basicSupply).to.equal(0);
      expect(basicMax).to.equal(1000000);
      expect(premiumMax).to.equal(100000);
      expect(legendaryMax).to.equal(10000);
      expect(mythicMax).to.equal(1000);
    });
  });

  describe("Environmental NFT Minting", function () {
    const environmentalData = {
      carbonOffset: ethers.parseEther("10"),
      impactScore: 85,
      regionId: 1,
      certificationHash: ethers.keccak256(ethers.toUtf8Bytes("VERIFIED_GREEN_CERT_2024")),
      lastUpdated: 0
    };

    it("Should mint environmental NFTs with impact data", async function () {
      console.log("🌿 Testing environmental NFT minting...");

      await expect(
        terraStakeNFT.mintWithEnvironmentalData(
          user1.address,
          TERRA_BASIC,
          100,
          environmentalData
        )
      ).to.emit(terraStakeNFT, "TokenMinted")
        .withArgs(user1.address, TERRA_BASIC, 100, 1);

      // Check balance
      expect(await terraStakeNFT.balanceOf(user1.address, TERRA_BASIC)).to.equal(100);

      // Check supply tracking
      const [currentSupply, maxSupply] = await terraStakeNFT.getSupplyInfo(TERRA_BASIC);
      expect(currentSupply).to.equal(100);

      console.log(`   ✅ Minted 100 TERRA_BASIC tokens with environmental data`);
    });

    it("Should store environmental data correctly", async function () {
      await terraStakeNFT.mintWithEnvironmentalData(
        user1.address,
        TERRA_BASIC,
        1,
        environmentalData
      );

      const storedData = await terraStakeNFT.getEnvironmentalData(TERRA_BASIC, 0);
      expect(storedData.carbonOffset).to.equal(environmentalData.carbonOffset);
      expect(storedData.impactScore).to.equal(environmentalData.impactScore);
      expect(storedData.regionId).to.equal(environmentalData.regionId);
      expect(storedData.certificationHash).to.equal(environmentalData.certificationHash);
    });

    it("Should prevent minting beyond supply limits", async function () {
      // Try to mint more than max supply for mythic tokens
      await expect(
        terraStakeNFT.mintWithEnvironmentalData(
          user1.address,
          TERRA_MYTHIC,
          1001, // More than max of 1000
          environmentalData
        )
      ).to.be.revertedWithCustomError(terraStakeNFT, "TerraStakeNFT__InsufficientSupply");
    });

    it("Should only allow minters to mint", async function () {
      await expect(
        terraStakeNFT.connect(user1).mintWithEnvironmentalData(
          user1.address,
          TERRA_BASIC,
          1,
          environmentalData
        )
      ).to.be.reverted;
    });
  });

  describe("Staking Functionality", function () {
    beforeEach(async function () {
      // Mint tokens for testing
      const environmentalData = {
        carbonOffset: ethers.parseEther("10"),
        impactScore: 85,
        regionId: 1,
        certificationHash: ethers.keccak256(ethers.toUtf8Bytes("VERIFIED_GREEN_CERT_2024")),
        lastUpdated: 0
      };

      await terraStakeNFT.mintWithEnvironmentalData(
        user1.address,
        TERRA_BASIC,
        100,
        environmentalData
      );
    });

    it("Should allow users to start staking", async function () {
      console.log("🥩 Testing staking functionality...");

      await expect(
        terraStakeNFT.connect(user1).startStaking(TERRA_BASIC, 50)
      ).to.emit(terraStakeNFT, "StakeStarted");

      const stakeInfo = await terraStakeNFT.getStakeInfo(user1.address, TERRA_BASIC);
      expect(stakeInfo.amount).to.equal(50);
      expect(stakeInfo.isActive).to.be.true;
      expect(stakeInfo.rewardRate).to.be.gt(0);

      console.log(`   ✅ Started staking 50 tokens with reward rate: ${stakeInfo.rewardRate} basis points`);
    });

    it("Should transfer tokens when staking", async function () {
      const balanceBefore = await terraStakeNFT.balanceOf(user1.address, TERRA_BASIC);
      
      await terraStakeNFT.connect(user1).startStaking(TERRA_BASIC, 50);
      
      const balanceAfter = await terraStakeNFT.balanceOf(user1.address, TERRA_BASIC);
      expect(balanceAfter).to.equal(balanceBefore - 50n);
    });

    it("Should allow users to end staking and claim rewards", async function () {
      await terraStakeNFT.connect(user1).startStaking(TERRA_BASIC, 50);
      
      // Wait a bit (simulate time passing)
      await ethers.provider.send("evm_increaseTime", [86400]); // 1 day
      await ethers.provider.send("evm_mine", []);

      await expect(
        terraStakeNFT.connect(user1).endStaking(TERRA_BASIC)
      ).to.emit(terraStakeNFT, "StakeEnded");

      const stakeInfo = await terraStakeNFT.getStakeInfo(user1.address, TERRA_BASIC);
      expect(stakeInfo.isActive).to.be.false;
    });

    it("Should prevent double staking", async function () {
      await terraStakeNFT.connect(user1).startStaking(TERRA_BASIC, 50);

      await expect(
        terraStakeNFT.connect(user1).startStaking(TERRA_BASIC, 25)
      ).to.be.revertedWithCustomError(terraStakeNFT, "TerraStakeNFT__StakeAlreadyActive");
    });
  });

  describe("Access Control", function () {
    it("Should have correct role assignments", async function () {
      console.log("🔐 Testing access control...");

      const DEFAULT_ADMIN_ROLE = await terraStakeNFT.DEFAULT_ADMIN_ROLE();
      const MINTER_ROLE = await terraStakeNFT.MINTER_ROLE();
      const ORACLE_ROLE = await terraStakeNFT.ORACLE_ROLE();

      expect(await terraStakeNFT.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.be.true;
      expect(await terraStakeNFT.hasRole(MINTER_ROLE, owner.address)).to.be.true;
      expect(await terraStakeNFT.hasRole(ORACLE_ROLE, oracle.address)).to.be.true;

      console.log(`   ✅ Roles correctly assigned`);
    });

    it("Should prevent unauthorized access", async function () {
      const environmentalData = {
        carbonOffset: ethers.parseEther("5"),
        impactScore: 90,
        regionId: 2,
        certificationHash: ethers.keccak256(ethers.toUtf8Bytes("CERT_2024")),
        lastUpdated: 0
      };

      await expect(
        terraStakeNFT.connect(user1).mintWithEnvironmentalData(
          user1.address,
          TERRA_BASIC,
          1,
          environmentalData
        )
      ).to.be.reverted;
    });
  });

  describe("Emergency Functions", function () {
    it("Should allow emergency pause by authorized roles", async function () {
      console.log("🚨 Testing emergency functions...");

      await terraStakeNFT.emergencyPause();
      expect(await terraStakeNFT.paused()).to.be.true;

      await terraStakeNFT.emergencyUnpause();
      expect(await terraStakeNFT.paused()).to.be.false;

      console.log(`   ✅ Emergency pause/unpause working correctly`);
    });

    it("Should emit security alerts", async function () {
      await expect(terraStakeNFT.emergencyPause())
        .to.emit(terraStakeNFT, "SecurityAlert");
    });
  });

  describe("Token Configuration", function () {
    it("Should have correct reward rates for different tiers", async function () {
      console.log("💰 Testing reward rate configurations...");

      // These are base rates set in initialization
      expect(await terraStakeNFT.baseRewardRates(TERRA_BASIC)).to.equal(500); // 5%
      expect(await terraStakeNFT.baseRewardRates(TERRA_PREMIUM)).to.equal(750); // 7.5%
      expect(await terraStakeNFT.baseRewardRates(TERRA_LEGENDARY)).to.equal(1000); // 10%
      expect(await terraStakeNFT.baseRewardRates(TERRA_MYTHIC)).to.equal(1500); // 15%

      console.log(`   ✅ Reward rates: Basic 5%, Premium 7.5%, Legendary 10%, Mythic 15%`);
    });

    it("Should allow admin to update reward rates", async function () {
      await terraStakeNFT.updateBaseRewardRate(TERRA_BASIC, 600); // 6%
      expect(await terraStakeNFT.baseRewardRates(TERRA_BASIC)).to.equal(600);
    });
  });

  describe("Gas Optimization", function () {
    it("Should efficiently handle batch operations", async function () {
      console.log("⚡ Testing gas optimization...");

      const environmentalData = {
        carbonOffset: ethers.parseEther("1"),
        impactScore: 75,
        regionId: 1,
        certificationHash: ethers.keccak256(ethers.toUtf8Bytes("BATCH_CERT")),
        lastUpdated: 0
      };

      // Test batch minting
      const tx = await terraStakeNFT.batchMintWithEnvironmentalData(
        user1.address,
        [TERRA_BASIC, TERRA_PREMIUM],
        [10, 5],
        [environmentalData, environmentalData]
      );

      const receipt = await tx.wait();
      console.log(`   ⛽ Batch mint gas used: ${receipt.gasUsed.toString()}`);

      // Verify balances
      expect(await terraStakeNFT.balanceOf(user1.address, TERRA_BASIC)).to.equal(10);
      expect(await terraStakeNFT.balanceOf(user1.address, TERRA_PREMIUM)).to.equal(5);

      console.log(`   ✅ Batch operations working efficiently`);
    });
  });

  describe("Integration Testing", function () {
    it("Should demonstrate complete workflow", async function () {
      console.log("🔄 Running complete workflow test...");

      const environmentalData = {
        carbonOffset: ethers.parseEther("15"),
        impactScore: 92,
        regionId: 3,
        certificationHash: ethers.keccak256(ethers.toUtf8Bytes("PREMIUM_CERT_2024")),
        lastUpdated: 0
      };

      // 1. Mint tokens
      await terraStakeNFT.mintWithEnvironmentalData(
        user1.address,
        TERRA_PREMIUM,
        20,
        environmentalData
      );
      console.log(`   ✅ Step 1: Minted 20 TERRA_PREMIUM tokens`);

      // 2. Start staking
      await terraStakeNFT.connect(user1).startStaking(TERRA_PREMIUM, 15);
      console.log(`   ✅ Step 2: Started staking 15 tokens`);

      // 3. Check staking status
      const stakeInfo = await terraStakeNFT.getStakeInfo(user1.address, TERRA_PREMIUM);
      expect(stakeInfo.isActive).to.be.true;
      console.log(`   ✅ Step 3: Verified staking status (Rate: ${stakeInfo.rewardRate} bp)`);

      // 4. Advance time
      await ethers.provider.send("evm_increaseTime", [86400 * 7]); // 1 week
      await ethers.provider.send("evm_mine", []);

      // 5. Calculate current rewards
      const currentRewards = await terraStakeNFT.calculateCurrentRewards(user1.address, TERRA_PREMIUM);
      expect(currentRewards).to.be.gt(0);
      console.log(`   ✅ Step 4: Calculated rewards after 1 week: ${currentRewards.toString()}`);

      // 6. End staking
      await terraStakeNFT.connect(user1).endStaking(TERRA_PREMIUM);
      console.log(`   ✅ Step 5: Ended staking and claimed rewards`);

      // 7. Verify final state
      const finalStakeInfo = await terraStakeNFT.getStakeInfo(user1.address, TERRA_PREMIUM);
      expect(finalStakeInfo.isActive).to.be.false;
      console.log(`   ✅ Step 6: Verified final state - staking ended`);

      console.log("🎉 Complete workflow test successful!");
    });
  });
});
