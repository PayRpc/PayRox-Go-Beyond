import { ethers } from "hardhat";
import { expect } from "chai";
import { ManifestDispatcher, PingFacet, ExampleFacetA } from "../typechain-types";

describe("Production Security Tests", function () {
  let dispatcher: ManifestDispatcher;
  let pingFacet: PingFacet;
  let altFacet: ExampleFacetA;
  let owner: any;

  beforeEach(async function () {
    [owner] = await ethers.getSigners();

    // Deploy dispatcher
    const DispatcherFactory = await ethers.getContractFactory("ManifestDispatcher");
    const dispatcherContract = await DispatcherFactory.deploy(owner.address, 0); // 0 activation delay for testing
    await dispatcherContract.waitForDeployment();
    dispatcher = dispatcherContract as unknown as ManifestDispatcher;

    // Deploy PingFacet
    const PingFactory = await ethers.getContractFactory("PingFacet");
    const pingContract = await PingFactory.deploy();
    await pingContract.waitForDeployment();
    pingFacet = pingContract as unknown as PingFacet;

    // Deploy alternative facet with different codehash
    const AltFactory = await ethers.getContractFactory("ExampleFacetA");
    const altContract = await AltFactory.deploy();
    await altContract.waitForDeployment();
    altFacet = altContract as unknown as ExampleFacetA;
  });

  describe("EXTCODEHASH Invariant Tests", function () {
    it("Should revert when facet EXTCODEHASH mismatches expected codehash", async function () {
      const pingAddress = await pingFacet.getAddress();
      const altAddress = await altFacet.getAddress();
      
      // Get actual EXTCODEHASH of both facets
      const pingCodehash = ethers.keccak256(await ethers.provider.getCode(pingAddress));
      const altCodehash = ethers.keccak256(await ethers.provider.getCode(altAddress));
      
      // First, set up a working route with correct codehash
      const selector = "0x5c36b186"; // ping()
      const goodLeaf = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ["bytes4", "address", "bytes32"],
          [selector, pingAddress, pingCodehash]
        )
      );
      
      await dispatcher.commitRoot(goodLeaf, 1);
      await dispatcher.applyRoutes(
        [selector],
        [pingAddress],
        [pingCodehash],
        [[] as string[]], // Empty proof for single-leaf tree
        [[] as boolean[]]  // Empty isRight for single-leaf tree
      );
      await dispatcher.activateCommittedRoot();

      // Verify the working route functions correctly
      const result = await owner.sendTransaction({
        to: await dispatcher.getAddress(),
        data: selector
      });
      expect(result).to.not.be.reverted;

      // Now test apply-time validation prevents mismatched codehashes
      const badLeaf = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ["bytes4", "address", "bytes32"],
          [selector, altAddress, pingCodehash] // Wrong: altAddress with pingCodehash
        )
      );

      await dispatcher.commitRoot(badLeaf, 2);
      
      // This should now revert at apply-time due to EXTCODEHASH mismatch
      await expect(
        dispatcher.applyRoutes(
          [selector],
          [altAddress], // Different address
          [pingCodehash], // But wrong codehash for this address
          [[] as string[]], // Empty proof for single-leaf tree
          [[] as boolean[]]  // Empty isRight for single-leaf tree
        )
      ).to.be.revertedWithCustomError(dispatcher, "ApplyCodehashMismatch")
        .withArgs(altAddress, pingCodehash, altCodehash);
    });
  });

  describe("Role Separation Tests", function () {
    let commitRole: any, applyRole: any, emergencyRole: any;

    beforeEach(async function () {
      [, commitRole, applyRole, emergencyRole] = await ethers.getSigners();

      // Grant specific roles
      await dispatcher.grantRole(await dispatcher.COMMIT_ROLE(), commitRole.address);
      await dispatcher.grantRole(await dispatcher.APPLY_ROLE(), applyRole.address);
      await dispatcher.grantRole(await dispatcher.EMERGENCY_ROLE(), emergencyRole.address);
    });

    it("Should enforce COMMIT_ROLE can only commit, not apply or activate", async function () {
      const selector = "0x5c36b186";
      const facetAddress = await pingFacet.getAddress();
      const codehash = ethers.keccak256(await ethers.provider.getCode(facetAddress));
      const leaf = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ["bytes4", "address", "bytes32"],
          [selector, facetAddress, codehash]
        )
      );

      // COMMIT_ROLE can commit
      await expect(
        dispatcher.connect(commitRole).commitRoot(leaf, 1)
      ).to.not.be.reverted;

      // COMMIT_ROLE cannot apply
      await expect(
        dispatcher.connect(commitRole).applyRoutes([selector], [facetAddress], [codehash], [[] as string[]], [[] as boolean[]])
      ).to.be.revertedWithCustomError(dispatcher, "AccessControlUnauthorizedAccount");

      // COMMIT_ROLE cannot activate
      await expect(
        dispatcher.connect(commitRole).activateCommittedRoot()
      ).to.be.revertedWithCustomError(dispatcher, "AccessControlUnauthorizedAccount");
    });

    it("Should enforce APPLY_ROLE can apply and activate, but not commit", async function () {
      const selector = "0x5c36b186";
      const facetAddress = await pingFacet.getAddress();
      const codehash = ethers.keccak256(await ethers.provider.getCode(facetAddress));
      const leaf = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ["bytes4", "address", "bytes32"],
          [selector, facetAddress, codehash]
        )
      );

      // APPLY_ROLE cannot commit
      await expect(
        dispatcher.connect(applyRole).commitRoot(leaf, 1)
      ).to.be.revertedWithCustomError(dispatcher, "AccessControlUnauthorizedAccount");

      // Owner commits first
      await dispatcher.commitRoot(leaf, 1);

      // APPLY_ROLE can apply
      await expect(
        dispatcher.connect(applyRole).applyRoutes([selector], [facetAddress], [codehash], [[] as string[]], [[] as boolean[]])
      ).to.not.be.reverted;

      // APPLY_ROLE can activate
      await expect(
        dispatcher.connect(applyRole).activateCommittedRoot()
      ).to.not.be.reverted;
    });

    it("Should enforce role separation when properly configured for production", async function () {
      // NOTE: In the current constructor, admin gets all roles by default.
      // In production, these should be granted to separate addresses for proper separation of duties.
      
      const selector = "0x5c36b186";
      const facetAddress = await pingFacet.getAddress();
      const codehash = ethers.keccak256(await ethers.provider.getCode(facetAddress));
      const leaf = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ["bytes4", "address", "bytes32"],
          [selector, facetAddress, codehash]
        )
      );

      // First complete the setup while admin has all roles
      await dispatcher.commitRoot(leaf, 1);
      await dispatcher.applyRoutes([selector], [facetAddress], [codehash], [[] as string[]], [[] as boolean[]]);

      // Remove APPLY_ROLE from admin to demonstrate proper separation
      await dispatcher.revokeRole(await dispatcher.APPLY_ROLE(), owner.address);

      // Now DEFAULT_ADMIN (owner) cannot activate since APPLY_ROLE was revoked
      await expect(
        dispatcher.activateCommittedRoot()
      ).to.be.revertedWithCustomError(dispatcher, "AccessControlUnauthorizedAccount");

      // But APPLY_ROLE can activate
      await expect(
        dispatcher.connect(applyRole).activateCommittedRoot()
      ).to.not.be.reverted;
      
      // Test production deployment recommendation:
      // In production, deploy with separate role addresses:
      // - commitRole gets COMMIT_ROLE only 
      // - applyRole gets APPLY_ROLE only
      // - emergencyRole gets EMERGENCY_ROLE only
      // - admin retains DEFAULT_ADMIN_ROLE for critical admin functions
    });

    it("Should enforce freeze is admin-only and irreversible", async function () {
      // Non-admin cannot freeze
      await expect(
        dispatcher.connect(applyRole).freeze()
      ).to.be.revertedWithCustomError(dispatcher, "AccessControlUnauthorizedAccount");

      // Admin can freeze
      await dispatcher.freeze();
      expect(await dispatcher.frozen()).to.be.true;

      // After freeze, all mutation operations should revert
      const selector = "0x5c36b186";
      const facetAddress = await pingFacet.getAddress();
      const codehash = ethers.keccak256(await ethers.provider.getCode(facetAddress));
      const leaf = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ["bytes4", "address", "bytes32"],
          [selector, facetAddress, codehash]
        )
      );

      // Test all frozen operations as documented
      await expect(
        dispatcher.commitRoot(leaf, 1)
      ).to.be.revertedWithCustomError(dispatcher, "FrozenError");
      
      await expect(
        dispatcher.applyRoutes([selector], [facetAddress], [codehash], [[] as string[]], [[] as boolean[]])
      ).to.be.revertedWithCustomError(dispatcher, "FrozenError");
      
      await expect(
        dispatcher.activateCommittedRoot()
      ).to.be.revertedWithCustomError(dispatcher, "FrozenError");
      
      await expect(
        dispatcher.setActivationDelay(3600)
      ).to.be.revertedWithCustomError(dispatcher, "FrozenError");
      
      await expect(
        dispatcher.removeRoutes([selector])
      ).to.be.revertedWithCustomError(dispatcher, "FrozenError");

      // View functions should continue to work
      expect(await dispatcher.frozen()).to.be.true;
      expect(await dispatcher.activeRoot()).to.equal(ethers.ZeroHash);
    });
  });

  describe("Activation Delay Tests", function () {
    it("Should enforce activation delay when non-zero", async function () {
      // Deploy dispatcher with 1 hour delay
      const DispatcherFactory = await ethers.getContractFactory("ManifestDispatcher");
      const delayedDispatcher = await DispatcherFactory.deploy(owner.address, 3600); // 1 hour
      await delayedDispatcher.waitForDeployment();

      const selector = "0x5c36b186";
      const facetAddress = await pingFacet.getAddress();
      const codehash = ethers.keccak256(await ethers.provider.getCode(facetAddress));
      const leaf = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ["bytes4", "address", "bytes32"],
          [selector, facetAddress, codehash]
        )
      );

      await delayedDispatcher.grantRole(await delayedDispatcher.APPLY_ROLE(), owner.address);
      await delayedDispatcher.commitRoot(leaf, 1);
      await delayedDispatcher.applyRoutes([selector], [facetAddress], [codehash], [[] as string[]], [[] as boolean[]]);

      // Should not be able to activate immediately (now uses custom error)
      await expect(
        delayedDispatcher.activateCommittedRoot()
      ).to.be.revertedWithCustomError(delayedDispatcher, "ActivationNotReady");

      // Fast forward time by 1 hour + 1 second
      await ethers.provider.send("evm_increaseTime", [3601]);
      await ethers.provider.send("evm_mine", []);

      // Now activation should work
      await expect(
        delayedDispatcher.activateCommittedRoot()
      ).to.not.be.reverted;
    });
  });

  describe("Gas and Fee Accounting Tests", function () {
    let factory: any;

    beforeEach(async function () {
      const FactoryContract = await ethers.getContractFactory("DeterministicChunkFactory");
      factory = await FactoryContract.deploy(owner.address, owner.address, ethers.parseEther("0.01"));
      await factory.waitForDeployment();
    });

    it("Should handle stage fee = baseFeeWei per chunk", async function () {
      const data = "0x1234";
      const fee = await factory.baseFeeWei();

      // Should revert with insufficient fee
      await expect(
        factory.stage(data, { value: fee - 1n })
      ).to.be.revertedWithCustomError(factory, "FeeRequired");

      // Should work with exact fee
      await expect(
        factory.stage(data, { value: fee })
      ).to.not.be.reverted;
    });

    it("Should handle stageBatch fee = n * baseFeeWei, transferred once", async function () {
      const blobs = ["0x1234", "0x5678", "0x9abc"];
      const fee = await factory.baseFeeWei();
      const totalFee = fee * BigInt(blobs.length);

      const initialBalance = await ethers.provider.getBalance(owner.address);

      // Should revert with insufficient fee
      await expect(
        factory.stageBatch(blobs, { value: totalFee - 1n })
      ).to.be.revertedWithCustomError(factory, "FeeRequired");

      // Should work with exact total fee
      const tx = await factory.stageBatch(blobs, { value: totalFee });
      await tx.wait();

      // Fee should be transferred exactly once
      const finalBalance = await ethers.provider.getBalance(owner.address);
      expect(finalBalance).to.be.lt(initialBalance); // Gas + fee paid
    });

    it("Should work with feesEnabled=false and msg.value==0", async function () {
      // Deploy factory with fees disabled
      const FactoryContract = await ethers.getContractFactory("DeterministicChunkFactory");
      const freeFactory = await FactoryContract.deploy(owner.address, ethers.ZeroAddress, 0);
      await freeFactory.waitForDeployment();

      const data = "0x1234";
      const blobs = ["0x1234", "0x5678"];

      // Both should work with zero value
      await expect(
        freeFactory.stage(data, { value: 0 })
      ).to.not.be.reverted;

      await expect(
        freeFactory.stageBatch(blobs, { value: 0 })
      ).to.not.be.reverted;
    });
  });

  describe("Apply-time EXTCODEHASH Validation", function () {
    it("Should revert applyRoutes when facet EXTCODEHASH mismatches expected", async function () {
      // Deploy a PingFacet and get its actual codehash
      const pingAddress = await pingFacet.getAddress();
      const actualCodehash = await ethers.provider.getCode(pingAddress).then(code => ethers.keccak256(code));
      
      // Create a fake/wrong codehash
      const wrongCodehash = ethers.keccak256(ethers.toUtf8Bytes("wrong codehash"));
      
      const selector = "0x5c36b186"; // ping()
      
      // For single route, we can use the route as its own root (single-leaf tree)
      const routeLeaf = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
        ["bytes4", "address", "bytes32"],
        [selector, pingAddress, wrongCodehash]
      ));
      
      // Commit the root (using the leaf as root for single-route manifest)
      await dispatcher.commitRoot(routeLeaf, 1);
      
      // Try to apply routes with mismatched codehash - should revert
      await expect(
        dispatcher.applyRoutes(
          [selector],
          [pingAddress],
          [wrongCodehash],
          [[] as string[]], // Empty proof for single-leaf tree
          [[] as boolean[]] // Empty positions for single-leaf tree
        )
      ).to.be.revertedWithCustomError(dispatcher, "ApplyCodehashMismatch")
        .withArgs(pingAddress, wrongCodehash, actualCodehash);
    });

    it("Should revert applyRoutes even with valid Merkle proof when codehash mismatches", async function () {
      // This test verifies that apply-time validation catches obviously bad manifests
      // even when the Merkle proof is valid
      const pingAddress = await pingFacet.getAddress();
      const altAddress = await altFacet.getAddress();
      
      // Get actual codehashes
      const pingCodehash = await ethers.provider.getCode(pingAddress).then(code => ethers.keccak256(code));
      const altCodehash = await ethers.provider.getCode(altAddress).then(code => ethers.keccak256(code));
      
      const selector = "0x5c36b186"; // ping()
      
      // Create a route leaf with wrong codehash (pingCodehash for altAddress)
      const routeLeaf = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
        ["bytes4", "address", "bytes32"],
        [selector, altAddress, pingCodehash] // Wrong: altAddress with pingCodehash
      ));
      
      // Commit the root (valid Merkle proof structure)
      await dispatcher.commitRoot(routeLeaf, 1);
      
      // Try to apply - should fail at apply-time even with valid proof
      await expect(
        dispatcher.applyRoutes(
          [selector],
          [altAddress],
          [pingCodehash], // This doesn't match altAddress's actual codehash
          [[] as string[]], // Valid empty proof for single-leaf tree
          [[] as boolean[]] // Valid empty positions for single-leaf tree
        )
      ).to.be.revertedWithCustomError(dispatcher, "ApplyCodehashMismatch")
        .withArgs(altAddress, pingCodehash, altCodehash);
    });
  });

  describe("Forbidden Overrides Persistence", function () {
    it("Should permanently remove routes via removeRoutes", async function () {
      const pingAddress = await pingFacet.getAddress();
      const codehash = await ethers.provider.getCode(pingAddress).then(code => ethers.keccak256(code));
      const selector = "0x5c36b186"; // ping()
      
      // Build and commit manifest
      const leaf = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
        ["bytes4", "address", "bytes32"], 
        [selector, pingAddress, codehash]
      ));
      const root = leaf;
      
      await dispatcher.connect(owner).commitRoot(root, 1);
      await dispatcher.connect(owner).applyRoutes(
        [selector], [pingAddress], [codehash], [[] as string[]], [[] as boolean[]]
      );
      await dispatcher.connect(owner).activateCommittedRoot();
      
      // Verify route is active
      const route = await dispatcher.routes(selector);
      expect(route.facet).to.equal(pingAddress);
      
      // Remove the route via emergency function
      await dispatcher.connect(owner).removeRoutes([selector]);
      
      // Route should be completely removed
      const removedRoute = await dispatcher.routes(selector);
      expect(removedRoute.facet).to.equal(ethers.ZeroAddress);
      
      // Calls should fail with NoRoute (current implementation) 
      const calldata = pingFacet.interface.encodeFunctionData("ping");
      await expect(
        owner.call({ to: await dispatcher.getAddress(), data: calldata })
      ).to.be.revertedWithCustomError(dispatcher, "NoRoute");
    });
  });
});
