import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { SolidityAnalyzer } from './analyzers/SolidityAnalyzer';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Initialize analyzer
const analyzer = new SolidityAnalyzer();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'PayRox AI Assistant Backend'
  });
});

/**
 * Basic contract analysis endpoint
 */
app.post('/api/analyze', async (req, res) => {
  try {
    const { sourceCode, contractName } = req.body;
    
    if (!sourceCode) {
      return res.status(400).json({ error: 'Source code is required' });
    }

    // Basic analysis using SolidityAnalyzer
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
 * Basic refactoring suggestions endpoint
 */
app.post('/api/refactor/suggestions', async (req, res) => {
  try {
    const { sourceCode, contractName } = req.body;
    
    if (!sourceCode) {
      return res.status(400).json({ error: 'Source code is required' });
    }

    // Use SolidityAnalyzer to parse contract
    const analysis = await analyzer.parseContract(sourceCode, contractName);
    
    // Generate basic facet suggestions based on functions
    const facetSuggestions = [
      {
        name: 'AdminFacet',
        functions: analysis.functions.filter(f => f.name.toLowerCase().includes('admin') || 
                                                f.name.toLowerCase().includes('owner')),
        category: 'admin',
        estimatedSize: 5000
      },
      {
        name: 'ViewFacet', 
        functions: analysis.functions.filter(f => f.stateMutability === 'view' || 
                                                f.stateMutability === 'pure'),
        category: 'view',
        estimatedSize: 3000
      },
      {
        name: 'CoreFacet',
        functions: analysis.functions.filter(f => f.stateMutability === 'nonpayable' || 
                                                f.stateMutability === 'payable'),
        category: 'core',
        estimatedSize: 8000
      }
    ].filter(facet => facet.functions.length > 0);
    
    return res.json({ 
      success: true, 
      data: { 
        facetCandidates: facetSuggestions,
        recommendations: [
          'Consider separating administrative functions into an AdminFacet',
          'Group view functions into a separate ViewFacet for gas optimization',
          'Isolate storage-heavy operations into dedicated facets'
        ]
      }
    });
  } catch (error) {
    console.error('Refactor suggestions error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Refactor analysis failed' 
    });
  }
});

/**
 * Simulate facet interactions
 */
app.post('/api/simulate', async (req, res) => {
  try {
    const { facets } = req.body;
    
    if (!facets || !Array.isArray(facets)) {
      return res.status(400).json({ error: 'Facets array is required' });
    }

    // Basic simulation response
    const simulationResults = facets.map((facet, index) => ({
      name: `Simulation ${index + 1}: ${facet.name || 'Unknown'}`,
      success: true,
      gasUsed: Math.floor(Math.random() * 100000) + 21000,
      result: `Successfully simulated ${facet.name || 'facet'} deployment and interactions`,
      warnings: []
    }));

    return res.json({ success: true, data: simulationResults });
  } catch (error) {
    console.error('Simulation error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Simulation failed' 
    });
  }
});

// Error handling middleware
app.use((error: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', error);
  if (!res.headersSent) {
    res.status(500).json({ 
      success: false, 
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message 
    });
  }
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
  console.log('🚀 PayRox AI Assistant Backend (Simplified)');
  console.log(`📡 Server running on port ${PORT}`);
  console.log(`🌐 API available at http://localhost:${PORT}`);
  console.log(`🔍 Health check: http://localhost:${PORT}/health`);
  console.log('⚡ Ready to assist with contract analysis!');
});

export default app;
