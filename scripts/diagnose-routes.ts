import { Interface } from 'ethers';
import { artifacts, ethers } from 'hardhat';

async function main() {
  const dispatcher = process.env.DISPATCHER;
  if (!dispatcher) {
    throw new Error('DISPATCHER environment variable is required');
  }
  const sel = process.env.SELECTOR ?? '0x5c36b186'; // ping()

  console.log(
    `[INFO] Diagnosing route for selector ${sel} on dispatcher ${dispatcher}`
  );

  const art = await artifacts.readArtifact('ManifestDispatcher');
  const c = new ethers.Contract(
    dispatcher,
    art.abi,
    (await ethers.getSigners())[0]
  );

  // 1) route target
  const route = await c.routes(sel);
  console.log('route.facet:', route.facet);
  console.log('route.codehash:', route.codehash);

  // 2) codehash on-chain
  const ch = await ethers.provider.send('eth_getCodeHash', [route.facet]);
  console.log('live EXTCODEHASH:', ch);

  if (!route.facet || route.facet === ethers.ZeroAddress) {
    throw new Error('No facet set for selector');
  }
  if (ch.toLowerCase() !== route.codehash.toLowerCase()) {
    throw new Error('EXTCODEHASH mismatch: route vs live');
  }

  // 3) try a call through fallback
  const iface = new Interface(['function ping() view returns (bytes4)']);
  const data = iface.encodeFunctionData('ping', []);
  const ret = await ethers.provider.call({ to: dispatcher, data });
  console.log('dispatcher.ping() ok, returns:', ret);

  console.log('[OK] Route diagnosis passed - selector routing correctly!');
}

main().catch(e => {
  console.error('[ERROR] Route diagnosis failed:', e);
  process.exit(1);
});
