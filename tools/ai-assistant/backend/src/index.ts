import compression from 'compression';
import cors from 'cors';
import { config } from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import { SolidityAnalyzer } from './analyzers/SolidityAnalyzer';
import { AIService } from './services/AIService';
import { ContractRefactorWizard } from './services/ContractRefactorWizard';
import { DeploymentAssistant } from './services/DeploymentAssistant';
import { FacetSimulator } from './services/FacetSimulator';
import { StorageLayoutChecker } from './services/StorageLayoutChecker';

// Load environment variables
config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security and optimization middleware
app.use(helmet());
app.use(compression());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  })
);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request timing middleware
app.use((req, _res, next) => {
  req.startTime = Date.now();
  next();
});

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Initialize services
const analyzer = new SolidityAnalyzer();
const aiService = new AIService();
const refactorWizard = new ContractRefactorWizard(analyzer, aiService);
const facetSimulator = new FacetSimulator(analyzer);
const storageChecker = new StorageLayoutChecker(analyzer);
const deploymentAssistant = new DeploymentAssistant();

// API Routes

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      analyzer: 'ready',
      ai: 'ready',
      refactor: 'ready',
      simulator: 'ready',
      storage: 'ready',
      deployment: 'ready',
    },
  });
});

/**
 * Analyze Solidity contract with enhanced analysis
 */
app.post('/api/analyze', async (req, res) => {
  try {
    const {
      contractCode,
      contractName,
      analysisType = 'refactor',
      preferences = {},
    } = req.body;

    if (!contractCode) {
      return res.status(400).json({
        success: false,
        error: 'Source code is required',
      });
    }

    // Enhanced analysis with better error handling
    const [basicAnalysis, aiInsights] = await Promise.all([
      analyzer.parseContract(contractCode, contractName),
      Promise.resolve({
        recommendations: [],
        gasOptimizations: [],
        securityIssues: [],
      }), // Placeholder for AI service
    ]);

    // Generate facet suggestions based on analysis type
    const facetSuggestions = await refactorWizard
      .generateRefactorSuggestions(contractCode, contractName, {
        ...preferences,
        analysisType,
      })
      .catch(() => []);

    // Determine deployment strategy
    let deploymentStrategy: 'single' | 'faceted' | 'chunked' = 'single';
    if (contractCode.length > 24000) {
      deploymentStrategy = 'chunked';
    } else if (Array.isArray(facetSuggestions) && facetSuggestions.length > 2) {
      deploymentStrategy = 'faceted';
    }

    // Generate manifest routes from facet suggestions with proper security levels
    const manifestRoutes = Array.isArray(facetSuggestions)
      ? facetSuggestions.flatMap(
          facet =>
            facet.functions?.map(func => {
              let securityLevel = 'low';
              if (func.name.includes('set') || func.name.includes('pause')) {
                securityLevel = 'critical';
              } else if (func.name.includes('transfer')) {
                securityLevel = 'medium';
              }

              return {
                functionName: func.name,
                selector: func.selector || '0x00000000',
                securityLevel,
              };
            }) || []
        )
      : [];

    // Combine all analysis results
    const enhancedAnalysis = {
      name: contractName || 'UnnamedContract',
      functions: basicAnalysis.functions?.length || 0,
      variables: basicAnalysis.variables?.length || 0,
      size: contractCode.length,
      deploymentStrategy,
      chunkingRequired: contractCode.length > 24000,
      facetCandidates: Array.isArray(facetSuggestions) ? facetSuggestions : [],
      manifestRoutes,
      storageWarnings: [], // Will be populated by proper storage analysis
      gasOptimizations: [
        'Facet-based deployment reduces individual deployment costs',
        'Diamond storage pattern prevents storage collisions',
        'Modular upgrade capability reduces redeployment costs',
        ...(aiInsights.gasOptimizations || []),
      ],
      securityConsiderations: [
        `${
          manifestRoutes.filter(r => r.securityLevel === 'critical').length
        } critical functions require enhanced access control`,
        'Implement proper role-based access control',
        deploymentStrategy === 'faceted'
          ? 'Separate facets recommended for privilege separation'
          : 'Consider facet separation for complex contracts',
        ...(aiInsights.securityIssues || []),
      ],
      complexity: 'medium', // Will be calculated based on analysis
      aiRecommendations: aiInsights.recommendations || [],
    };

    return res.json({
      success: true,
      analysis: enhancedAnalysis,
      metadata: {
        analysisType,
        timestamp: new Date().toISOString(),
        processingTime: req.startTime ? Date.now() - req.startTime : 0,
      },
    });
  } catch (error) {
    console.error('Analysis error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Analysis failed',
    });
  }
});

/**
 * Generate facet refactoring suggestions
 */
app.post('/api/refactor/suggestions', async (req, res) => {
  try {
    const { sourceCode, contractName, preferences } = req.body;

    if (!sourceCode) {
      return res.status(400).json({ error: 'Source code is required' });
    }

    const suggestions = await refactorWizard.generateRefactorSuggestions(
      sourceCode,
      contractName,
      preferences
    );

    return res.json({ success: true, data: suggestions });
  } catch (error) {
    console.error('Refactor suggestions error:', error);
    return res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : 'Refactor analysis failed',
    });
  }
});

