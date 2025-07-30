import { anyValue } from '@nomicfoundation/hardhat-chai-matchers/withArgs';
import { expect } from 'chai';
import { ethers } from 'hardhat';

describe('ManifestDispatcher Edge Cases', function () {
  let dispatcher: any;
  let owner: any;
  let operator: any;
  let user: any;

  beforeEach(async function () {
    [owner, operator, user] = await ethers.getSigners();

    // Deploy dispatcher
    const DispatcherContract = await ethers.getContractFactory(
      'ManifestDispatcher'
    );
    dispatcher = await DispatcherContract.deploy(owner.address, 0); // No activation delay for testing
    await dispatcher.waitForDeployment();

    // Grant operator role
    const OPERATOR_ROLE = await dispatcher.OPERATOR_ROLE();
    await dispatcher.grantRole(OPERATOR_ROLE, operator.address);
  });

  describe('Route Management Edge Cases', function () {
    it('Should handle routes with zero function selectors', async function () {
      const routes = [
        {
          selector: '0x00000000',
          implementation: ethers.ZeroAddress,
          isActive: true,
        },
      ];

      await expect(dispatcher.connect(operator).applyRoutes(routes))
        .to.emit(dispatcher, 'RoutesApplied')
        .withArgs(anyValue, 1);

      // Verify the route was added
      const implementation = await dispatcher.getRoute('0x00000000');
      expect(implementation).to.equal(ethers.ZeroAddress);
    });

    it('Should handle removal of non-existent routes', async function () {
      const selectorsToRemove = ['0x12345678', '0x87654321'];

      // Should not revert when removing non-existent routes
      await expect(dispatcher.connect(operator).removeRoutes(selectorsToRemove))
        .to.emit(dispatcher, 'RoutesRemoved')
        .withArgs(anyValue, 2);
    });

    it('Should handle empty route arrays', async function () {
      const emptyRoutes: any[] = [];

      await expect(dispatcher.connect(operator).applyRoutes(emptyRoutes))
        .to.emit(dispatcher, 'RoutesApplied')
        .withArgs(anyValue, 0);

      const emptySelectors: any[] = [];
      await expect(dispatcher.connect(operator).removeRoutes(emptySelectors))
        .to.emit(dispatcher, 'RoutesRemoved')
        .withArgs(anyValue, 0);
    });

    it('Should handle large batch route operations', async function () {
      // Create a large batch of routes
      const routes = [];
      for (let i = 0; i < 50; i++) {
        routes.push({
          selector: ethers
            .keccak256(ethers.toUtf8Bytes(`function${i}`))
            .slice(0, 10),
          implementation: user.address,
          isActive: true,
        });
      }

      await expect(dispatcher.connect(operator).applyRoutes(routes))
        .to.emit(dispatcher, 'RoutesApplied')
        .withArgs(anyValue, 50);

      // Verify first and last routes
      const firstImpl = await dispatcher.getRoute(routes[0].selector);
      const lastImpl = await dispatcher.getRoute(routes[49].selector);
      expect(firstImpl).to.equal(user.address);
      expect(lastImpl).to.equal(user.address);
    });

    it('Should overwrite existing routes', async function () {
      const selector = '0x12345678';

      // Add initial route
      const initialRoutes = [
        {
          selector: selector,
          implementation: user.address,
          isActive: true,
        },
      ];
      await dispatcher.connect(operator).applyRoutes(initialRoutes);

      // Verify initial route
      let implementation = await dispatcher.getRoute(selector);
      expect(implementation).to.equal(user.address);

      // Overwrite with new implementation
      const updatedRoutes = [
        {
          selector: selector,
          implementation: operator.address,
          isActive: true,
        },
      ];
      await dispatcher.connect(operator).applyRoutes(updatedRoutes);

      // Verify route was overwritten
      implementation = await dispatcher.getRoute(selector);
      expect(implementation).to.equal(operator.address);
    });

    it('Should handle inactive routes', async function () {
      const routes = [
        {
          selector: '0xdeadbeef',
          implementation: user.address,
          isActive: false, // Inactive route
        },
      ];

      await dispatcher.connect(operator).applyRoutes(routes);

      // Route should still be stored but marked as inactive
      const implementation = await dispatcher.getRoute('0xdeadbeef');
      expect(implementation).to.equal(user.address);
    });
  });

  describe('Access Control Edge Cases', function () {
    it('Should reject non-operator route modifications', async function () {
      const routes = [
        {
          selector: '0x12345678',
          implementation: user.address,
          isActive: true,
        },
      ];

      await expect(
        dispatcher.connect(user).applyRoutes(routes)
      ).to.be.revertedWithCustomError(
        dispatcher,
        'AccessControlUnauthorizedAccount'
      );

      await expect(
        dispatcher.connect(user).removeRoutes(['0x12345678'])
      ).to.be.revertedWithCustomError(
        dispatcher,
        'AccessControlUnauthorizedAccount'
      );
    });

    it('Should allow admin to grant and revoke operator role', async function () {
      const OPERATOR_ROLE = await dispatcher.OPERATOR_ROLE();

      // Grant role to user
      await expect(
        dispatcher.connect(owner).grantRole(OPERATOR_ROLE, user.address)
      )
        .to.emit(dispatcher, 'RoleGranted')
        .withArgs(OPERATOR_ROLE, user.address, owner.address);

      // User should now be able to modify routes
      const routes = [
        {
          selector: '0x11111111',
          implementation: user.address,
          isActive: true,
        },
      ];
      await dispatcher.connect(user).applyRoutes(routes);

      // Revoke role
      await expect(
        dispatcher.connect(owner).revokeRole(OPERATOR_ROLE, user.address)
      )
        .to.emit(dispatcher, 'RoleRevoked')
        .withArgs(OPERATOR_ROLE, user.address, owner.address);

      // User should no longer be able to modify routes
      await expect(
        dispatcher.connect(user).removeRoutes(['0x11111111'])
      ).to.be.revertedWithCustomError(
        dispatcher,
        'AccessControlUnauthorizedAccount'
      );
    });
  });

  describe('Pausable Functionality', function () {
    it('Should allow operator to pause and unpause', async function () {
      // Pause the contract
      await expect(dispatcher.connect(operator).pause())
        .to.emit(dispatcher, 'Paused')
        .withArgs(operator.address);

      expect(await dispatcher.paused()).to.be.true;

      // Should not be able to modify routes when paused
      const routes = [
        {
          selector: '0x99999999',
          implementation: user.address,
          isActive: true,
        },
      ];
      await expect(
        dispatcher.connect(operator).applyRoutes(routes)
      ).to.be.revertedWithCustomError(dispatcher, 'EnforcedPause');

      // Unpause the contract
      await expect(dispatcher.connect(operator).unpause())
        .to.emit(dispatcher, 'Unpaused')
        .withArgs(operator.address);

      expect(await dispatcher.paused()).to.be.false;

      // Should be able to modify routes again
      await dispatcher.connect(operator).applyRoutes(routes);
    });

    it('Should reject pause/unpause from non-operator', async function () {
      await expect(
        dispatcher.connect(user).pause()
      ).to.be.revertedWithCustomError(
        dispatcher,
        'AccessControlUnauthorizedAccount'
      );

      // Pause first
      await dispatcher.connect(operator).pause();

      await expect(
        dispatcher.connect(user).unpause()
      ).to.be.revertedWithCustomError(
        dispatcher,
        'AccessControlUnauthorizedAccount'
      );
    });
  });

  describe('View Functions Edge Cases', function () {
    it('Should return zero address for non-existent routes', async function () {
      const implementation = await dispatcher.getRoute('0xffffffff');
      expect(implementation).to.equal(ethers.ZeroAddress);
    });

    it('Should handle getRoute with various selector formats', async function () {
      // Add a route
      const selector = '0xabcdef12';
      const routes = [
        {
          selector: selector,
          implementation: user.address,
          isActive: true,
        },
      ];
      await dispatcher.connect(operator).applyRoutes(routes);

      // Test different ways of querying
      const impl1 = await dispatcher.getRoute(selector);
      const impl2 = await dispatcher.getRoute(selector.toLowerCase());
      const impl3 = await dispatcher.getRoute(selector.toUpperCase());

      expect(impl1).to.equal(user.address);
      expect(impl2).to.equal(user.address);
      expect(impl3).to.equal(user.address);
    });
  });

  describe('Event Emission Edge Cases', function () {
    it('Should emit correct event data for complex route operations', async function () {
      const routes = [
        {
          selector: '0x11111111',
          implementation: user.address,
          isActive: true,
        },
        {
          selector: '0x22222222',
          implementation: operator.address,
          isActive: false,
        },
      ];

      const tx = await dispatcher.connect(operator).applyRoutes(routes);
      const receipt = await tx.wait();

      // Check event emission
      expect(receipt.logs.length).to.be.greaterThan(0);
    });

    it('Should emit events for route removal operations', async function () {
      // First add some routes
      const routes = [
        {
          selector: '0xaaa11111',
          implementation: user.address,
          isActive: true,
        },
        {
          selector: '0xbbb22222',
          implementation: user.address,
          isActive: true,
        },
      ];
      await dispatcher.connect(operator).applyRoutes(routes);

      // Then remove them
      const selectorsToRemove = ['0xaaa11111', '0xbbb22222'];
      const tx = await dispatcher
        .connect(operator)
        .removeRoutes(selectorsToRemove);
      const receipt = await tx.wait();

      expect(receipt.logs.length).to.be.greaterThan(0);
    });
  });

  describe('Integration with Activation Delay', function () {
    it('Should handle immediate activation when delay is zero', async function () {
      // Contract was deployed with 0 delay, routes should be immediately active
      const routes = [
        {
          selector: '0xffffff00',
          implementation: user.address,
          isActive: true,
        },
      ];

      await dispatcher.connect(operator).applyRoutes(routes);

      // Route should be immediately available
      const implementation = await dispatcher.getRoute('0xffffff00');
      expect(implementation).to.equal(user.address);
    });
  });
});
