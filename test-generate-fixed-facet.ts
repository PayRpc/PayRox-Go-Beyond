import { AIRefactorWizard } from './tools/ai-assistant/backend/src/analyzers/AIRefactorWizard';

// Test the fixed facet generator
async function testFixedFacetGeneration() {
    console.log('🧪 Testing updated AIRefactorWizard with security fixes...');
    
    const wizard = new AIRefactorWizard();
    
    // Generate a new test facet to verify all 9 fixes are working
    const testFacetCode = wizard.generateFacet({
        name: 'SecureTestFacet',
        description: 'Test facet with all security fixes applied',
        functions: [
            { 
                name: 'testFunction', 
                params: ['uint256 amount'], 
                isAdmin: false, 
                visibility: 'external',
                isView: false
            },
            { 
                name: 'adminFunction', 
                params: ['address target'], 
                isAdmin: true, 
                visibility: 'external',
                isView: false
            },
            {
                name: 'viewFunction',
                params: [],
                isAdmin: false,
                visibility: 'external',
                isView: true
            }
        ]
    });

    console.log('✅ Generated facet code:');
    console.log('='.repeat(80));
    console.log(testFacetCode);
    console.log('='.repeat(80));
    
    // Save to file for CI validation
    require('fs').writeFileSync('./contracts/test/SecureTestFacet.sol', testFacetCode);
    console.log('💾 Saved to: ./contracts/test/SecureTestFacet.sol');
    
    console.log('🔍 Now run CI validation to verify fixes...');
}

testFixedFacetGeneration().catch(console.error);
