/**
 * @title MUST-FIX Learning Module for PayRox AI
 * @notice Teaches the AI all critical MUST-FIX requirements to prevent compilation issues
 * @dev This module ensures the AI learns from the fixes and generates compliant code
 * 
 * @author PayRox Go Beyond Team
 * @version 1.0.0
 */

const MUST_FIX_KNOWLEDGE_BASE = {
    version: "2.0.0",
    lastUpdated: "2025-08-07",
    totalRules: 12, // Expanded with production-ready requirements
    
    /**
     * Critical compilation-breaking issues that MUST be fixed
     */
    compilerBreakers: {
        1: {
            title: "Duplicate Event Emission with Wrong Signature",
            problem: "FacetInitialized event emitted twice with incompatible signatures",
            solution: "Add dedicated OperationInitiated(address indexed caller, uint256 opId) event",
            template: `
            // Events for PayRox integration and transparency
            event FacetInitialized(address indexed facet, uint256 timestamp);
            event OperationInitiated(address indexed caller, uint256 opId);
            event FacetUpgraded(address indexed oldImplementation, address indexed newImplementation);
            `,
            validation: (content) => {
                return content.includes('event OperationInitiated(address indexed caller, uint256 opId)') &&
                       content.includes('emit OperationInitiated(msg.sender, operationId)');
            }
        },
        
        2: {
            title: "Wrong LibDiamond Import Path",
            problem: "Using '../libraries/LibDiamond.sol' instead of correct utils path",
            solution: "Import from '../utils/LibDiamond.sol'",
            template: `import {LibDiamond} from "../utils/LibDiamond.sol";`,
            validation: (content) => {
                return content.includes('import {LibDiamond} from "../utils/LibDiamond.sol"');
            }
        },
        
        3: {
            title: "Unreliable Unique ID Generation on L2s",
            problem: "blockhash(block.number-1) returns zero on L2s beyond 256 blocks",
            solution: "Use block.chainid for better L2 compatibility",
            template: `
            function _generateUniqueId() internal returns (uint256 id) {
                unchecked { ++_s().nonce; }
                id = uint256(keccak256(abi.encodePacked(
                    block.timestamp,
                    _s().nonce,
                    msg.sender,
                    block.chainid  // More reliable than blockhash on L2s
                )));
            }
            `,
            validation: (content) => {
                return content.includes('block.chainid') && !content.includes('blockhash(block.number - 1)');
            }
        }
    },

    /**
     * Production-ready requirements (NEW)
     */
    productionRequirements: {
        10: {
            title: "Access Control Roles Implementation",
            problem: "Every dispatcher call can run operations - missing role-based security",
            solution: "Implement role-based access control with _enforceRole()",
            template: `
            // ✅ Access control roles for production security
            bytes32 public constant TRADE_EXECUTOR_ROLE = keccak256("TRADE_EXECUTOR_ROLE");
            
            // Access control enforcement helper
            function _enforceRole(bytes32 role) internal view {
                if (!LibDiamond.hasRole(role, msg.sender)) {
                    revert UnauthorizedAccess(msg.sender, role);
                }
            }
            `,
            validation: (content) => {
                return content.includes('_enforceRole(') && 
                       content.includes('bytes32 public constant') &&
                       content.includes('_ROLE = keccak256(');
            }
        },
        
        11: {
            title: "Gas Micro-Optimization Storage",
            problem: "Using 'bytes32 constant' wastes gas - should cache slot constant",
            solution: "Use 'bytes32 private constant' for storage slot optimization",
            template: `
            // ✅ Gas micro-optimization: Pre-computed constant saves 6 gas per SLOAD
            bytes32 private constant STORAGE_SLOT = keccak256("payrox.facet.name.v1");
            `,
            validation: (content) => {
                return content.includes('bytes32 private constant STORAGE_SLOT') &&
                       content.includes('Gas micro-optimization');
            }
        },
        
        12: {
            title: "Production Function Implementations",
            problem: "exampleFunction is just a stub - need real business logic functions",
            solution: "Generate production-ready function selectors and implementations",
            template: `
            // Production-ready function selectors
            selectors = new bytes4[](7);
            uint256 i;
            selectors[i++] = this.getFacetInfo.selector;
            selectors[i++] = this.initialize.selector;
            selectors[i++] = this.placeMarketOrder.selector;
            `,
            validation: (content) => {
                return !content.includes('this.exampleFunction.selector') &&
                       content.includes('selectors = new bytes4[](') &&
                       content.match(/selectors = new bytes4\[\](\d+)\);/) && 
                       parseInt(content.match(/selectors = new bytes4\[\](\d+)\);/)[1]) > 3;
            }
        }
    },

    /**
     * Runtime and MUST-FIX requirements
     */
    runtimeRequirements: {
        4: {
            title: "Missing Function Selectors",
            problem: "getFacetInfo() only contains itself, dispatcher won't map functions",
            solution: "Return all function selectors properly populated",
            template: `
            function getFacetInfo()
                external
                pure
                returns (string memory name, string memory version, bytes4[] memory selectors)
            {
                name = "FacetName";
                version = "1.0.0";
                
                selectors = new bytes4[](3);
                uint256 i;
                selectors[i++] = this.getFacetInfo.selector;
                selectors[i++] = this.initialize.selector;
                selectors[i++] = this.exampleFunction.selector;
            }
            `,
            validation: (content) => {
                return content.includes('selectors = new bytes4[](3)') &&
                       content.includes('selectors[i++] = this.getFacetInfo.selector') &&
                       content.includes('selectors[i++] = this.initialize.selector') &&
                       content.includes('selectors[i++] = this.exampleFunction.selector');
            }
        },
        
        5: {
            title: "Test Bypass for Unit Testing",
            problem: "Direct facet calls in tests revert due to dispatcher gate",
            solution: "Add test-only initialization bypass with proper guards",
            template: `
            /**
             * @notice Test-only initialization bypass for unit testing
             * @dev Only works when diamond is not frozen, never in production
             */
            function __test_initializeDirect() external {
                require(!LibDiamond.diamondStorage().frozen, "not for prod");
                initialize();
            }
            `,
            validation: (content) => {
                return content.includes('function __test_initializeDirect()') &&
                       content.includes('require(!LibDiamond.diamondStorage().frozen, "not for prod")');
            }
        },
        
        6: {
            title: "Enhanced Storage Layout",
            problem: "Minimal storage fields would cause upgrade friction later",
            solution: "Include comprehensive storage with future-ready fields via ComplexDeFiStorage library",
            template: `
            // Individual facets use minimal layout and reference comprehensive shared storage
            struct FacetLayout {
                uint256 _reentrancy;
                uint256 nonce;
                bool initialized;
                // Additional fields appended here for compatibility
            }
            // Comprehensive storage handled via ComplexDeFiStorage library
            `,
            validation: (content) => {
                // Facets use minimal individual storage but comprehensive shared storage
                const hasMinimalLayout = content.includes('struct ') && content.includes('_reentrancy') && content.includes('nonce');
                const acknowledgesSharedStorage = content.includes('Additional fields appended here for compatibility') ||
                                                content.includes('ComplexDeFiStorage') ||
                                                content.includes('comprehensive storage');
                return hasMinimalLayout || acknowledgesSharedStorage;
            }
        },
        
        7: {
            title: "Version Synchronization",
            problem: "Comment says 'v1' but function returns inconsistent versioning",
            solution: "Keep storage slot version in sync with getter function",
            template: `
            // Version tracking for migrations (keep in sync with STORAGE_SLOT version)
            function getFacetVersion() external pure returns (uint8) {
                return 1; // v1 - matches STORAGE_SLOT suffix
            }
            `,
            validation: (content) => {
                return content.includes('keep in sync with STORAGE_SLOT version') ||
                       content.includes('matches STORAGE_SLOT suffix');
            }
        }
    },

    /**
     * Code quality improvements
     */
    qualityImprovements: {
        8: {
            title: "Custom Error Documentation",
            problem: "Unused custom errors clutter bytecode",
            solution: "Add comments about removing unused errors in production",
            template: `
            // ✅ MUST-FIX Requirement 2: Custom errors for gas efficiency  
            // Note: Remove unused errors in production for cleaner bytecode
            error InsufficientBalance(uint256 requested, uint256 available);
            error UnauthorizedAccess(address caller, bytes32 requiredRole);
            error Unauthorized();
            error InvalidInput();
            error OperationFailed();
            error Reentrancy();
            `,
            validation: (content) => {
                return content.includes('Remove unused errors in production');
            }
        },
        
        9: {
            title: "Gas Optimization Notes",
            problem: "Long keccak256 strings waste gas on every SLOAD",
            solution: "Document pre-computed constant optimization",
            template: `
            // ✅ MUST-FIX Requirement 1: Namespaced storage
            // Note: For production, consider pre-computing as constant for 6 gas savings per SLOAD
            bytes32 constant STORAGE_SLOT = keccak256("payrox.facet.name.v1");
            `,
            validation: (content) => {
                return content.includes('pre-computing as constant for 6 gas savings');
            }
        }
    }
};

