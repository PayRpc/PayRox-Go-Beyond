import { task } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { main as generateSbom } from '../scripts/generate-sbom';

/**
 * Hardhat task to generate Software Bill of Materials (SBOM)
 */
task('sbom', 'Generate Software Bill of Materials (SBOM) for the project')
  .addOptionalParam('output', 'Output file path for the SBOM')
  .addFlag('details', 'Show detailed output')
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { output, details } = taskArgs;

    if (details) {
      console.log('🔍 Detailed SBOM generation enabled');
      console.log(`📁 Output path: ${output || 'auto-generated'}`);
      console.log(`🌐 Network: ${hre.network.name}`);
    }

    try {
      const sbom = await generateSbom(hre, output);

      if (details) {
        console.log('\n📋 SBOM Contents:');
        console.log(`   - Total Contracts: ${sbom.contracts.length}`);
        console.log(`   - Compiler: ${sbom.compiler.solcVersion}`);
        console.log(`   - Git Commit: ${sbom.metadata.commit.substring(0, 8)}`);
        console.log(`   - Generated: ${sbom.metadata.generatedAt}`);
      }

      return sbom;
    } catch (error) {
      console.error('❌ SBOM generation failed:', error);
      throw error;
    }
  });
export default {};
