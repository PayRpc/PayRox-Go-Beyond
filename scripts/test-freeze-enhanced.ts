// Quick test of the enhanced freeze readiness assessment
import { HardhatRuntimeEnvironment } from 'hardhat/types';

async function testEnhanced(hre: HardhatRuntimeEnvironment) {
  console.log('🧪 Testing Enhanced Freeze Readiness Assessment');
  console.log('Network:', hre.network.name);

  // Import the enhanced version
  try {
    const { main: enhancedMain } = await import(
      './assess-freeze-readiness-enhanced.js'
    );

    console.log('✅ Enhanced script loaded successfully');

    // Run in simulation mode by default
    const result = await enhancedMain(hre);

    console.log('\n📊 Assessment completed successfully');
    console.log('Result:', typeof result);

    return result;
  } catch (error) {
    console.error('❌ Error testing enhanced script:', error);
    throw error;
  }
}

// Export for Hardhat
export default testEnhanced;
