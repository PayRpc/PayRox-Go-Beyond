// src/payrox/orderedMerkle.ts
import { AbiCoder, concat, getBytes, hexlify, keccak256 } from 'ethers';

export type Route = {
  selector: string; // 0x........ (8 hex chars after 0x)
  facet: string; // EIP55 address
  codehash: string; // 0x...32 bytes
  proof?: string[]; // optional ordered proof for self-check
  positions?: string; // optional LSB-first positions hex
};

const coder = AbiCoder.defaultAbiCoder();

/** Leaf = keccak256(abi.encode(bytes4,address,bytes32)) */
export function routeLeaf(
  selector: string,
  facet: string,
  codehash: string
): string {
  return keccak256(
    coder.encode(['bytes4', 'address', 'bytes32'], [selector, facet, codehash])
  ).toLowerCase();
}

/** LSB-first bitfield; bit i==1 ⇒ hash(curr || proof[i]); else hash(proof[i] || curr) */
export function processOrderedProof(
  leaf: string,
  proof: string[],
  positionsHex: string
): string {
  if (!positionsHex.startsWith('0x')) {
    throw new Error('positions must be 0x-prefixed hex');
  }
  let pos = BigInt(positionsHex);
  const mask = (1n << BigInt(proof.length)) - 1n;
  if ((pos & ~mask) !== 0n) {
    throw new Error('positions has set bits beyond proof length');
  }

  let h = leaf.toLowerCase();
  for (let i = 0; i < proof.length; i++) {
    const right = (pos & 1n) === 1n;
    const sib = proof[i].toLowerCase();
    h = keccak256(concat(right ? [h, sib] : [sib, h]));
    pos >>= 1n;
  }
  return h.toLowerCase();
}

/** Optional: build ordered tree (no sorting). Useful for debug or constructing test manifests. */
export function buildOrderedTree(leaves: string[]) {
  let level = leaves.map(l => l.toLowerCase());
  const layers: string[][] = [level];
  while (level.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const L = level[i];
      const R = i + 1 < level.length ? level[i + 1] : level[i]; // duplicate last
      next.push(keccak256(concat([L, R])).toLowerCase());
    }
    level = next;
    layers.push(level);
  }
  return { root: level[0] ?? hexlify(new Uint8Array(32)), layers };
}

/** Compute canonical manifestHash per spec. */
export function computeManifestHash(
  header: {
    versionBytes32: string;
    timestamp: number;
    deployer: string;
    chainId: number;
    previousHash: string;
  },
  root: string
): string {
  return keccak256(
    coder.encode(
      ['bytes32', 'uint256', 'address', 'uint256', 'bytes32', 'bytes32'],
      [
        header.versionBytes32,
        header.timestamp,
        header.deployer,
        header.chainId,
        header.previousHash,
        root,
      ]
    )
  ).toLowerCase();
}

/** Verify a single route against a given root. Throws on mismatch. */
export function verifyRouteAgainstRoot(route: Route, expectedRoot: string) {
  if (!route.proof || !route.positions) {
    throw new Error(
      'route.proof and route.positions are required for verification'
    );
  }
  const leaf = routeLeaf(route.selector, route.facet, route.codehash);
  const got = processOrderedProof(leaf, route.proof, route.positions);
  if (got !== expectedRoot.toLowerCase()) {
    throw new Error(
      `route verification failed for selector ${route.selector}: got ${got}, expected ${expectedRoot}`
    );
  }
}

/** Optional chunk salt (only for offline curiosity). Prefer calling factory.predict(data). */
export function chunkSalt(dataHex: string): string {
  if (!dataHex.startsWith('0x')) {
    throw new Error('data must be 0x-prefixed hex');
  }
  const tag = getBytes('0x' + Buffer.from('chunk:').toString('hex'));
  const dataHash = keccak256(dataHex);
  return keccak256(concat([tag, getBytes(dataHash)]));
}
