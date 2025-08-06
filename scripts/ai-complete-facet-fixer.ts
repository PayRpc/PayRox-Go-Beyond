#!/usr/bin/env ts-node

/**
 * AI Complete Facet Fixer
 * 
 * Applies BOTH native pattern fixes AND manifest integration
 * to achieve full PayRox production readiness.
 */

import * as fs from 'fs';
import * as path from 'path';

class CompleteFacetFixer {
  
  async fixAllFacets(): Promise<void> {
    console.log('🚀 Applying complete fixes: Native + Manifest...');
    
    const facetsDir = './contracts/generated-facets-v2';
    const files = fs.readdirSync(facetsDir).filter(f => f.endsWith('.sol'));
    
    for (const file of files) {
      const filePath = path.join(facetsDir, file);
      console.log(`\n🔧 Fixing: ${file}`);
      
      await this.fixSingleFacet(filePath);
    }
  }

  private async fixSingleFacet(filePath: string): Promise<void> {
    let content = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath, '.sol');
    
    // Step 1: Ensure native patterns are correct
    content = this.ensureNativePatterns(content, fileName);
    
    // Step 2: Add manifest integration
    content = this.addManifestIntegration(content, fileName);
    
    // Step 3: Remove any LibDiamond remnants
    content = this.removeDiamondDependencies(content);
    
    fs.writeFileSync(filePath, content);
    console.log(`✅ ${fileName} fixed with native + manifest patterns`);
  }

  private ensureNativePatterns(content: string, facetName: string): string {
    // Ensure storage slot pattern
    if (!content.includes('bytes32 constant STORAGE_SLOT = keccak256')) {
      const storagePattern = `bytes32 constant STORAGE_SLOT = keccak256("payrox.facet.${facetName.toLowerCase().replace('facet', '')}.v1");`;
      content = content.replace(
        /contract\s+\w+Facet\s*{/,
        match => `contract ${facetName} {\n    using SafeERC20 for IERC20;\n\n    ${storagePattern}`
      );
    }

    // Ensure _layout function
    if (!content.includes('function _layout() private pure returns')) {
      const layoutFunction = `
    function _layout() private pure returns (Layout storage l) {
        bytes32 slot = STORAGE_SLOT;
        assembly { l.slot := slot }
    }`;
      
      content = content.replace(
        /struct Layout \{[\s\S]*?\}/,
        match => match + layoutFunction
      );
    }

    return content;
  }

  private addManifestIntegration(content: string, facetName: string): string {
    // Check if getFacetInfo already exists
    if (content.includes('function getFacetInfo()')) {
      return content;
    }

    // Extract all external function signatures for selectors
    const externalFunctions = this.extractExternalFunctions(content);
    
    // Generate getFacetInfo function
    const getFacetInfoFunction = this.generateGetFacetInfo(facetName, externalFunctions);
    
    // Add getFacetInfo at the end, before the final }
    const lastBraceIndex = content.lastIndexOf('}');
    content = content.slice(0, lastBraceIndex) + 
              '\n    /// ------------------------\n' +
              '    /// Manifest Integration (REQUIRED for PayRox deployment)\n' +
              '    /// ------------------------\n' +
              getFacetInfoFunction + '\n' +
              content.slice(lastBraceIndex);

    return content;
  }

  private extractExternalFunctions(content: string): string[] {
    const functionRegex = /function\s+(\w+)\s*\([^)]*\)\s+external/g;
    const functions: string[] = [];
    let match;
    
    while ((match = functionRegex.exec(content)) !== null) {
      functions.push(match[1]);
    }
    
    return functions;
  }

  private generateGetFacetInfo(facetName: string, externalFunctions: string[]): string {
    const cleanName = facetName.replace('Facet', '');
    
    let selectorsArray = '        selectors = new bytes4[](' + externalFunctions.length + ');\n';
    externalFunctions.forEach((funcName, index) => {
      selectorsArray += `        selectors[${index}] = this.${funcName}.selector;\n`;
    });

    return `    function getFacetInfo()
        external
        pure
        returns (string memory name, string memory version, bytes4[] memory selectors)
    {
        name = "${cleanName}";
        version = "1.0.0";

        // CRITICAL: All external function selectors for manifest routing
${selectorsArray}    }`;
  }

  private removeDiamondDependencies(content: string): string {
    // Remove LibDiamond imports
    content = content.replace(/import\s+[^;]*LibDiamond[^;]*;/g, '');
    
    // Remove LibDiamond function calls
    content = content.replace(/LibDiamond\.\w+\([^)]*\);?/g, '');
    
    // Remove any remaining LibDiamond references
    content = content.replace(/LibDiamond\./g, '');
    
    return content;
  }

  async validateFixes(): Promise<void> {
    console.log('\n🔍 Validating fixes...');
    
    const { ManifestAwareFacetValidator } = await import('./ai-manifest-aware-validator');
    const validator = new ManifestAwareFacetValidator();
    await validator.validateAllFacets();
  }
}

// Execute complete fixing
if (require.main === module) {
  const fixer = new CompleteFacetFixer();
  fixer.fixAllFacets()
    .then(() => fixer.validateFixes())
    .catch(console.error);
}

export { CompleteFacetFixer };