/**
 * Apply refactoring to generate facets
 */
app.post('/api/refactor/apply', async (req, res) => {
  try {
    const { sourceCode, contractName, facetPlan } = req.body;

    if (!sourceCode || !facetPlan) {
      return res
        .status(400)
        .json({ error: 'Source code and facet plan are required' });
    }

    const result = await refactorWizard.applyRefactoring(
      sourceCode,
      contractName,
      facetPlan
    );
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('Refactor apply error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Refactoring failed',
    });
  }
});

/**
 * Simulate facet interactions
 */
app.post('/api/simulate', async (req, res) => {
  try {
    const { facets, testScenarios } = req.body;

    if (!facets || !Array.isArray(facets)) {
      return res.status(400).json({ error: 'Facets array is required' });
    }

    const results = await facetSimulator.simulateInteractions(
      facets,
      testScenarios
    );
    return res.json({ success: true, data: results });
  } catch (error) {
    console.error('Simulation error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Simulation failed',
    });
  }
});

/**
 * Check storage layout safety
 */
app.post('/api/storage/check', async (req, res) => {
  try {
    const { originalContract, facets } = req.body;

    if (!originalContract || !facets) {
      return res
        .status(400)
        .json({ error: 'Original contract and facets are required' });
    }

    const report = await storageChecker.checkStorageLayoutSafety(
      originalContract,
      facets
    );
    return res.json({ success: true, data: report });
  } catch (error) {
    console.error('Storage check error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Storage check failed',
    });
  }
});

/**
 * Generate deployment configuration
 */
app.post('/api/deploy/config', async (req, res) => {
  try {
    const { facets, network, preferences } = req.body;

    if (!facets || !network) {
      return res.status(400).json({ error: 'Facets and network are required' });
    }

    const config = await deploymentAssistant.generateDeploymentConfig(
      facets,
      network,
      preferences
    );
    return res.json({ success: true, data: config });
  } catch (error) {
    console.error('Deployment config error:', error);
    return res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Deployment config generation failed',
    });
  }
});

/**
 * Generate PayRox Go Beyond manifest
 */
app.post('/api/deploy/manifest', async (req, res) => {
  try {
    const { facets, metadata } = req.body;

    if (!facets) {
      return res.status(400).json({ error: 'Facets are required' });
    }

    const manifest = await deploymentAssistant.generateManifest(
      facets,
      metadata
    );
    return res.json({ success: true, data: manifest });
  } catch (error) {
    console.error('Manifest generation error:', error);
    return res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : 'Manifest generation failed',
    });
  }
});

/**
 * Execute deployment dry run
 */
app.post('/api/deploy/dry-run', async (req, res) => {
  try {
    const { manifest, network } = req.body;

    if (!manifest || !network) {
      return res
        .status(400)
        .json({ error: 'Manifest and network are required' });
    }

    const result = await deploymentAssistant.executeDryRun(manifest, network);
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('Dry run error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Dry run failed',
    });
  }
});

/**
 * Get available analysis templates
 */
app.get('/api/templates', (req, res) => {
  try {
    const templates = [
      'ERC20',
      'ERC721',
      'ERC1155',
      'DeFi',
      'DAO',
      'Social',
      'Gaming',
      'Staking',
      'Governance',
      'NFTMarketplace',
    ];
    return res.json({ success: true, templates });
  } catch (error) {
    console.error('Templates error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch templates',
    });
  }
});

/**
 * Validate contract syntax
 */
app.post('/api/validate', async (req, res) => {
  try {
    const { contractCode } = req.body;

    if (!contractCode) {
      return res.status(400).json({
        success: false,
        error: 'Contract code is required',
      });
    }

    try {
      await analyzer.parseContract(contractCode, 'ValidationContract');
      return res.json({
        success: true,
        isValid: true,
        errors: [],
        warnings: [],
      });
    } catch (parseError) {
      return res.json({
        success: true,
        isValid: false,
        errors: [
          parseError instanceof Error ? parseError.message : 'Syntax error',
        ],
        warnings: [],
      });
    }
  } catch (error) {
    console.error('Validation error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Validation failed',
    });
  }
});

/**
 * Get system metrics and performance stats
 */
app.get('/api/metrics', (req, res) => {
  try {
    const metrics = {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.version,
      platform: process.platform,
      timestamp: new Date().toISOString(),
      services: {
        analyzer: 'operational',
        refactor: 'operational',
        simulator: 'operational',
        deployment: 'operational',
      },
    };
    return res.json({ success: true, metrics });
  } catch (error) {
    console.error('Metrics error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch metrics',
    });
  }
});

// Error handling middleware
app.use(
  (
    error: Error,
    req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error('Unhandled error:', error);
    res.status(500).json({
      success: false,
      error:
        process.env.NODE_ENV === 'production'
          ? 'Internal server error'
          : error.message,
    });
  }
);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.path} not found`,
  });
});

// Start server
app.listen(PORT, () => {
  console.log('🚀 PayRox AI Assistant Backend');
  console.log(`📡 Server running on port ${PORT}`);
  console.log(`🌐 API available at http://localhost:${PORT}`);
  console.log(`🔍 Health check: http://localhost:${PORT}/health`);
  console.log('⚡ Ready to assist with contract modularization!');
});

export default app;
