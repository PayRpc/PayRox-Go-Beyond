const fs = require('fs');
const path = require('path');

console.log('🤖 AI Universal AST Chunker & Deployment Optimizer - FIXED');
console.log('=========================================================');

// Enhanced Solidity parsing functions
function parseContractStructure(content) {
    // Remove comments first for better parsing
    const cleanContent = content
        .replace(/\/\*[\s\S]*?\*\//g, '') // Block comments
        .replace(/\/\/.*$/gm, ''); // Line comments
    
    return {
        // Contract detection
        contracts: (cleanContent.match(/contract\s+(\w+)/g) || []).map(m => m.match(/contract\s+(\w+)/)[1]),
        libraries: (cleanContent.match(/library\s+(\w+)/g) || []).map(m => m.match(/library\s+(\w+)/)[1]),
        interfaces: (cleanContent.match(/interface\s+(\w+)/g) || []).map(m => m.match(/interface\s+(\w+)/)[1]),
        
        // Function detection with better patterns
        functions: (cleanContent.match(/function\s+(\w+)\s*\([^)]*\)/g) || []).map(m => m.match(/function\s+(\w+)/)[1]),
        
        // State variables
        stateVars: (cleanContent.match(/^\s*(?:uint256|address|bool|string|bytes|mapping\([^)]+\))\s+(?:public|private|internal)?\s*(\w+)/gm) || []),
        
        // Events
        events: (cleanContent.match(/event\s+(\w+)\s*\([^)]*\);/g) || []).map(m => m.match(/event\s+(\w+)/)[1]),
        
        // Modifiers
        modifiers: (cleanContent.match(/modifier\s+(\w+)/g) || []).map(m => m.match(/modifier\s+(\w+)/)[1]),
        
        // Structs
        structs: (cleanContent.match(/struct\s+(\w+)/g) || []).map(m => m.match(/struct\s+(\w+)/)[1]),
        
        // Imports
        imports: cleanContent.match(/import\s+[^;]+;/g) || []
    };
}

function categorizeFunctions(functions) {
    return {
        staking: functions.filter(f => /stake|unstake|reward|claim|compound/i.test(f)),
        nft: functions.filter(f => /mint|burn|transfer|approve|tokenURI|ownerOf|balanceOf/i.test(f)),
        governance: functions.filter(f => /vote|propose|execute|delegate|quorum/i.test(f)),
        defi: functions.filter(f => /swap|add|remove|liquidity|price|oracle/i.test(f)),
        access: functions.filter(f => /onlyOwner|onlyRole|onlyDispatcher|require/i.test(f)),
        core: functions.filter(f => /initialize|setup|configure|update|upgrade/i.test(f)),
        utils: functions.filter(f => /get|set|check|validate|calculate|convert/i.test(f)),
        fractionalization: functions.filter(f => /fraction|split|merge|redeem/i.test(f)),
        environmental: functions.filter(f => /environmental|carbon|green|eco/i.test(f)),
        randomness: functions.filter(f => /random|entropy|seed|vrf/i.test(f))
    };
}

function generateChunkingStrategy(filePath, structure, sizeKB) {
    const baseName = path.basename(filePath, '.sol');
    const chunks = [];
    
    if (sizeKB < 24) {
        return [{
            name: baseName,
            type: 'single',
            functions: structure.functions,
            estimatedSize: `${sizeKB}KB`,
            strategy: 'No chunking needed - under 24KB limit'
        }];
    }
    
    // Categorize functions for intelligent chunking
    const categories = categorizeFunctions(structure.functions);
    
    // Create chunks based on functional domains
    Object.entries(categories).forEach(([domain, funcs]) => {
        if (funcs.length > 0) {
            chunks.push({
                name: `${baseName}${domain.charAt(0).toUpperCase() + domain.slice(1)}Facet`,
                type: 'facet',
                domain: domain,
                functions: funcs,
                estimatedSize: `${(sizeKB * (funcs.length / structure.functions.length)).toFixed(1)}KB`,
                strategy: `Diamond facet for ${domain} functionality`
            });
        }
    });
    
    // If no specific domains found, chunk by function count
    if (chunks.length === 0) {
        const functionsPerChunk = 8;
        for (let i = 0; i < structure.functions.length; i += functionsPerChunk) {
            const chunkFunctions = structure.functions.slice(i, i + functionsPerChunk);
            chunks.push({
                name: `${baseName}Part${Math.floor(i / functionsPerChunk) + 1}Facet`,
                type: 'facet',
                domain: 'general',
                functions: chunkFunctions,
                estimatedSize: `${(sizeKB / Math.ceil(structure.functions.length / functionsPerChunk)).toFixed(1)}KB`,
                strategy: `General chunk ${Math.floor(i / functionsPerChunk) + 1}`
            });
        }
    }
    
    return chunks;
}

