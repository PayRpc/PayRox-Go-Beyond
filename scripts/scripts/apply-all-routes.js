"use strict";
/**
 * Enhanced Apply All Routes Script
 *
 * Production-ready route application tool with comprehensive error handling,
 * validation, progress tracking, and safety features.
 *
 * @version 2.0.0
 * @author PayRox Development Team
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
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
exports.ValidationError = exports.RouteApplicationError = exports.EnhancedRouteApplicator = void 0;
const hardhat_1 = require("hardhat");
const path = __importStar(require("path"));
const network_1 = require("../src/utils/network");
const paths_1 = require("../src/utils/paths");
// Configuration constants
const CONFIG = {
    DEFAULT_BATCH_SIZE: 3,
    MAX_BATCH_SIZE: 10,
    MIN_BATCH_SIZE: 1,
    GAS_LIMIT_BUFFER: 1.2, // 20% buffer for gas estimates
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 2000, // 2 seconds
    TIMEOUT_MS: 300000, // 5 minutes
    VERIFICATION_SAMPLE_SIZE: 3,
};
// Custom error classes
class RouteApplicationError extends Error {
    constructor(message, code, details) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = 'RouteApplicationError';
    }
}
exports.RouteApplicationError = RouteApplicationError;
class ValidationError extends Error {
    constructor(message, validationErrors) {
        super(message);
        this.validationErrors = validationErrors;
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
/**
 * Enhanced Route Application Engine
 */
