// scripts/utils/merkle.ts
import {
  AbiCoder,
  concat,
  getCreate2Address,
  keccak256,
  toUtf8Bytes,
} from "ethers";

/** Ordered pair hash (preserves left/right order for OpenZeppelin MerkleProof compatibility) */
function pairHash(a: string, b: string): string {
  return keccak256(concat([a, b]));
}

/** Leaf encoder: keccak256(abi.encode(bytes4,address,bytes32)) */
export function encodeLeaf(
  selector: string,
  facet: string,
  codehash: string
): string {
  const abi = AbiCoder.defaultAbiCoder();
  const enc = abi.encode(
    ["bytes4", "address", "bytes32"],
    [selector, facet, codehash]
  );
  return keccak256(enc);
}

/** Build a Merkle proof for a leaf index given all levels */
function proofForIndex(levels: string[][], leafIndex: number): string[] {
  const proof: string[] = [];
  let idx = leafIndex;
  for (let level = 0; level < levels.length - 1; level++) {
    const nodes = levels[level];
    const isRight = idx % 2 === 1;
    const sibling = isRight ? idx - 1 : idx + 1;
    if (sibling < nodes.length) proof.push(nodes[sibling]);
    idx = Math.floor(idx / 2);
  }
  return proof;
}

/** Derive function selectors from ABI if not explicitly provided */
export function deriveSelectorsFromAbi(abi: any[]): string[] {
  const sigs = abi
    .filter((f) => f?.type === "function")
    .map(
      (f) =>
        `${f.name}(${(f.inputs || []).map((i: any) => i.type).join(",")})`
    );
  const sels = sigs.map((sig) => keccak256(toUtf8Bytes(sig)).slice(0, 10));
  return Array.from(new Set(sels));
}

export interface LeafMeta {
  selector: string;
  facet: string;
  codehash: string;
  facetName: string;
}

/**
 * Generate Merkle leaves for the dispatcher:
 * leaf = keccak256(abi.encode(selector, predictedFacetAddress, runtimeCodeHash))
 *
 * @param manifest  object with `facets[]` (each has { name, contract, selectors? }),
 *                  and optional salts at manifest.deployment?.salts?.[facetName]
 * @param artifacts hardhat artifacts (hre.artifacts)
 * @param factoryAddress deployed/predicted factory address used for CREATE2
 * @returns { root, tree, proofs, leaves, leafMeta }
 */
export async function generateManifestLeaves(
  manifest: any,
  artifacts: any,
  factoryAddress: string
): Promise<{
  root: string;
  tree: string[][];
  proofs: Record<string, string[]>;
  leaves: string[];
  leafMeta: LeafMeta[];
}> {
  if (!factoryAddress) {
    throw new Error("generateManifestLeaves: factoryAddress is required");
  }

  const leaves: string[] = [];
  const leafMeta: LeafMeta[] = [];

  for (const facet of manifest.facets) {
    const art = await artifacts.readArtifact(facet.contract);
    const runtime = art.deployedBytecode as string;
    const creation = art.bytecode as string;

    if (!runtime || runtime === "0x") {
      throw new Error(
        `Facet ${facet.name} has no runtime bytecode (is it abstract or an interface?).`
      );
    }

    const runtimeHash = keccak256(runtime); // == EXTCODEHASH on-chain
    const initCodeHash = keccak256(creation);

    // Salt resolution (prefer explicit, else deterministic from name)
    const explicitSalt =
      manifest?.deployment?.salts?.[facet.name] ??
      manifest?.deployment?.[facet.name]?.salt ??
      manifest?.deployment?.[facet.name.toLowerCase()]?.salt;

    const salt =
      explicitSalt ??
      keccak256(toUtf8Bytes(`PayRox-${facet.name}`)); // deterministic (no Date.now)

    const predictedFacet = getCreate2Address(
      factoryAddress,
      salt,
      initCodeHash
    );

    // Use configured selectors if given, else derive from ABI
    const selectors: string[] =
      facet.selectors && facet.selectors.length > 0
        ? facet.selectors
        : deriveSelectorsFromAbi(art.abi);

    for (const sel of selectors) {
      const leaf = encodeLeaf(sel, predictedFacet, runtimeHash);
      leaves.push(leaf);
      leafMeta.push({
        selector: sel,
        facet: predictedFacet,
        codehash: runtimeHash,
        facetName: facet.name,
      });
    }
  }

  if (leaves.length === 0) {
    return { root: keccak256("0x"), tree: [], proofs: {}, leaves, leafMeta };
  }

  // Build Merkle (ordered pair hashing - preserves left/right order)
  const tree: string[][] = [];
  tree.push(leaves);

  let level = leaves;
  while (level.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < level.length; i += 2) {
      if (i + 1 < level.length) next.push(pairHash(level[i], level[i + 1]));
      else next.push(level[i]); // duplicate last node
    }
    tree.push(next);
    level = next;
  }

  const root = level[0];

  // Proofs keyed by "selector:facet:codehash"
  const proofs: Record<string, string[]> = {};
  for (let i = 0; i < leaves.length; i++) {
    const key = `${leafMeta[i].selector}:${leafMeta[i].facet}:${leafMeta[i].codehash}`;
    proofs[key] = proofForIndex(tree, i);
  }

  return { root, tree, proofs, leaves, leafMeta };
}
