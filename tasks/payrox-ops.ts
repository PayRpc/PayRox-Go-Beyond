// tasks/payrox-ops.ts
import { Contract, EventLog } from 'ethers';
import { task } from 'hardhat/config';

/**
 * payrox:ops:watch
 * Monitors dispatcher and factory for unexpected changes
 */
task('payrox:ops:watch', 'Monitor contracts for security events')
  .addParam('dispatcher', 'ManifestDispatcher address')
  .addOptionalParam('factory', 'DeterministicChunkFactory address')
  .addOptionalParam('selectors', 'Comma-separated selectors to monitor')
  .addOptionalParam('interval', 'Check interval in seconds', '30')
  .addFlag('once', 'Run once instead of continuous monitoring')
  .setAction(async (args, hre) => {
    const { ethers } = hre;

    console.log('🔍 Starting PayRox Operations Monitor...');
    console.log(`📡 Network: ${hre.network.name}`);
    console.log(`📍 Dispatcher: ${args.dispatcher}`);

    const dispatcher = await ethers.getContractAt(
      'ManifestDispatcher',
      args.dispatcher
    );
    let factory: Contract | null = null;

    if (args.factory) {
      factory = await ethers.getContractAt(
        'DeterministicChunkFactory',
        args.factory
      );
      console.log(`🏭 Factory: ${args.factory}`);
    }

    const monitorSelectors = args.selectors
      ? args.selectors.split(',').map((s: string) => s.trim())
      : [];

    if (monitorSelectors.length > 0) {
      console.log(`🎯 Monitoring selectors: ${monitorSelectors.join(', ')}`);
    }

    const interval = parseInt(args.interval) * 1000;

    // State tracking
    let lastBlock = await ethers.provider.getBlockNumber();
    const knownRoutes: Record<string, string> = {};

    // Initialize known routes
    if (monitorSelectors.length > 0) {
      for (const selector of monitorSelectors) {
        try {
          const route = await dispatcher.routes(selector);
          knownRoutes[selector] = route.facet;
          console.log(`✅ Baseline: ${selector} → ${route.facet}`);
        } catch (e) {
          console.log(`⚠️  Selector ${selector} not found in dispatcher`);
        }
      }
    }

    async function checkEvents() {
      try {
        const currentBlock = await ethers.provider.getBlockNumber();

        if (currentBlock > lastBlock) {
          console.log(`📦 Checking blocks ${lastBlock + 1} to ${currentBlock}`);

          // Check dispatcher events
          await checkDispatcherEvents(dispatcher, lastBlock + 1, currentBlock);

          // Check factory events
          if (factory) {
            await checkFactoryEvents(factory, lastBlock + 1, currentBlock);
          }

          // Check route integrity
          if (monitorSelectors.length > 0) {
            await checkRouteIntegrity(
              dispatcher,
              monitorSelectors,
              knownRoutes
            );
          }

          lastBlock = currentBlock;
        }
      } catch (error) {
        console.error('❌ Monitor error:', error);
        if (!args.once) {
          console.log('🔄 Continuing monitoring...');
        }
      }
    }

    // Run once or continuously
    if (args.once) {
      await checkEvents();
      console.log('✅ Single check completed');
    } else {
      console.log(
        `⏰ Monitoring every ${args.interval} seconds (Ctrl+C to stop)`
      );

      // Initial check
      await checkEvents();

      // Continuous monitoring
      const monitorInterval = global.setInterval(async () => {
        await checkEvents();
      }, interval);

      // Graceful shutdown
      process.on('SIGINT', () => {
        console.log('\\n🛑 Stopping monitor...');
        global.clearInterval(monitorInterval);
        process.exit(0);
      });
    }
  });

async function checkDispatcherEvents(
  dispatcher: Contract,
  fromBlock: number,
  toBlock: number
) {
  const events = [
    'RootCommitted',
    'RootActivated',
    'RouteAdded',
    'RouteRemoved',
    'Frozen',
    'ActivationDelaySet',
  ];

  for (const eventName of events) {
    try {
      const filter = dispatcher.filters[eventName]();
      const logs = await dispatcher.queryFilter(filter, fromBlock, toBlock);

      for (const log of logs) {
        const eventLog = log as EventLog;
        console.log(`🚨 ${eventName} in block ${eventLog.blockNumber}`);

        // Special handling for critical events
        if (eventName === 'Frozen') {
          console.log('🔴 CRITICAL: Dispatcher has been FROZEN!');
          process.exit(1);
        }

        if (eventName === 'RouteRemoved') {
          const args = eventLog.args;
          console.log(
            `⚠️  Route removed: ${args.selector} (was: ${args.previousFacet})`
          );
        }

        if (eventName === 'RootActivated') {
          const args = eventLog.args;
          console.log(
            `✅ New root activated: ${args.newRoot} (epoch: ${args.epoch})`
          );
        }
      }
    } catch (e) {
      // Event might not exist in older contracts
    }
  }
}

async function checkFactoryEvents(
  factory: Contract,
  fromBlock: number,
  toBlock: number
) {
  try {
    const filter = factory.filters.ChunkDeployed();
    const logs = await factory.queryFilter(filter, fromBlock, toBlock);

    for (const log of logs) {
      const eventLog = log as EventLog;
      const args = eventLog.args;
      console.log(
        `📦 Chunk deployed: ${args.chunkAddress} (${args.size} bytes)`
      );
    }
  } catch (e) {
    // Factory might not have events or be deployed
  }

  // Check fee changes
  try {
    const filter = factory.filters.BaseFeeSet();
    const logs = await factory.queryFilter(filter, fromBlock, toBlock);

    for (const log of logs) {
      const eventLog = log as EventLog;
      const args = eventLog.args;
      console.log(`💰 Base fee changed: ${args.newBaseFee} ETH`);
    }
  } catch (e) {
    // Event might not exist
  }
}

async function checkRouteIntegrity(
  dispatcher: Contract,
  selectors: string[],
  knownRoutes: Record<string, string>
) {
  for (const selector of selectors) {
    try {
      const route = await dispatcher.routes(selector);
      const currentFacet = route.facet;
      const knownFacet = knownRoutes[selector];

      if (knownFacet && currentFacet !== knownFacet) {
        console.log(`🔄 Route changed: ${selector}`);
        console.log(`   Was: ${knownFacet}`);
        console.log(`   Now: ${currentFacet}`);

        // Update known state
        knownRoutes[selector] = currentFacet;
      }
    } catch (e) {
      console.error(`❌ Failed to check route ${selector}:`, e);
    }
  }
}
