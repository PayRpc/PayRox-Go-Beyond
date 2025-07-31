import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  })
);
app.use(express.json({ limit: '50mb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
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

// Mock analyze endpoint that matches frontend expectations
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
        error: 'Contract code is required',
      });
    }

    // Simple mock analysis
    const functions = (contractCode.match(/function\s+\w+/g) || []).length;
    const variables = (
      contractCode.match(/\b(uint256|address|mapping|bool)\s+\w+/g) || []
    ).length;

    const mockAnalysis = {
      name: contractName || 'UnnamedContract',
      functions,
      variables,
      size: contractCode.length,
      deploymentStrategy:
        contractCode.length > 24000
          ? 'chunked'
          : functions > 5
          ? 'faceted'
          : 'single',
      chunkingRequired: contractCode.length > 24000,
      facetCandidates: [
        {
          name: 'CoreFacet',
          functions: [
            {
              name: 'transfer',
              visibility: 'external',
              stateMutability: 'nonpayable',
            },
            {
              name: 'mint',
              visibility: 'external',
              stateMutability: 'nonpayable',
            },
          ],
        },
        {
          name: 'AdminFacet',
          functions: [
            {
              name: 'setOwner',
              visibility: 'external',
              stateMutability: 'nonpayable',
            },
            {
              name: 'pause',
              visibility: 'external',
              stateMutability: 'nonpayable',
            },
          ],
        },
        {
          name: 'ViewFacet',
          functions: [
            {
              name: 'getBalance',
              visibility: 'external',
              stateMutability: 'view',
            },
          ],
        },
      ],
      manifestRoutes: [
        {
          functionName: 'setOwner',
          selector: '0x40caae06',
          securityLevel: 'critical',
        },
        {
          functionName: 'pause',
          selector: '0x8456cb59',
          securityLevel: 'critical',
        },
        {
          functionName: 'transfer',
          selector: '0x8a4068dd',
          securityLevel: 'medium',
        },
        {
          functionName: 'getBalance',
          selector: '0x12065fe0',
          securityLevel: 'low',
        },
      ],
      storageWarnings: ['Consider diamond storage pattern for facet isolation'],
      gasOptimizations: [
        'Facet-based deployment reduces individual deployment costs',
        'Diamond storage pattern prevents storage collisions',
        'Modular upgrade capability reduces redeployment costs',
      ],
      securityConsiderations: [
        '2 critical functions require enhanced access control',
        'Implement proper role-based access control',
        'Separate facets recommended for privilege separation',
      ],
      complexity: 'medium',
      aiRecommendations: [
        'Consider splitting admin functions into separate facet',
        'Implement proper access control patterns',
        'Add comprehensive event logging',
      ],
    };

    return res.json({
      success: true,
      analysis: mockAnalysis,
      metadata: {
        analysisType,
        timestamp: new Date().toISOString(),
        processingTime: Math.floor(Math.random() * 1000) + 500,
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

// Templates endpoint
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

// Validation endpoint
app.post('/api/validate', async (req, res) => {
  try {
    const { contractCode } = req.body;

    if (!contractCode) {
      return res.status(400).json({
        success: false,
        error: 'Contract code is required',
      });
    }

    // Simple validation - check for basic Solidity syntax
    const hasVersionPragma = contractCode.includes('pragma solidity');
    const hasContract = contractCode.includes('contract ');
    const hasSyntaxErrors =
      contractCode.includes('syntax error') ||
      contractCode.includes('unexpected token');

    return res.json({
      success: true,
      isValid: hasVersionPragma && hasContract && !hasSyntaxErrors,
      errors:
        hasVersionPragma && hasContract && !hasSyntaxErrors
          ? []
          : ['Basic syntax validation failed'],
      warnings: hasVersionPragma ? [] : ['Missing pragma solidity statement'],
    });
  } catch (error) {
    console.error('Validation error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Validation failed',
    });
  }
});

// Metrics endpoint
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

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.path} not found`,
  });
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

// Start server
app.listen(PORT, () => {
  console.log('🚀 PayRox AI Assistant Backend (Simple)');
  console.log(`📡 Server running on port ${PORT}`);
  console.log(`🌐 API available at http://localhost:${PORT}`);
  console.log(`🔍 Health check: http://localhost:${PORT}/api/health`);
  console.log('⚡ Ready to assist with contract modularization!');
});

export default app;