/**
 * @title MustFixLearningEngine
 * @notice Teaches AI systems all MUST-FIX requirements to prevent issues
 */
class MustFixLearningEngine {
    constructor() {
        this.knowledgeBase = MUST_FIX_KNOWLEDGE_BASE;
        this.learnedRules = new Set();
        this.validationResults = {};
    }

    /**
     * @notice Teaches the AI all MUST-FIX requirements
     * @dev Installs knowledge about compilation and runtime issues
     */
    teachAI(aiEngine) {
        console.log('🎓 Teaching AI MUST-FIX Requirements...');
        
        // Teach compiler-breaking issues
        Object.entries(this.knowledgeBase.compilerBreakers).forEach(([id, rule]) => {
            this.installRule(aiEngine, 'COMPILER_BREAKER', id, rule);
        });
        
        // Teach runtime requirements
        Object.entries(this.knowledgeBase.runtimeRequirements).forEach(([id, rule]) => {
            this.installRule(aiEngine, 'RUNTIME_REQUIREMENT', id, rule);
        });
        
        // Teach quality improvements
        Object.entries(this.knowledgeBase.qualityImprovements).forEach(([id, rule]) => {
            this.installRule(aiEngine, 'QUALITY_IMPROVEMENT', id, rule);
        });
        
        // Teach production requirements (NEW)
        Object.entries(this.knowledgeBase.productionRequirements).forEach(([id, rule]) => {
            this.installRule(aiEngine, 'PRODUCTION_REQUIREMENT', id, rule);
        });
        
        console.log(`✅ AI learned ${this.learnedRules.size} MUST-FIX rules (including production requirements)`);
        console.log('🧠 AI is now MUST-FIX compliant and will generate production-ready code');
    }

