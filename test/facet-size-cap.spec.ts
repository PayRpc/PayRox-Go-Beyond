import { expect } from 'chai';
import { ethers } from 'hardhat';
import { MAX_FACET_SIZE } from '../constants/limits';

/**
 * @title FacetSizeCapTest
 * @notice CI test to ensure all facets respect EIP-170 runtime size limits
 * @dev CRITICAL: This test must pass for production deployment
 */
describe('FacetSizeCap', function () {
  const MAX_FACET_RUNTIME_SIZE = MAX_FACET_SIZE; // EIP-170 limit

  it('Should verify ExampleFacetA runtime size is within EIP-170 limit', async function () {
    const FacetA = await ethers.getContractFactory('ExampleFacetA');
    const facetA = await FacetA.deploy();
    await facetA.waitForDeployment();

    const facetAddress = await facetA.getAddress();
    const runtimeBytecode = await ethers.provider.getCode(facetAddress);
    const runtimeSize = (runtimeBytecode.length - 2) / 2; // Remove 0x prefix and convert hex to bytes

    console.log(`ExampleFacetA runtime size: ${runtimeSize} bytes`);

    expect(runtimeSize).to.be.lte(
      MAX_FACET_RUNTIME_SIZE,
      `ExampleFacetA runtime size (${runtimeSize}) exceeds EIP-170 limit (${MAX_FACET_RUNTIME_SIZE})`
    );
  });

  it('Should verify ExampleFacetB runtime size is within EIP-170 limit', async function () {
    const FacetB = await ethers.getContractFactory('ExampleFacetB');
    const facetB = await FacetB.deploy();
    await facetB.waitForDeployment();

    const facetAddress = await facetB.getAddress();
    const runtimeBytecode = await ethers.provider.getCode(facetAddress);
    const runtimeSize = (runtimeBytecode.length - 2) / 2; // Remove 0x prefix and convert hex to bytes

    console.log(`ExampleFacetB runtime size: ${runtimeSize} bytes`);

    expect(runtimeSize).to.be.lte(
      MAX_FACET_RUNTIME_SIZE,
      `ExampleFacetB runtime size (${runtimeSize}) exceeds EIP-170 limit (${MAX_FACET_RUNTIME_SIZE})`
    );
  });

  it('Should verify PingFacet runtime size is within EIP-170 limit', async function () {
    const PingFacet = await ethers.getContractFactory('PingFacet');
    const pingFacet = await PingFacet.deploy();
    await pingFacet.waitForDeployment();

    const facetAddress = await pingFacet.getAddress();
    const runtimeBytecode = await ethers.provider.getCode(facetAddress);
    const runtimeSize = (runtimeBytecode.length - 2) / 2; // Remove 0x prefix and convert hex to bytes

    console.log(`PingFacet runtime size: ${runtimeSize} bytes`);

    expect(runtimeSize).to.be.lte(
      MAX_FACET_RUNTIME_SIZE,
      `PingFacet runtime size (${runtimeSize}) exceeds EIP-170 limit (${MAX_FACET_RUNTIME_SIZE})`
    );
  });

  it('Should fail CI if any production facet exceeds EIP-170 limit', async function () {
    // Comprehensive check for all production facets
    const productionFacets = ['ExampleFacetA', 'ExampleFacetB', 'PingFacet'];
    let allWithinLimits = true;
    const results: { name: string; size: number }[] = [];

    for (const facetName of productionFacets) {
      const Factory = await ethers.getContractFactory(facetName);
      const facet = await Factory.deploy();
      await facet.waitForDeployment();

      const facetAddress = await facet.getAddress();
      const runtimeBytecode = await ethers.provider.getCode(facetAddress);
      const runtimeSize = (runtimeBytecode.length - 2) / 2;

      results.push({ name: facetName, size: runtimeSize });

      if (runtimeSize > MAX_FACET_RUNTIME_SIZE) {
        allWithinLimits = false;
      }
    }

    // Log comprehensive summary
    console.log('📊 Production Facet Size Summary:');
    results.forEach(({ name, size }) => {
      const percentage = Math.round((size / MAX_FACET_RUNTIME_SIZE) * 100);
      const status = size <= MAX_FACET_RUNTIME_SIZE ? '✅' : '❌';
      console.log(
        `  ${status} ${name}: ${size} bytes (${percentage}% of EIP-170 limit)`
      );
    });

    expect(allWithinLimits).to.equal(
      true,
      'CRITICAL: One or more facets exceed EIP-170 limit - deployment will fail'
    );
  });
});