// Target files for analysis
const targetFiles = [
    'contracts/demo/TerraStakeNFT.sol',
    'contracts/facets/TerraStakeNFTFractionalizationFacet.sol', 
    'contracts/dispatcher/ManifestDispatcher.sol'
];

console.log('🔍 Analyzing target files with enhanced AI parsing...');
console.log('');

const analysisResults = [];

targetFiles.forEach(file => {
    const filePath = path.join(process.cwd(), file);
    
    if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n').length; // FIXED: proper line splitting
        const sizeKB = parseFloat((stats.size / 1024).toFixed(2));
        
        console.log(`📊 File: ${file}`);
        console.log(`   Size: ${sizeKB}KB`);
        console.log(`   Lines: ${lines}`);
        console.log(`   Status: ${stats.size > (24 * 1024) ? '🚨 NEEDS CHUNKING' : '✅ UNDER LIMIT'}`);
        
        // Enhanced parsing
        const structure = parseContractStructure(content);
        
        console.log('   📊 Contains:');
        console.log(`      Contracts: ${structure.contracts.length} (${structure.contracts.join(', ')})`);
        console.log(`      Functions: ${structure.functions.length}`);
        console.log(`      Events: ${structure.events.length}`);
        console.log(`      Structs: ${structure.structs.length}`);
        console.log(`      State Variables: ${structure.stateVars.length}`);
        console.log(`      Imports: ${structure.imports.length}`);
        
        if (stats.size > (24 * 1024)) {
            console.log('');
            console.log(`🧠 AI Analyzing ${file} for optimal chunking...`);
            
            // Function categorization
            const categories = categorizeFunctions(structure.functions);
            
            console.log('   🎯 Function categorization:');
            Object.entries(categories).forEach(([domain, funcs]) => {
                if (funcs.length > 0) {
                    const emoji = {
                        staking: '🥩',
                        nft: '🎨', 
                        governance: '🗳️',
                        defi: '💰',
                        access: '🔐',
                        core: '⚙️',
                        utils: '🛠️',
                        fractionalization: '🧩',
                        environmental: '🌱',
                        randomness: '🎲'
                    };
                    console.log(`      ${emoji[domain] || '📦'} ${domain}: ${funcs.length} functions`);
                }
            });
            
            // Generate chunking strategy
            const chunks = generateChunkingStrategy(filePath, structure, sizeKB);
            
            console.log('');
            console.log(`   💡 Chunking Strategy (${chunks.length} chunks):`);
            chunks.forEach((chunk, index) => {
                console.log(`      [${index + 1}] ${chunk.name}`);
                console.log(`          Type: ${chunk.type}`);
                console.log(`          Domain: ${chunk.domain}`);
                console.log(`          Functions: ${chunk.functions.length} (${chunk.functions.slice(0, 3).join(', ')}${chunk.functions.length > 3 ? '...' : ''})`);
                console.log(`          Est. Size: ${chunk.estimatedSize}`);
                console.log(`          Strategy: ${chunk.strategy}`);
            });
            
            analysisResults.push({
                file,
                sizeKB,
                structure,
                chunks,
                needsChunking: true
            });
        } else {
            analysisResults.push({
                file,
                sizeKB,
                structure,
                needsChunking: false
            });
        }
        
        console.log('');
        console.log('─'.repeat(60));
        console.log('');
        
    } else {
        console.log(`⚠️  File not found: ${file}`);
        console.log('');
    }
});

// Summary
console.log('🏆 AI Enhanced Analysis Complete!');
console.log('');
console.log('📊 Summary:');
console.log(`   Files analyzed: ${analysisResults.length}`);
console.log(`   Files needing chunking: ${analysisResults.filter(r => r.needsChunking).length}`);
console.log(`   Total functions found: ${analysisResults.reduce((sum, r) => sum + r.structure.functions.length, 0)}`);
console.log(`   Total contracts found: ${analysisResults.reduce((sum, r) => sum + r.structure.contracts.length, 0)}`);

console.log('');
console.log('🚀 Ready for deployment chunking with PayRox Diamond Architecture!');
console.log('⚡ All chunks will use isolated storage and manifest routing');
console.log('🔗 Compatible with universal AI deployment system');