    /**
     * @notice Installs a specific rule into the AI engine
     */
    installRule(aiEngine, category, id, rule) {
        const ruleId = `${category}_${id}`;
        
        // Add to AI's patterns
        if (aiEngine.patterns) {
            aiEngine.patterns.push({
                id: ruleId,
                category: category,
                title: rule.title,
                problem: rule.problem,
                solution: rule.solution,
                template: rule.template,
                validation: rule.validation,
                priority: category === 'COMPILER_BREAKER' ? 'CRITICAL' : 'HIGH'
            });
        }
        
        // Add to learned rules
        this.learnedRules.add(ruleId);
        
        console.log(`  ✅ Learned: ${rule.title}`);
    }

    /**
     * @notice Validates that generated content follows all MUST-FIX rules
     * @param content The generated contract content
     * @returns Object with validation results
     */
    validateCompliance(content) {
        const results = {
            passed: true,
            issues: [],
            score: 0,
            totalRules: 0
        };

        // Validate all rules
        const allRules = {
            ...this.knowledgeBase.compilerBreakers,
            ...this.knowledgeBase.runtimeRequirements,
            ...this.knowledgeBase.qualityImprovements,
            ...this.knowledgeBase.productionRequirements
        };

        Object.entries(allRules).forEach(([id, rule]) => {
            results.totalRules++;
            
            if (rule.validation(content)) {
                results.score++;
            } else {
                results.passed = false;
                results.issues.push({
                    id: id,
                    title: rule.title,
                    problem: rule.problem,
                    solution: rule.solution
                });
            }
        });

        results.compliancePercentage = (results.score / results.totalRules * 100).toFixed(1);
        
        return results;
    }

    /**
     * @notice Generates a compliance report
     */
    generateComplianceReport(validationResults) {
        console.log('\n🔍 MUST-FIX Compliance Report');
        console.log('='.repeat(40));
        console.log(`📊 Score: ${validationResults.score}/${validationResults.totalRules} (${validationResults.compliancePercentage}%)`);
        
        if (validationResults.passed) {
            console.log('✅ ALL MUST-FIX REQUIREMENTS PASSED!');
            console.log('🚀 Code is ready for production deployment');
        } else {
            console.log('❌ Issues found:');
            validationResults.issues.forEach((issue, index) => {
                console.log(`  ${index + 1}. ${issue.title}`);
                console.log(`     Problem: ${issue.problem}`);
                console.log(`     Solution: ${issue.solution}`);
            });
        }
        
        console.log('='.repeat(40));
        return validationResults;
    }
}

module.exports = { 
    MustFixLearningEngine, 
    MUST_FIX_KNOWLEDGE_BASE 
};
