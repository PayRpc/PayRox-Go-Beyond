#!/usr/bin/env ts-node

/**
 * AI Native Pattern Corrector
 * 
 * This script applies deep learning from native PayRox facets to fix all
 * generated facets in bulk, making them comply with native patterns.
 */

import * as fs from 'fs';
import * as path from 'path';

interface FacetCorrection {
  file: string;
  corrections: number;
  status: 'SUCCESS' | 'FAILED';
  issues: string[];
}

class NativePatternCorrector {
  private generatedDir = './contracts/generated-facets-v2';

  async correctAllFacets(): Promise<void> {
    console.log('🔧 Applying Native Pattern Corrections...');
    console.log('═'.repeat(50));

    const files = fs.readdirSync(this.generatedDir).filter(f => f.endsWith('.sol'));
    const results: FacetCorrection[] = [];

    for (const file of files) {
      if (file === 'GovernanceFacet.sol') {
        // Skip - already corrected manually
        console.log(`✅ ${file}: Already corrected manually`);
        continue;
      }

      const result = await this.correctFacet(file);
      results.push(result);
      
      const status = result.status === 'SUCCESS' ? '✅' : '❌';
      console.log(`${status} ${file}: ${result.corrections} corrections applied`);
    }

    // Summary
    const successful = results.filter(r => r.status === 'SUCCESS').length;
    const failed = results.filter(r => r.status === 'FAILED').length;
    const totalCorrections = results.reduce((sum, r) => sum + r.corrections, 0);

    console.log('\\n📊 CORRECTION SUMMARY');
    console.log('═'.repeat(30));
    console.log(`✅ Successfully corrected: ${successful}`);
    console.log(`❌ Failed corrections: ${failed}`);
    console.log(`🔧 Total corrections applied: ${totalCorrections}`);
  }

  private async correctFacet(fileName: string): Promise<FacetCorrection> {
    const filePath = path.join(this.generatedDir, fileName);
    let content = fs.readFileSync(filePath, 'utf8');
    let corrections = 0;
    const issues: string[] = [];

    try {
      // 1. Remove LibDiamond import
      if (content.includes('import "../utils/LibDiamond.sol";')) {
        content = content.replace(/import.*LibDiamond.*;\n/g, '');
        corrections++;
      }

      // 2. Fix struct visibility keywords (CRITICAL COMPILATION BLOCKER)
      const structVisibilityRegex = /struct\\s+(\\w+)\\s*{([^}]*)}\\s*(?=\\n|$)/gs;
      content = content.replace(structVisibilityRegex, (match, structName, structBody) => {
        if (structBody.includes('public ') || structBody.includes('private ') || 
            structBody.includes('internal ') || structBody.includes('external ')) {
          corrections++;
          const cleanedBody = structBody
            .replace(/\\bpublic\\s+/g, '')
            .replace(/\\bprivate\\s+/g, '')
            .replace(/\\binternal\\s+/g, '')
            .replace(/\\bexternal\\s+/g, '');
          return `struct ${structName} {${cleanedBody}}`;
        }
        return match;
      });

      // 3. Remove LibDiamond.enforceIsDispatcher() calls
      if (content.includes('LibDiamond.enforceIsDispatcher()')) {
        content = content.replace(/LibDiamond\\.enforceIsDispatcher\\(\\);?\\s*/g, '');
        corrections++;
      }

      // 4. Remove LibDiamond.enforceRole() calls  
      if (content.includes('LibDiamond.enforceRole(')) {
        content = content.replace(/LibDiamond\\.enforceRole\\([^)]*\\);?\\s*/g, '');
        corrections++;
      }

      // 5. Remove onlyDispatcher modifiers
      content = content.replace(/\\bonlyDispatcher\\s+/g, '');
      if (content.includes('onlyDispatcher')) {
        corrections++;
      }

