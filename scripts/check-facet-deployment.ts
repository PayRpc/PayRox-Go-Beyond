import { ethers } from 'hardhat';

async function main() {
  const facetAAddress = '0x24432a08869578aAf4d1eadA12e1e78f171b1a2b';
  const facetBAddress = '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9';
  
  const codeA = await ethers.provider.getCode(facetAAddress);
  const codeB = await ethers.provider.getCode(facetBAddress);
  
  console.log('FacetA code length:', codeA.length);
  console.log('FacetB code length:', codeB.length);
  
  if (codeA === '0x') {
    console.log('❌ FacetA has no code deployed');
  } else {
    console.log('✅ FacetA has code deployed');
  }
  
  if (codeB === '0x') {
    console.log('❌ FacetB has no code deployed');
  } else {
    console.log('✅ FacetB has code deployed');
  }
}

main().catch(console.error);
