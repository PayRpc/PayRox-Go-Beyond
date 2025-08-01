/**
 * Debug Manifest Format
 */

import { ethers } from 'hardhat';

async function main() {
  console.log('🔍 Debugging Manifest Format...');

  const facetAddress = '0x9A676e781A523b5d0C0e43731313A708CB607508';
  const selector = ethers.id('getFacetInfo()').slice(0, 10); // 4 bytes

  console.log(`Selector: ${selector}`);
  console.log(
    `Selector length: ${selector.length} chars (${
      (selector.length - 2) / 2
    } bytes)`
  );

  console.log(`Facet: ${facetAddress}`);
  console.log(
    `Facet length: ${facetAddress.length} chars (${
      (facetAddress.length - 2) / 2
    } bytes)`
  );

  // Method 1: Using getBytes
  const selectorBytes = ethers.getBytes(selector);
  const addressBytes = ethers.getBytes(facetAddress);

  console.log(`\nMethod 1 - getBytes:`);
  console.log(`Selector bytes: ${selectorBytes.length}`);
  console.log(`Address bytes: ${addressBytes.length}`);

  const manifestData1 = ethers.concat([selectorBytes, addressBytes]);
  console.log(`Total length: ${manifestData1.length} bytes`);
  console.log(`Hex: ${ethers.hexlify(manifestData1)}`);

  // Method 2: Manual construction
  console.log(`\nMethod 2 - Manual:`);
  const selectorHex = selector.slice(2); // Remove 0x
  const addressHex = facetAddress.slice(2); // Remove 0x
  const combinedHex = '0x' + selectorHex + addressHex;

  console.log(`Selector hex: ${selectorHex} (${selectorHex.length / 2} bytes)`);
  console.log(`Address hex: ${addressHex} (${addressHex.length / 2} bytes)`);
  console.log(
    `Combined hex: ${combinedHex} (${(combinedHex.length - 2) / 2} bytes)`
  );

  const manifestData2 = ethers.getBytes(combinedHex);
  console.log(`Manual length: ${manifestData2.length} bytes`);
  console.log(`Hex: ${ethers.hexlify(manifestData2)}`);

  // Expected: 4 + 20 = 24 bytes
  console.log(`\nExpected: 24 bytes (4 selector + 20 address)`);
  console.log(`Method 1: ${manifestData1.length} bytes`);
  console.log(`Method 2: ${manifestData2.length} bytes`);
}

main().catch(console.error);