class EnhancedRouteApplicator {
    constructor() {
        this.cliArgs = {};
        this.startTime = 0;
        this.parseCliArguments();
    }
    /**
     * Parse command line arguments for enhanced functionality
     */
    parseCliArguments() {
        const args = process.argv.slice(2);
        this.cliArgs = {
            dryRun: args.includes('--dry-run'),
            verbose: args.includes('--verbose') || args.includes('-v'),
            force: args.includes('--force'),
            help: args.includes('--help') || args.includes('-h'),
            batchSize: this.extractNumericArg(args, '--batch-size', CONFIG.DEFAULT_BATCH_SIZE),
            maxRetries: this.extractNumericArg(args, '--max-retries', CONFIG.RETRY_ATTEMPTS),
            timeout: this.extractNumericArg(args, '--timeout', CONFIG.TIMEOUT_MS),
        };
        if (this.cliArgs.help) {
            this.displayHelp();
            process.exit(0);
        }
    }
    extractNumericArg(args, flag, defaultValue) {
        const index = args.indexOf(flag);
        if (index !== -1 && index + 1 < args.length) {
            const value = parseInt(args[index + 1]);
            return isNaN(value) ? defaultValue : value;
        }
        return defaultValue;
    }
    displayHelp() {
        console.log(`
🔗 Enhanced Apply All Routes Script v2.0.0

USAGE:
  npx hardhat run scripts/apply-all-routes.ts [OPTIONS]

OPTIONS:
  --dry-run              Preview changes without applying them
  --verbose, -v          Enable detailed logging
  --force                Skip confirmation prompts
  --help, -h             Show this help message
  --batch-size <n>       Number of routes per batch (default: ${CONFIG.DEFAULT_BATCH_SIZE})
  --max-retries <n>      Maximum retry attempts (default: ${CONFIG.RETRY_ATTEMPTS})
  --timeout <ms>         Operation timeout in milliseconds (default: ${CONFIG.TIMEOUT_MS})

EXAMPLES:
  npx hardhat run scripts/apply-all-routes.ts -- --dry-run
  npx hardhat run scripts/apply-all-routes.ts -- --verbose --batch-size 5
  npx hardhat run scripts/apply-all-routes.ts -- --force

DESCRIPTION:
  Applies all manifest routes to the dispatcher with comprehensive error handling,
  progress tracking, and safety features. Always validates input data and provides
  detailed feedback on operations.
`);
    }
    /**
     * Calculate the isRight array for a merkle proof based on leaf index
     */
    calculateIsRight(leafIndex, totalLeaves) {
        const isRight = [];
        let idx = leafIndex;
        let currentLevelSize = totalLeaves;
        while (currentLevelSize > 1) {
            const isLastOdd = currentLevelSize % 2 === 1 && idx === currentLevelSize - 1;
            if (isLastOdd) {
                isRight.push(false);
            }
            else {
                isRight.push(idx % 2 === 0);
            }
            idx = Math.floor(idx / 2);
            currentLevelSize = Math.ceil(currentLevelSize / 2);
        }
        return isRight;
    }
    /**
     * Load and validate manifest data
     */
    async loadManifestData() {
        const manifestPath = path.join(__dirname, '../manifests/current.manifest.json');
        const merklePath = path.join(__dirname, '../manifests/current.merkle.json');
        if (!(0, paths_1.fileExists)(manifestPath)) {
            throw new RouteApplicationError('Manifest file not found', 'MANIFEST_NOT_FOUND', { path: manifestPath });
        }
        if (!(0, paths_1.fileExists)(merklePath)) {
            throw new RouteApplicationError('Merkle data file not found', 'MERKLE_NOT_FOUND', { path: merklePath });
        }
        try {
            const manifest = (0, paths_1.safeParseJSON)((0, paths_1.readFileContent)(manifestPath));
            const merkleData = (0, paths_1.safeParseJSON)((0, paths_1.readFileContent)(merklePath));
            if (this.cliArgs.verbose) {
                console.log(`📁 Loaded manifest: ${manifestPath}`);
                console.log(`📁 Loaded merkle data: ${merklePath}`);
            }
            return { manifest, merkleData };
        }
        catch (error) {
            throw new RouteApplicationError('Failed to parse manifest data', 'PARSE_ERROR', { error: error instanceof Error ? error.message : String(error) });
        }
    }
    /**
     * Validate manifest and merkle data
     */
    validateData(manifest, merkleData) {
        const result = {
            isValid: true,
            errors: [],
            warnings: [],
        };
        // Validate manifest structure
        if (!manifest.routes || !Array.isArray(manifest.routes)) {
            result.errors.push('Manifest missing routes array');
        }
        if (manifest.routes.length === 0) {
            result.errors.push('Manifest has no routes to apply');
        }
        // Validate route structure
        for (let i = 0; i < manifest.routes.length; i++) {
            const route = manifest.routes[i];
            if (!route.selector || !route.facet || !route.codehash) {
                result.errors.push(`Route ${i} missing required fields (selector, facet, codehash)`);
            }
            if (route.selector && !route.selector.startsWith('0x')) {
                result.warnings.push(`Route ${i} selector should start with 0x`);
            }
            if (route.facet && !hardhat_1.ethers.isAddress(route.facet)) {
                result.errors.push(`Route ${i} has invalid facet address: ${route.facet}`);
            }
        }
        // Validate merkle data
        if (!merkleData.root || !merkleData.leaves || !merkleData.proofs) {
            result.errors.push('Merkle data missing required fields (root, leaves, proofs)');
        }
        if (merkleData.leaves.length !== merkleData.proofs.length) {
            result.errors.push('Merkle leaves and proofs arrays have different lengths');
        }
        if (merkleData.leaves.length !== manifest.routes.length) {
            result.warnings.push('Number of merkle leaves does not match number of routes');
        }
        result.isValid = result.errors.length === 0;
        return result;
    }
    /**
     * Get dispatcher contract with enhanced error handling
     */
    async getDispatcher() {
        const pathManager = (0, paths_1.getPathManager)();
        const networkManager = (0, network_1.getNetworkManager)();
        const network = await hardhat_1.ethers.provider.getNetwork();
        const chainId = network.chainId.toString();
        const networkDetection = networkManager.determineNetworkName(chainId);
        const networkName = networkDetection.networkName;
        if (this.cliArgs.verbose) {
            console.log(`🌐 Network: ${networkName} (Chain ID: ${chainId})`);
        }
        let dispatcherAddress = '';
        // Primary path
        const dispatcherPath = pathManager.getDeploymentPath(networkName, 'dispatcher.json');
        if ((0, paths_1.fileExists)(dispatcherPath)) {
            try {
                const dispatcherData = (0, paths_1.safeParseJSON)((0, paths_1.readFileContent)(dispatcherPath));
                dispatcherAddress = dispatcherData.address;
            }
            catch (error) {
                if (this.cliArgs.verbose) {
                    console.warn(`⚠️ Failed to read primary dispatcher artifact: ${error}`);
                }
            }
        }
        // Fallback path
        if (!dispatcherAddress) {
            const altDispatcherPath = pathManager.getDeploymentPath(networkName, 'ManifestDispatcher.json');
            if ((0, paths_1.fileExists)(altDispatcherPath)) {
                try {
                    const dispatcherData = (0, paths_1.safeParseJSON)((0, paths_1.readFileContent)(altDispatcherPath));
                    dispatcherAddress = dispatcherData.address;
                }
                catch (error) {
                    if (this.cliArgs.verbose) {
                        console.warn(`⚠️ Failed to read alternative dispatcher artifact: ${error}`);
                    }
                }
            }
        }
        if (!dispatcherAddress) {
            throw new RouteApplicationError('Dispatcher not found', 'DISPATCHER_NOT_FOUND', {
                networkName,
                searchPaths: [
                    dispatcherPath,
                    pathManager.getDeploymentPath(networkName, 'ManifestDispatcher.json'),
                ],
            });
        }
        try {
            const dispatcher = await hardhat_1.ethers.getContractAt('ManifestDispatcher', dispatcherAddress);
            if (this.cliArgs.verbose) {
                console.log(`📡 Connected to dispatcher: ${dispatcherAddress}`);
            }
            return dispatcher;
        }
        catch (error) {
            throw new RouteApplicationError('Failed to connect to dispatcher', 'CONNECTION_ERROR', {
                address: dispatcherAddress,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
    /**
     * Check dispatcher state and prerequisites
     */
    async validateDispatcherState(dispatcher) {
        try {
            const pendingRoot = await dispatcher.pendingRoot();
            const pendingEpoch = await dispatcher.pendingEpoch();
            if (pendingRoot === hardhat_1.ethers.ZeroHash || pendingEpoch === 0n) {
                throw new RouteApplicationError('No pending root found - routes cannot be applied', 'NO_PENDING_ROOT', {
                    suggestion: 'Run commit-root.ts first to commit the current manifest',
                    pendingRoot,
                    pendingEpoch: pendingEpoch.toString(),
                });
            }
            if (this.cliArgs.verbose) {
                console.log(`✅ Pending root: ${pendingRoot}`);
                console.log(`✅ Pending epoch: ${pendingEpoch.toString()}`);
            }
            // Check if dispatcher is frozen or paused
            try {
                const frozen = await dispatcher.frozen();
                if (frozen) {
                    throw new RouteApplicationError('Dispatcher is frozen - routes cannot be applied', 'DISPATCHER_FROZEN', { suggestion: 'Contact admin to unfreeze the dispatcher' });
                }
            }
            catch (error) {
                // Some dispatchers might not have frozen() method
                if (this.cliArgs.verbose) {
                    console.log('ℹ️ Could not check frozen state (method may not exist)');
                }
            }
        }
        catch (error) {
            if (error instanceof RouteApplicationError) {
                throw error;
            }
            throw new RouteApplicationError('Failed to validate dispatcher state', 'STATE_CHECK_ERROR', { error: error instanceof Error ? error.message : String(error) });
        }
    }
    /**
     * Build route mappings with validation
     */
    buildRouteMappings(manifest, merkleData) {
        const coder = hardhat_1.ethers.AbiCoder.defaultAbiCoder();
        const routeMappings = [];
        for (let i = 0; i < manifest.routes.length; i++) {
            const route = manifest.routes[i];
            try {
                const expectedLeaf = hardhat_1.ethers.keccak256(coder.encode(['bytes4', 'address', 'bytes32'], [route.selector, route.facet, route.codehash]));
                const leafIndex = merkleData.leaves.indexOf(expectedLeaf);
                if (leafIndex === -1) {
                    throw new RouteApplicationError(`Route leaf not found for selector ${route.selector}`, 'LEAF_NOT_FOUND', { route, expectedLeaf, routeIndex: i });
                }
                const proof = merkleData.proofs[leafIndex];
                const isRight = this.calculateIsRight(leafIndex, merkleData.leaves.length);
                routeMappings.push({
                    route,
                    leafIndex,
                    proof,
                    isRight,
                    selector: route.selector,
                    facet: route.facet,
                    codehash: route.codehash,
                });
            }
            catch (error) {
                throw new RouteApplicationError(`Failed to build route mapping for route ${i}`, 'MAPPING_ERROR', {
                    route,
                    routeIndex: i,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }
        if (this.cliArgs.verbose) {
            console.log(`✅ Built ${routeMappings.length} route mappings`);
        }
        return routeMappings;
    }
    /**
     * Apply routes with enhanced error handling and progress tracking
     */
    async applyRoutesWithRetry(dispatcher, routeMappings) {
        const result = {
            success: false,
            totalRoutes: routeMappings.length,
            appliedRoutes: 0,
            failedRoutes: 0,
            totalGasUsed: 0,
            batches: [],
            errors: [],
            duration: 0,
        };
        const batchSize = Math.max(CONFIG.MIN_BATCH_SIZE, Math.min(CONFIG.MAX_BATCH_SIZE, this.cliArgs.batchSize));
        console.log(`\n⚡ Applying ${routeMappings.length} routes in batches of ${batchSize}...`);
        for (let i = 0; i < routeMappings.length; i += batchSize) {
            const batch = routeMappings.slice(i, i + batchSize);
            const batchNum = Math.floor(i / batchSize) + 1;
            const totalBatches = Math.ceil(routeMappings.length / batchSize);
            const batchResult = await this.applyBatchWithRetry(dispatcher, batch, batchNum, totalBatches);
            result.batches.push(batchResult);
            result.totalGasUsed += batchResult.gasUsed;
            if (batchResult.success) {
                result.appliedRoutes += batch.length;
            }
            else {
                result.failedRoutes += batch.length;
                result.errors.push(`Batch ${batchNum}: ${batchResult.error}`);
            }
            // Progress indicator
            const progress = Math.round((batchNum / totalBatches) * 100);
            console.log(`📊 Progress: ${progress}% (${batchNum}/${totalBatches} batches)`);
        }
        result.success = result.failedRoutes === 0;
        return result;
    }
    /**
     * Apply a single batch with retry logic
     */
    async applyBatchWithRetry(dispatcher, batch, batchNum, totalBatches) {
        const batchResult = {
            batchNumber: batchNum,
            routes: batch,
            gasUsed: 0,
            transactionHash: '',
            success: false,
        };
        console.log(`\n📦 Batch ${batchNum}/${totalBatches} (${batch.length} routes):`);
        if (this.cliArgs.verbose) {
            console.log('  Selectors:', batch.map(m => m.selector).join(', '));
        }
        for (let attempt = 1; attempt <= this.cliArgs.maxRetries; attempt++) {
            try {
                if (this.cliArgs.dryRun) {
                    console.log('  🔍 DRY RUN: Would apply batch (no actual transaction)');
                    batchResult.success = true;
                    batchResult.transactionHash =
                        '0x0000000000000000000000000000000000000000000000000000000000000000';
                    return batchResult;
                }
                const selectors = batch.map(m => m.selector);
                const facets = batch.map(m => m.facet);
                const codehashes = batch.map(m => m.codehash);
                const proofs = batch.map(m => m.proof);
                const isRightArrays = batch.map(m => m.isRight);
                const applyTx = await dispatcher.applyRoutes(selectors, facets, codehashes, proofs, isRightArrays);
                console.log('  ⏳ Transaction submitted:', applyTx.hash);
                const applyReceipt = await applyTx.wait();
                const gasUsed = Number(applyReceipt?.gasUsed || 0);
                batchResult.gasUsed = gasUsed;
                batchResult.transactionHash = applyTx.hash;
                batchResult.success = true;
                console.log(`  ✅ Batch applied! Gas used: ${gasUsed.toLocaleString()}`);
                return batchResult;
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.error(`  ❌ Attempt ${attempt}/${this.cliArgs.maxRetries} failed: ${errorMessage}`);
                if (attempt === this.cliArgs.maxRetries) {
                    batchResult.error = errorMessage;
                    return batchResult;
                }
                // Wait before retry
                console.log(`  ⏳ Retrying in ${CONFIG.RETRY_DELAY}ms...`);
                await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY));
            }
        }
        return batchResult;
    }
    /**
     * Verify applied routes
     */
    async verifyRoutes(dispatcher, routeMappings) {
        console.log('\n🔍 Verifying applied routes...');
        const sampleSize = Math.min(CONFIG.VERIFICATION_SAMPLE_SIZE, routeMappings.length);
        const sampleIndices = [
            0, // First route
            Math.floor(routeMappings.length / 2), // Middle route
            routeMappings.length - 1, // Last route
        ].slice(0, sampleSize);
        let verifiedCount = 0;
        let failedCount = 0;
        for (const index of sampleIndices) {
            const mapping = routeMappings[index];
            try {
                const route = await dispatcher.routes(mapping.selector);
                if (route.facet.toLowerCase() === mapping.facet.toLowerCase()) {
                    console.log(`✅ ${mapping.selector} → ${route.facet} (verified)`);
                    verifiedCount++;
                }
                else {
                    console.log(`❌ ${mapping.selector}: Expected ${mapping.facet}, got ${route.facet}`);
                    failedCount++;
                }
            }
            catch (error) {
                console.log(`❌ ${mapping.selector}: Verification failed - ${error instanceof Error ? error.message : String(error)}`);
                failedCount++;
            }
        }
        if (failedCount === 0) {
            console.log(`✅ All ${verifiedCount} sample routes verified successfully`);
        }
        else {
            console.log(`⚠️ ${failedCount}/${sampleSize} routes failed verification`);
        }
    }
    /**
     * Display summary report
     */
    displaySummary(result, routeCount) {
        console.log('\n' + '='.repeat(60));
        console.log('📊 ROUTE APPLICATION SUMMARY');
        console.log('='.repeat(60));
        console.log(`📋 Total Routes: ${routeCount}`);
        console.log(`✅ Successfully Applied: ${result.appliedRoutes}`);
        console.log(`❌ Failed: ${result.failedRoutes}`);
        console.log(`📦 Batches Processed: ${result.batches.length}`);
        console.log(`⛽ Total Gas Used: ${result.totalGasUsed.toLocaleString()}`);
        console.log(`⏱️ Duration: ${result.duration}ms`);
        console.log(`📈 Success Rate: ${Math.round((result.appliedRoutes / routeCount) * 100)}%`);
        if (result.errors.length > 0) {
            console.log('\n❌ ERRORS:');
            result.errors.forEach(error => console.log(`  • ${error}`));
        }
        if (result.success) {
            console.log('\n🎉 All routes successfully applied!');
            console.log('💎 Diamond pattern routing is now fully active!');
            console.log('ℹ️ Root activation should be handled separately via activate-root.ts');
        }
        else {
            console.log('\n⚠️ Some routes failed to apply. Check errors above.');
        }
    }
    /**
     * Main execution function
     */
    async execute() {
        this.startTime = Date.now();
        try {
            console.log('🔗 Enhanced Apply All Routes v2.0.0');
            if (this.cliArgs.dryRun) {
                console.log('🔍 DRY RUN MODE - No actual changes will be made');
            }
            if (this.cliArgs.verbose) {
                console.log('📝 Verbose logging enabled');
                console.log('⚙️ Configuration:', {
                    batchSize: this.cliArgs.batchSize,
                    maxRetries: this.cliArgs.maxRetries,
                    timeout: this.cliArgs.timeout,
                });
            }
            // Load and validate data
            console.log('\n📂 Loading manifest data...');
            const { manifest, merkleData } = await this.loadManifestData();
            console.log('🔍 Validating data...');
            const validation = this.validateData(manifest, merkleData);
            if (validation.warnings.length > 0) {
                console.log('⚠️ Warnings:');
                validation.warnings.forEach(warning => console.log(`  • ${warning}`));
            }
            if (!validation.isValid) {
                throw new ValidationError('Data validation failed', validation.errors);
            }
            console.log(`✅ Loaded manifest with ${manifest.routes.length} routes`);
            console.log(`🌳 Merkle root: ${merkleData.root}`);
            // Get dispatcher and validate state
            console.log('\n🔌 Connecting to dispatcher...');
            const dispatcher = await this.getDispatcher();
            console.log('🔍 Checking dispatcher state...');
            await this.validateDispatcherState(dispatcher);
            // Build route mappings
            console.log('\n📝 Building route mappings...');
            const routeMappings = this.buildRouteMappings(manifest, merkleData);
            // Confirmation prompt (unless --force)
            if (!this.cliArgs.force && !this.cliArgs.dryRun) {
                console.log(`\n⚠️ About to apply ${routeMappings.length} routes in ${Math.ceil(routeMappings.length / this.cliArgs.batchSize)} batches`);
                console.log('⏳ Proceeding in 3 seconds... (Press Ctrl+C to cancel)');
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
            // Apply routes
            const result = await this.applyRoutesWithRetry(dispatcher, routeMappings);
            result.duration = Date.now() - this.startTime;
            // Verify routes if successful
            if (result.success && !this.cliArgs.dryRun) {
                await this.verifyRoutes(dispatcher, routeMappings);
            }
            // Display summary
            this.displaySummary(result, routeMappings.length);
            if (!result.success) {
                process.exit(1);
            }
        }
        catch (error) {
            const duration = Date.now() - this.startTime;
            console.error('\n❌ Route application failed:');
            if (error instanceof ValidationError) {
                console.error('📋 Validation Errors:');
                error.validationErrors.forEach(err => console.error(`  • ${err}`));
            }
            else if (error instanceof RouteApplicationError) {
                console.error(`🔧 Error Code: ${error.code}`);
                console.error(`📝 Message: ${error.message}`);
                if (error.details && this.cliArgs.verbose) {
                    console.error('🔍 Details:', JSON.stringify(error.details, null, 2));
                }
            }
            else {
                console.error('💥 Unexpected Error:', error instanceof Error ? error.message : String(error));
            }
            console.error(`⏱️ Failed after ${duration}ms`);
            console.error('\n💡 TROUBLESHOOTING:');
            console.error('  1. Ensure dispatcher is deployed and accessible');
            console.error('  2. Verify manifest and merkle data are valid');
            console.error('  3. Check that a root has been committed first');
            console.error('  4. Use --verbose for detailed debugging information');
            console.error('  5. Try --dry-run to preview operations');
            process.exit(1);
        }
    }
}
exports.EnhancedRouteApplicator = EnhancedRouteApplicator;
// Add timeout protection
if (process.env.NODE_ENV !== 'test') {
    const EXECUTION_TIMEOUT = 600000; // 10 minutes maximum
    setTimeout(() => {
        console.error('\n⚠️ Script execution timeout (10 minutes exceeded)');
        console.error('   This prevents potential infinite loops or hanging operations');
        console.error('   Check network connectivity and try again with smaller batch sizes');
        process.exit(1);
    }, EXECUTION_TIMEOUT);
}
// Execute the enhanced route applicator
if (require.main === module) {
    const applicator = new EnhancedRouteApplicator();
    applicator.execute().catch(() => {
        // Error handling is done in the execute method
        process.exit(1);
    });
}
