#!/usr/bin/env node

/**
 * Manifest Hash Checker Utility
 * Displays current manifest hash and audit information
 */

import * as fs from 'fs';
import * as path from 'path';

function main() {
  console.log('🔍 PayRox Go Beyond - Manifest Hash Checker');
  console.log('===========================================\n');

  try {
    // Check current manifest
    const manifestFile = path.join(process.cwd(), 'manifests', 'current.manifest.json');
    const merkleFile = path.join(process.cwd(), 'manifests', 'current.merkle.json');
    
    if (!fs.existsSync(manifestFile)) {
      console.log('❌ No current manifest found');
      console.log('   Run deployment to generate manifest');
      return;
    }

    // Read manifest data
    const manifestData = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
    const merkleData = fs.existsSync(merkleFile) 
      ? JSON.parse(fs.readFileSync(merkleFile, 'utf8'))
      : null;

    console.log('📊 Current Manifest Information:');
    console.log(`   📝 Version: ${manifestData.version}`);
    console.log(`   📅 Timestamp: ${manifestData.timestamp}`);
    console.log(`   🌐 Network: ${manifestData.network?.name || 'Unknown'} (${manifestData.network?.chainId || 'Unknown'})`);
    console.log(`   🏭 Factory: ${manifestData.factory}`);
    console.log(`   💎 Facets: ${manifestData.facets?.length || 0} deployed`);
    
    if (merkleData) {
      console.log(`\n🔒 Security Hash Information:`);
      console.log(`   📊 Manifest Hash: ${merkleData.root}`);
      console.log(`   🌳 Merkle Leaves: ${merkleData.leaves?.length || 0} hashes`);
      console.log(`\n🔍 Check if Audit Required`);
      console.log(`   Hash: ${merkleData.root}`);
      
      // Check if audit record exists
      const networks = ['hardhat', 'localhost', manifestData.network?.chainId];
      let auditFound = false;
      
      for (const network of networks) {
        if (!network) continue;
        
        const auditFile = path.join(process.cwd(), 'deployments', network.toString(), 'audit-record.json');
        if (fs.existsSync(auditFile)) {
          const auditData = JSON.parse(fs.readFileSync(auditFile, 'utf8'));
          console.log(`\n📋 Audit Record Found (${network}):`);
          console.log(`   🕐 Created: ${auditData.timestamp}`);
          console.log(`   👤 Deployer: ${auditData.deployer}`);
          console.log(`   📊 Hash Match: ${auditData.manifestHash === merkleData.root ? '✅ Yes' : '❌ No'}`);
          console.log(`   📁 File: deployments/${network}/audit-record.json`);
          auditFound = true;
          break;
        }
      }
      
      if (!auditFound) {
        console.log(`\n⚠️  No audit record found for current deployment`);
      }
      
    } else {
      console.log(`\n⚠️  No Merkle data found - run build-manifest.ts`);
    }

    // Show routes summary
    if (manifestData.routes && manifestData.routes.length > 0) {
      console.log(`\n🗺️  Function Routes: ${manifestData.routes.length} total`);
      manifestData.routes.slice(0, 5).forEach((route: any, index: number) => {
        console.log(`   ${index + 1}. ${route.selector} -> ${route.facet?.substring(0, 10)}...`);
      });
      if (manifestData.routes.length > 5) {
        console.log(`   ... and ${manifestData.routes.length - 5} more routes`);
      }
    }

    console.log('\n✅ Manifest hash check complete!');
    
  } catch (error) {
    console.error('❌ Error reading manifest:', error);
    console.log('\nTroubleshooting:');
    console.log('1. Ensure you are in the project root directory');
    console.log('2. Run deployment to generate manifest files');
    console.log('3. Check that manifests/ directory exists');
  }
}

if (require.main === module) {
  main();
}

export { main };
