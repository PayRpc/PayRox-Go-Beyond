import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { config } from 'dotenv';
import { SolidityAnalyzer } from './analyzers/SolidityAnalyzer';
import { ContractRefactorWizard } from './services/ContractRefactorWizard';
import { FacetSimulator } from './services/FacetSimulator';
import { StorageLayoutChecker } from './services/StorageLayoutChecker';
import { DeploymentAssistant } from './services/DeploymentAssistant';
import { AIService } from './services/AIService';

// Load environment variables
config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security and optimization middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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
      deployment: 'ready'
    }
  });
});

/**
 * Analyze Solidity contract
 */
app.post('/api/analyze', async (req, res) => {
  try {
    const { sourceCode, contractName } = req.body;
    
    if (!sourceCode) {
      return res.status(400).json({ error: 'Source code is required' });
    }

    const analysis = await analyzer.parseContract(sourceCode, contractName);
    return res.json({ success: true, data: analysis });
  } catch (error) {
    console.error('Analysis error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Analysis failed' 
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
      error: error instanceof Error ? error.message : 'Refactor analysis failed' 
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
      return res.status(400).json({ error: 'Source code and facet plan are required' });
    }

    const result = await refactorWizard.applyRefactoring(sourceCode, contractName, facetPlan);
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('Refactor apply error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Refactoring failed' 
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

    const results = await facetSimulator.simulateInteractions(facets, testScenarios);
    return res.json({ success: true, data: results });
  } catch (error) {
    console.error('Simulation error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Simulation failed' 
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
      return res.status(400).json({ error: 'Original contract and facets are required' });
    }

    const report = await storageChecker.checkStorageLayoutSafety(originalContract, facets);
    return res.json({ success: true, data: report });
  } catch (error) {
    console.error('Storage check error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Storage check failed' 
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

    const config = await deploymentAssistant.generateDeploymentConfig(facets, network, preferences);
    return res.json({ success: true, data: config });
  } catch (error) {
    console.error('Deployment config error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Deployment config generation failed' 
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

    const manifest = await deploymentAssistant.generateManifest(facets, metadata);
    return res.json({ success: true, data: manifest });
  } catch (error) {
    console.error('Manifest generation error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Manifest generation failed' 
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
      return res.status(400).json({ error: 'Manifest and network are required' });
    }

    const result = await deploymentAssistant.executeDryRun(manifest, network);
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('Dry run error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Dry run failed' 
    });
  }
});

// Error handling middleware
app.use((error: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ 
    success: false, 
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    error: `Route ${req.method} ${req.path} not found` 
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
