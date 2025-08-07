"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function (o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function () { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function (o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function (o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function (o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function (o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SolidityAnalyzer = void 0;
const parser_1 = require("@solidity-parser/parser");
const solc = __importStar(require("solc"));
const ethers_1 = require("ethers");
const index_1 = require("../types/index");
class SolidityAnalyzer {
    constructor() {
        // Parser and compiler are used directly
    }
    /**
     * Parse and analyze a Solidity contract
     */
    async parseContract(sourceCode, contractName) {
        try {
            // Parse the AST
            const ast = (0, parser_1.parse)(sourceCode, {
                loc: true,
                range: true,
                tolerant: false,
            });
            // Compile to get additional metadata
            const compiled = await this.compileContract(sourceCode, contractName);
            // Extract contract information
            const contractNode = this.findContractNode(ast, contractName);
            if (!contractNode) {
                throw new index_1.AnalysisError('Contract not found in source code');
            }
            const functions = this.extractFunctions(contractNode, sourceCode);
            const variables = this.extractVariables(contractNode, sourceCode);
            const events = this.extractEvents(contractNode, sourceCode);
            const modifiers = this.extractModifiers(contractNode, sourceCode);
            const imports = this.extractImports(ast);
            const inheritance = this.extractInheritance(contractNode);
            const storageLayout = this.extractStorageLayout(compiled);
            const totalSize = this.estimateContractSize(compiled);
            // PayRox Go Beyond specific analysis
            const facetCandidates = this.identifyFacetCandidates(functions);
            const manifestRoutes = this.generateManifestRoutes(functions, compiled);
            const chunkingRequired = this.requiresChunking(totalSize);
            const runtimeCodehash = this.calculateRuntimeCodehash(compiled);
            const storageCollisions = this.detectStorageCollisions(variables);
            const deploymentStrategy = this.determineDeploymentStrategy(totalSize, functions.length);
            return {
                name: contractNode.name,
                sourceCode,
                ast,
                functions,
                variables,
                events,
                modifiers,
                imports,
                inheritance,
                totalSize,
                storageLayout,
                facetCandidates,
                manifestRoutes,
                chunkingRequired,
                runtimeCodehash,
                storageCollisions,
                deploymentStrategy,
            };
        }
        catch (error) {
            if (error instanceof index_1.AnalysisError) {
                throw error;
            }
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new index_1.AnalysisError(`Failed to parse contract: ${errorMessage}`, error);
        }
    }
    /**
     * Compile Solidity source code
     */
    async compileContract(sourceCode, _contractName) {
        const input = {
            language: 'Solidity',
            sources: {
                'contract.sol': {
                    content: sourceCode,
                },
            },
            settings: {
                outputSelection: {
                    '*': {
                        '*': [
                            'abi',
                            'evm.bytecode',
                            'evm.deployedBytecode',
                            'evm.gasEstimates',
                            'storageLayout',
                            'devdoc',
                            'userdoc',
                        ],
                    },
                },
                optimizer: {
                    enabled: true,
                    runs: 200,
                },
            },
        };
        try {
            const output = JSON.parse(solc.compile(JSON.stringify(input)));
            if (output.errors) {
                const errors = output.errors.filter((err) => err.severity === 'error');
                if (errors.length > 0) {
                    throw new index_1.CompilationError('Compilation failed', errors);
                }
            }
            return output;
        }
        catch (error) {
            if (error instanceof index_1.CompilationError) {
                throw error;
            }
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new index_1.CompilationError(`Compilation failed: ${errorMessage}`, error);
        }
    }
    /**
     * Find the main contract node in AST
     */
    findContractNode(ast, contractName) {
        const contractNodes = [];
        this.visitNode(ast, node => {
            if (node.type === 'ContractDefinition') {
                contractNodes.push(node);
            }
        });
        if (contractName) {
            const found = contractNodes.find(node => node.name === contractName);
            if (found) {
                return found;
            }
        }
        // Return the last contract (usually the main one)
        return contractNodes[contractNodes.length - 1] || null;
    }
    /**
     * Extract function information
     */
    extractFunctions(contractNode, sourceCode) {
        const functions = [];
        this.visitNode(contractNode, node => {
            if (node.type === 'FunctionDefinition') {
                const functionNode = node;
                const functionInfo = {
                    name: functionNode.name ||
                        (functionNode.isConstructor ? 'constructor' : 'fallback'),
                    selector: this.calculateSelector(functionNode),
                    signature: this.buildFunctionSignature(functionNode),
                    visibility: functionNode.visibility || 'public',
                    stateMutability: functionNode.stateMutability || 'nonpayable',
                    parameters: this.extractParameters(functionNode.parameters),
                    returnParameters: this.extractParameters(functionNode.returnParameters),
                    modifiers: this.extractFunctionModifiers(functionNode),
                    gasEstimate: this.estimateFunctionGas(functionNode),
                    dependencies: this.findFunctionDependencies(functionNode, sourceCode),
                    codeSize: this.estimateFunctionSize(functionNode, sourceCode),
                    sourceLocation: this.getSourceLocation(functionNode, sourceCode),
                };
                functions.push(functionInfo);
            }
        });
        return functions;
    }
    /**
     * Extract state variables
     */
    extractVariables(contractNode, sourceCode) {
        const variables = [];
        let slotCounter = 0;
        this.visitNode(contractNode, node => {
            if (node.type === 'StateVariableDeclaration') {
                const variables_node = node;
                if (variables_node.variables) {
                    for (const variable of variables_node.variables) {
                        const variableInfo = {
                            name: variable.name,
                            type: this.typeToString(variable.typeName),
                            visibility: variable.visibility || 'internal',
                            constant: variable.isConstant || false,
                            immutable: variable.isImmutable || false,
                            slot: slotCounter,
                            offset: 0,
                            size: this.calculateVariableSize(variable.typeName),
                            dependencies: this.findVariableDependencies(variable, sourceCode),
                            sourceLocation: this.getSourceLocation(variable, sourceCode),
                        };
                        // Update slot counter based on variable size
                        slotCounter += Math.ceil(variableInfo.size / 32);
                        variables.push(variableInfo);
                    }
                }
            }
        });
        return variables;
    }
    /**
     * Extract events
     */
    extractEvents(contractNode, sourceCode) {
        const events = [];
        this.visitNode(contractNode, node => {
            if (node.type === 'EventDefinition') {
                const eventInfo = {
                    name: node.name || '',
                    signature: this.buildEventSignature(node),
                    parameters: this.extractParameters(node.parameters || {
                        type: 'ParameterList',
                        parameters: [],
                    }),
                    indexed: node.parameters?.map?.((param) => param.isIndexed || false) || [],
                    sourceLocation: this.getSourceLocation(node, sourceCode),
                };
                events.push(eventInfo);
            }
        });
        return events;
    }
    /**
     * Extract modifiers
     */
    extractModifiers(contractNode, sourceCode) {
        const modifiers = [];
        this.visitNode(contractNode, node => {
            if (node.type === 'ModifierDefinition') {
                const modifierInfo = {
                    name: node.name || '',
                    parameters: this.extractParameters(node.parameters || {
                        type: 'ParameterList',
                        parameters: [],
                    }),
                    sourceLocation: this.getSourceLocation(node, sourceCode),
                };
                modifiers.push(modifierInfo);
            }
        });
        return modifiers;
    }
    /**
     * Extract import statements
     */
    extractImports(ast) {
        const imports = [];
        this.visitNode(ast, node => {
            if (node.type === 'ImportDirective') {
                const importInfo = {
                    path: node.path || '',
                    symbols: node.symbolAliases?.map?.((alias) => alias.foreign) ||
                        [],
                    sourceLocation: this.getSourceLocation(node, ''),
                };
                imports.push(importInfo);
            }
        });
        return imports;
    }
    /**
     * Extract inheritance information
     */
    extractInheritance(contractNode) {
        return (contractNode.baseContracts?.map((base) => base.baseName.namePath) ||
            []);
    }
    /**
     * Extract storage layout from compilation output
     */
    extractStorageLayout(compiled) {
        const storageLayout = [];
        try {
            const contracts = compiled.contracts?.['contract.sol'];
            if (!contracts) {
                return storageLayout;
            }
            for (const [contractName, contractData] of Object.entries(contracts)) {
                const layout = contractData.storageLayout;
                if (layout?.storage) {
                    for (const storage of layout.storage) {
                        storageLayout.push({
                            slot: parseInt(storage.slot),
                            offset: storage.offset,
                            size: this.calculateTypeSize(storage.type, layout.types),
                            type: storage.type,
                            variable: storage.label,
                            contract: contractName,
                        });
                    }
                }
            }
        }
        catch (error) {
            console.warn('Failed to extract storage layout:', error);
        }
        return storageLayout;
    }
    /**
     * Calculate function selector (4-byte hash)
     */
    calculateSelector(functionNode) {
        if (!functionNode.name || functionNode.isConstructor) {
            return '0x00000000';
        }
        const signature = this.buildFunctionSignature(functionNode);
        const hash = (0, ethers_1.keccak256)(Buffer.from(signature, 'utf8'));
        return hash.slice(0, 10); // First 4 bytes (8 hex chars + 0x)
    }
    /**
     * Build function signature string
     */
    buildFunctionSignature(functionNode) {
        if (!functionNode.name || functionNode.isConstructor) {
            return 'constructor';
        }
        const params = functionNode.parameters?.parameters
            ?.map(param => this.typeToString(param.typeName))
            .join(',') || '';
        return `${functionNode.name}(${params})`;
    }
    /**
     * Build event signature string
     */
    buildEventSignature(eventNode) {
        const params = eventNode.parameters?.parameters
            ?.map(param => this.typeToString(param.typeName))
            .join(',') || '';
        return `${eventNode.name}(${params})`;
    }
    /**
     * Extract parameters from parameter list
     */
    extractParameters(parameterList) {
        if (!parameterList?.parameters) {
            return [];
        }
        return parameterList.parameters.map(param => ({
            name: param.name || '',
            type: this.typeToString(param.typeName),
            indexed: param.isIndexed || false,
        }));
    }
    /**
     * Extract function modifiers
     */
    extractFunctionModifiers(functionNode) {
        return functionNode.modifiers?.map(modifier => modifier.name) || [];
    }
    /**
     * Convert type node to string representation
     */
    typeToString(typeNode) {
        if (!typeNode) {
            return 'unknown';
        }
        switch (typeNode.type) {
            case 'ElementaryTypeName':
                return typeNode.name || 'unknown';
            case 'UserDefinedTypeName':
                return typeNode.namePath || 'unknown';
            case 'ArrayTypeName': {
                const baseType = typeNode.baseTypeName
                    ? this.typeToString(typeNode.baseTypeName)
                    : 'unknown';
                const length = typeNode.length ? `[${typeNode.length}]` : '[]';
                return `${baseType}${length}`;
            }
            case 'MappingTypeName': {
                const keyType = typeNode.keyType
                    ? this.typeToString(typeNode.keyType)
                    : 'unknown';
                const valueType = typeNode.valueType
                    ? this.typeToString(typeNode.valueType)
                    : 'unknown';
                return `mapping(${keyType} => ${valueType})`;
            }
            default:
                return typeNode.name || 'unknown';
        }
    }
    /**
     * Estimate contract bytecode size
     */
    estimateContractSize(compiled) {
        try {
            const contracts = compiled.contracts?.['contract.sol'];
            if (!contracts) {
                return 0;
            }
            let maxSize = 0;
            for (const [, contractData] of Object.entries(contracts)) {
                const bytecode = contractData.evm?.deployedBytecode?.object;
                if (bytecode) {
                    const size = Buffer.from(bytecode.replace('0x', ''), 'hex').length;
                    maxSize = Math.max(maxSize, size);
                }
            }
            return maxSize;
        }
        catch (error) {
            console.warn('Failed to estimate contract size:', error);
            return 0;
        }
    }
    /**
     * Estimate function gas usage
     */
    estimateFunctionGas(functionNode) {
        // Basic estimation based on function complexity
        let gasEstimate = 21000; // Base transaction cost
        // Add gas for function complexity
        if (functionNode.body) {
            gasEstimate += this.estimateBlockGas(functionNode.body) * 1000;
        }
        // Add gas for modifiers
        gasEstimate += (functionNode.modifiers?.length || 0) * 5000;
        // Add gas for state mutability
        switch (functionNode.stateMutability) {
            case 'view':
            case 'pure':
                gasEstimate = Math.min(gasEstimate, 10000);
                break;
            case 'payable':
                gasEstimate += 10000;
                break;
        }
        return gasEstimate;
    }
    /**
     * Estimate function code size in bytes
     */
    estimateFunctionSize(functionNode, sourceCode) {
        if (!functionNode.body) {
            return 100; // Minimal function
        }
        const location = this.getSourceLocation(functionNode, sourceCode);
        const functionCode = sourceCode.slice(location.start, location.end);
        // Rough estimation: 1 byte per 2 characters of source (accounting for compilation)
        return Math.ceil(functionCode.length / 2);
    }
    /**
     * Find function dependencies (other functions called)
     */
    findFunctionDependencies(functionNode, _sourceCode) {
        const dependencies = new Set();
        this.visitNode(functionNode, node => {
            if (node.type === 'FunctionCall' && node.name) {
                dependencies.add(node.name);
            }
            if (node.type === 'MemberAccess' && node.memberName) {
                dependencies.add(node.memberName);
            }
        });
        return Array.from(dependencies);
    }
    /**
     * Find variable dependencies
     */
    findVariableDependencies(variableNode, _sourceCode) {
        const dependencies = new Set();
        if (variableNode.expression) {
            this.visitNode(variableNode.expression, node => {
                if (node.type === 'Identifier' && node.name) {
                    dependencies.add(node.name);
                }
            });
        }
        return Array.from(dependencies);
    }
    /**
     * Calculate variable storage size in bytes
     */
    calculateVariableSize(typeNode) {
        const typeString = this.typeToString(typeNode);
        // Basic size mapping
        const sizeMap = {
            bool: 1,
            uint8: 1,
            uint16: 2,
            uint32: 4,
            uint64: 8,
            uint128: 16,
            uint256: 32,
            int8: 1,
            int16: 2,
            int32: 4,
            int64: 8,
            int128: 16,
            int256: 32,
            address: 20,
            bytes32: 32,
        };
        // Handle basic types
        if (sizeMap[typeString]) {
            return sizeMap[typeString];
        }
        // Handle dynamic types
        if (typeString.includes('[]') || typeString.startsWith('mapping')) {
            return 32; // Storage slot pointer
        }
        // Handle fixed-size arrays
        const arrayMatch = typeString.match(/^(.+)\[(\d+)\]$/);
        if (arrayMatch && arrayMatch[2]) {
            const baseSize = this.calculateVariableSize({
                type: 'ElementaryTypeName',
                name: arrayMatch[1],
            });
            const length = parseInt(arrayMatch[2]);
            return baseSize * length;
        }
        // Default to 32 bytes for unknown types
        return 32;
    }
    /**
     * Calculate type size from storage layout
     */
    calculateTypeSize(type, types) {
        const typeInfo = types[type];
        if (typeInfo) {
            return typeInfo.numberOfBytes || 32;
        }
        return 32;
    }
    /**
     * Estimate gas usage for a code block
     */
    estimateBlockGas(blockNode) {
        let gasEstimate = 0;
        this.visitNode(blockNode, node => {
            switch (node.type) {
                case 'AssignmentOperator':
                    gasEstimate += 5; // SSTORE cost
                    break;
                case 'FunctionCall':
                    gasEstimate += 3; // CALL cost
                    break;
                case 'IfStatement':
                    gasEstimate += 1; // JUMPI cost
                    break;
                case 'ForStatement':
                case 'WhileStatement':
                    gasEstimate += 10; // Loop overhead
                    break;
                default:
                    gasEstimate += 0.1; // Basic operations
            }
        });
        return gasEstimate;
    }
    /**
     * Get source location information
     */
    getSourceLocation(node, sourceCode) {
        if (node.loc) {
            return {
                start: node.range?.[0] || 0,
                end: node.range?.[1] || 0,
                line: node.loc.start?.line || 0,
                column: node.loc.start?.column || 0,
            };
        }
        return {
            start: 0,
            end: sourceCode.length,
            line: 1,
            column: 1,
        };
    }
    /**
     * Generic AST node visitor
     */
    visitNode(node, callback) {
        if (!node) {
            return;
        }
        callback(node);
        // Visit child nodes
        for (const [key, value] of Object.entries(node)) {
            if (Array.isArray(value)) {
                value.forEach(child => {
                    if (typeof child === 'object' && child !== null) {
                        this.visitNode(child, callback);
                    }
                });
            }
            else if (typeof value === 'object' &&
                value !== null &&
                key !== 'parent') {
                this.visitNode(value, callback);
            }
        }
    }
    // ===============================================
    // PayRox Go Beyond Specific Methods
    // ===============================================
    /**
     * Identify facet candidates based on function grouping strategies
     */
    identifyFacetCandidates(functions) {
        const facets = new Map();
        for (const fn of functions) {
            let facetKey = 'UtilityFacet';
            // Categorize by function patterns and access levels
            if (this.isAdminFunction(fn)) {
                facetKey = 'AdminFacet';
            }
            else if (this.isGovernanceFunction(fn)) {
                facetKey = 'GovernanceFacet';
            }
            else if (fn.stateMutability === 'view' ||
                fn.stateMutability === 'pure') {
                facetKey = 'ViewFacet';
            }
            else if (this.isCoreFunction(fn)) {
                facetKey = 'CoreFacet';
            }
            if (!facets.has(facetKey)) {
                facets.set(facetKey, []);
            }
            const facetFunctions = facets.get(facetKey);
            if (facetFunctions) {
                facetFunctions.push(fn);
            }
        }
        return facets;
    }
    /**
     * Check if function is an admin function
     */
    isAdminFunction(func) {
        const adminPatterns = [
            /^set[A-Z]/, // setX functions
            /^update[A-Z]/, // updateX functions
            /^change[A-Z]/, // changeX functions
            /^withdraw/, // withdraw functions
            /^pause/, // pause functions
            /^unpause/, // unpause functions
            /^emergency/, // emergency functions
            /^admin/, // admin functions
            /^owner/, // owner functions
            /^manage/, // management functions
            /^initialize/, // initialization
            /^configure/, // configuration
        ];
        return (adminPatterns.some(pattern => pattern.test(func.name)) ||
            func.modifiers.some(mod => /owner|admin|auth|role/i.test(mod)));
    }
    /**
     * Check if function is a governance function
     */
    isGovernanceFunction(func) {
        const governancePatterns = [
            /^propose/,
            /^vote/,
            /^execute/,
            /^delegate/,
            /^governance/,
            /^timelock/,
        ];
        return governancePatterns.some(pattern => pattern.test(func.name));
    }
    /**
     * Check if function is a core business logic function
     */
    isCoreFunction(func) {
        // Functions that are not admin, governance, or view are considered core
        return (!this.isAdminFunction(func) &&
            !this.isGovernanceFunction(func) &&
            func.stateMutability !== 'view' &&
            func.stateMutability !== 'pure');
    }
    /**
     * Generate manifest routes for PayRox Go Beyond deployment
     */
    generateManifestRoutes(functions, compiled) {
        const routes = [];
        for (const func of functions) {
            // Skip constructor and fallback functions
            if (func.name === 'constructor' || func.name === 'fallback') {
                continue;
            }
            const route = {
                selector: func.selector,
                facet: '<predicted_facet_address>', // Will be filled during deployment
                codehash: this.calculateRuntimeCodehash(compiled),
                functionName: func.name,
                gasEstimate: func.gasEstimate,
                securityLevel: this.assessSecurityLevel(func),
            };
            routes.push(route);
        }
        return routes;
    }
    /**
     * Assess security level of a function
     */
    assessSecurityLevel(func) {
        // Critical: Admin functions, fund transfers
        if (this.isAdminFunction(func) ||
            func.name.includes('transfer') ||
            func.name.includes('withdraw')) {
            return 'critical';
        }
        // High: State-changing functions with modifiers
        if (func.stateMutability !== 'view' &&
            func.stateMutability !== 'pure' &&
            func.modifiers.length > 0) {
            return 'high';
        }
        // Medium: State-changing functions without modifiers
        if (func.stateMutability !== 'view' && func.stateMutability !== 'pure') {
            return 'medium';
        }
        // Low: View and pure functions
        return 'low';
    }
    /**
     * Calculate runtime codehash for bytecode integrity verification
     */
    calculateRuntimeCodehash(compiled) {
        try {
            const contracts = compiled.contracts?.['contract.sol'];
            if (!contracts) {
                return '0x0000000000000000000000000000000000000000000000000000000000000000';
            }
            // Get the first contract's deployed bytecode
            for (const [, contractData] of Object.entries(contracts)) {
                const deployedBytecode = contractData.evm?.deployedBytecode
                    ?.object;
                if (deployedBytecode) {
                    const cleanBytecode = deployedBytecode.startsWith('0x')
                        ? deployedBytecode
                        : `0x${deployedBytecode}`;
                    return (0, ethers_1.keccak256)(cleanBytecode);
                }
            }
            return '0x0000000000000000000000000000000000000000000000000000000000000000';
        }
        catch (error) {
            console.warn('Failed to calculate runtime codehash:', error);
            return '0x0000000000000000000000000000000000000000000000000000000000000000';
        }
    }
    /**
     * Determine if contract requires chunking for DeterministicChunkFactory
     */
    requiresChunking(totalSize) {
        const SAFE_CHUNK_LIMIT = 24000; // Safe limit below EIP-170 (24,576 bytes)
        return totalSize > SAFE_CHUNK_LIMIT;
    }
    /**
     * Detect storage layout collisions for facet isolation
     */
    detectStorageCollisions(variables) {
        const slotMap = new Map();
        const collisions = [];
        for (const variable of variables) {
            if (!slotMap.has(variable.slot)) {
                slotMap.set(variable.slot, []);
            }
            const slotVars = slotMap.get(variable.slot);
            if (slotVars) {
                slotVars.push(variable.name);
            }
        }
        // Check for collisions
        for (const [slot, vars] of Array.from(slotMap.entries())) {
            if (vars.length > 1) {
                collisions.push(`Potential storage collision at slot ${slot}: ${vars.join(', ')}`);
            }
        }
        // Check for diamond storage pattern compliance
        if (variables.length > 0 && !this.isDiamondStorageCompliant(variables)) {
            collisions.push('Contract may not be diamond storage compliant - consider using diamond storage pattern');
        }
        return collisions;
    }
    /**
     * Check if storage layout follows diamond storage patterns
     */
    isDiamondStorageCompliant(variables) {
        // Look for diamond storage struct patterns
        const hasStorageStruct = variables.some(v => v.name.toLowerCase().includes('storage') ||
            v.type.toLowerCase().includes('storage'));
        // Check if variables are properly isolated
        const hasProperIsolation = variables.every(v => v.slot >= 0 && v.offset >= 0);
        return hasStorageStruct && hasProperIsolation;
    }
    /**
     * Determine optimal deployment strategy based on contract characteristics
     */
    determineDeploymentStrategy(totalSize, functionCount) {
        const SIZE_THRESHOLD = 20000; // Threshold for considering faceting
        const FUNCTION_THRESHOLD = 10; // Threshold for considering faceting
        const CHUNK_THRESHOLD = 24000; // Threshold for chunking
        if (totalSize > CHUNK_THRESHOLD) {
            return 'chunked';
        }
        else if (totalSize > SIZE_THRESHOLD ||
            functionCount > FUNCTION_THRESHOLD) {
            return 'faceted';
        }
        else {
            return 'single';
        }
    }
    /**
     * Generate PayRox Go Beyond deployment manifest entry
     */
    generateManifestEntries(contract) {
        return contract.functions.map(fn => ({
            selector: fn.selector,
            facet: '<predicted_facet_address>',
            codehash: contract.runtimeCodehash || '<runtime_codehash>',
            functionName: fn.name,
            gasEstimate: fn.gasEstimate,
            securityLevel: this.assessSecurityLevel(fn),
        }));
    }
    /**
     * Generate facet-specific analysis report
     */
    generateFacetAnalysisReport(contract) {
        const facetRecommendations = [];
        // Convert facet candidates to structured recommendations
        for (const [facetName, functions] of Array.from(contract.facetCandidates.entries())) {
            const candidate = {
                name: facetName,
                functions: functions,
                estimatedSize: functions.reduce((total, fn) => total + fn.codeSize, 0),
                category: this.categorizeFacet(facetName),
                dependencies: this.analyzeFacetDependencies(functions),
                storageRequirements: this.analyzeFacetStorage(functions),
            };
            facetRecommendations.push(candidate);
        }
        const gasOptimizations = this.generateGasOptimizations(contract);
        const securityConsiderations = this.generateSecurityConsiderations(contract);
        return {
            facetRecommendations,
            deploymentStrategy: contract.deploymentStrategy,
            gasOptimizations,
            securityConsiderations,
            ...(contract.chunkingRequired && {
                chunkingStrategy: 'DeterministicChunkFactory staging required',
            }),
        };
    }
    /**
     * Categorize facet by name
     */
    categorizeFacet(facetName) {
        const name = facetName.toLowerCase();
        if (name.includes('admin')) {
            return 'admin';
        }
        if (name.includes('governance')) {
            return 'governance';
        }
        if (name.includes('view')) {
            return 'view';
        }
        if (name.includes('core')) {
            return 'core';
        }
        return 'utility';
    }
    /**
     * Analyze facet dependencies
     */
    analyzeFacetDependencies(functions) {
        const dependencies = new Set();
        for (const func of functions) {
            for (const dep of func.dependencies) {
                dependencies.add(dep);
            }
        }
        return Array.from(dependencies);
    }
    /**
     * Analyze facet storage requirements
     */
    analyzeFacetStorage(_functions) {
        // This would analyze which storage variables are accessed by facet functions
        // For now, return a placeholder
        return ['Isolated diamond storage required'];
    }
    /**
     * Generate gas optimization suggestions
     */
    generateGasOptimizations(contract) {
        const optimizations = [];
        if (contract.chunkingRequired) {
            optimizations.push('Deploy via DeterministicChunkFactory to avoid contract size limits');
        }
        if (contract.facetCandidates.size > 1) {
            optimizations.push('Modular facet deployment reduces individual deployment costs');
        }
        if (contract.storageCollisions.length > 0) {
            optimizations.push('Implement diamond storage pattern to avoid storage collisions');
        }
        const viewFunctions = contract.functions.filter(f => f.stateMutability === 'view' || f.stateMutability === 'pure');
        if (viewFunctions.length > 5) {
            optimizations.push('Consider separate ViewFacet for read-only operations');
        }
        return optimizations;
    }
    /**
     * Generate security considerations
     */
    generateSecurityConsiderations(contract) {
        const considerations = [];
        const criticalFunctions = contract.functions.filter(f => this.assessSecurityLevel(f) === 'critical');
        if (criticalFunctions.length > 0) {
            considerations.push(`${criticalFunctions.length} critical functions require enhanced access control`);
        }
        if (contract.storageCollisions.length > 0) {
            considerations.push('Storage collisions detected - implement proper facet isolation');
        }
        const adminFunctions = contract.functions.filter(f => this.isAdminFunction(f));
        if (adminFunctions.length > 0) {
            considerations.push('Separate AdminFacet recommended for privileged functions');
        }
        if (contract.deploymentStrategy === 'chunked') {
            considerations.push('Chunked deployment requires additional integrity verification');
        }
        return considerations;
    }
}
exports.SolidityAnalyzer = SolidityAnalyzer;
exports.default = SolidityAnalyzer;