      // 6. Fix storage pattern to match natives
      if (content.includes('library ') && content.includes('Storage')) {
        // Convert from library pattern to native direct pattern
        const libraryMatch = content.match(/library\\s+(\\w+Storage)\\s*{[^}]*bytes32\\s+internal\\s+constant\\s+STORAGE_SLOT\\s*=\\s*keccak256\\("([^"]+)"\\);[^}]*struct\\s+Layout\\s*{([^}]*)}[^}]*function\\s+layout\\(\\)[^}]*}/s);
        
        if (libraryMatch) {
          const [, libraryName, slotString, layoutContent] = libraryMatch;
          
          // Replace with native pattern
          const nativeStorage = `bytes32 constant STORAGE_SLOT = keccak256("${slotString}");

struct Layout {${layoutContent}}

function _layout() private pure returns (Layout storage l) {
    bytes32 slot = STORAGE_SLOT;
    assembly { l.slot := slot }
}`;
          
          // Remove the library and replace with native pattern
          content = content.replace(/library\\s+\\w+Storage\\s*{[^}]*}[^}]*}/s, nativeStorage);
          
          // Update storage access calls
          content = content.replace(new RegExp(`${libraryName}\\.layout\\(\\)`, 'g'), '_layout()');
          corrections++;
        }
      }

      // 7. Update comment to reflect native pattern
      content = content.replace(
        /@dev AI-generated following all learned standards/,
        '@dev Standalone contract for manifest-dispatcher routing'
      );

      // 8. Update title comment
      content = content.replace(
        /@notice Production-ready PayRox facet.*$/m,
        '@notice PayRox facet following native patterns from ExampleFacetA/B'
      );

      // 9. Add native-style operator access control if missing
      if (!content.includes('onlyOperator') && content.includes('onlyRole(')) {
        content = content.replace(
          /modifier onlyRole.*?}/s,
          `modifier onlyOperator() {
        if (msg.sender != _layout().operator) revert Unauthorized();
        _;
    }`
        );
        corrections++;
      }

      // 10. Fix role-based function parameters to operator-based
      content = content.replace(/onlyRole\\([^)]*\\)/g, 'onlyOperator');
      if (content.includes('onlyRole(')) {
        corrections++;
      }

      // Write the corrected content
      fs.writeFileSync(filePath, content);

      return {
        file: fileName,
        corrections,
        status: 'SUCCESS',
        issues: []
      };

    } catch (error) {
      return {
        file: fileName,
        corrections,
        status: 'FAILED',
        issues: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  async generateNativeCompliantTemplate(): Promise<void> {
    const template = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title [FACET_NAME]
 * @notice PayRox facet following native patterns from ExampleFacetA/B
 * @dev Standalone contract for manifest-dispatcher routing
 */

/// ------------------------
/// Errors (gas-efficient custom errors)
/// ------------------------
error NotInitialized();
error AlreadyInitialized();
error Paused();
error Unauthorized();

/// ------------------------
/// Storage (native pattern: direct slots, no LibDiamond)
/// ------------------------
bytes32 constant STORAGE_SLOT = keccak256("payrox.facet.[facet_name].v1");

struct Layout {
    bool initialized;
    bool paused;
    address operator;
    // Add facet-specific state here
}

function _layout() private pure returns (Layout storage l) {
    bytes32 slot = STORAGE_SLOT;
    assembly { l.slot := slot }
}

contract [FACET_NAME] {
    using SafeERC20 for IERC20;

    /// ------------------------
    /// Events
    /// ------------------------
    event [FACET_NAME]Initialized(address indexed operator, uint256 timestamp);

    /// ------------------------
    /// Modifiers (native PayRox pattern - facet-owned)
    /// ------------------------
    modifier whenInitialized() {
        if (!_layout().initialized) revert NotInitialized();
        _;
    }

    modifier whenNotPaused() {
        if (_layout().paused) revert Paused();
        _;
    }

    modifier onlyOperator() {
        if (msg.sender != _layout().operator) revert Unauthorized();
        _;
    }

    /// ------------------------
    /// Initialization (no dispatcher enforcement like natives)
    /// ------------------------
    function initialize[FACET_NAME](address operator_) external {
        if (operator_ == address(0)) revert Unauthorized();
        
        Layout storage l = _layout();
        if (l.initialized) revert AlreadyInitialized();
        
        l.initialized = true;
        l.operator = operator_;
        l.paused = false;
        
        emit [FACET_NAME]Initialized(operator_, block.timestamp);
    }

    /// ------------------------
    /// Admin Functions (operator-gated like ExampleFacetB)
    /// ------------------------
    function setPaused(bool _paused) external onlyOperator {
        _layout().paused = _paused;
    }

    /// ------------------------
    /// Core Business Logic (native security patterns)
    /// ------------------------
    function exampleFunction(uint256 param)
        external
        whenInitialized
        whenNotPaused
    {
        // Implement business logic
        Layout storage l = _layout();
        // Use l.state for storage access
    }

    /// ------------------------
    /// View Functions
    /// ------------------------
    function is[FACET_NAME]Initialized() external view returns (bool) {
        return _layout().initialized;
    }

    function is[FACET_NAME]Paused() external view returns (bool) {
        return _layout().paused;
    }
}`;

    fs.writeFileSync('./AI_NATIVE_COMPLIANT_TEMPLATE.sol', template);
    console.log('✅ Generated native compliant template: AI_NATIVE_COMPLIANT_TEMPLATE.sol');
  }
}

// Execute correction
if (require.main === module) {
  const corrector = new NativePatternCorrector();
  corrector.correctAllFacets()
    .then(() => corrector.generateNativeCompliantTemplate())
    .catch(console.error);
}

export { NativePatternCorrector };
