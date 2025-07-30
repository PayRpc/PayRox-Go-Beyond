import React, { useState, useEffect } from 'react';
import './styles/globals.css';
import './styles/components.css';

// Types
interface ContractAnalysis {
  name: string;
  functions: number;
  variables: number;
  size: number;
  deploymentStrategy: 'single' | 'faceted' | 'chunked';
  chunkingRequired: boolean;
  facetCandidates: Array<{
    name: string;
    functions: Array<{
      name: string;
      visibility: string;
      stateMutability: string;
    }>;
  }>;
  manifestRoutes: Array<{
    functionName: string;
    selector: string;
    securityLevel: string;
  }>;
  storageWarnings: string[];
  gasOptimizations: string[];
  securityConsiderations: string[];
}

interface AnalysisStatus {
  isAnalyzing: boolean;
  hasError: boolean;
  errorMessage?: string;
}

// Components
const Header: React.FC = () => (
  <header className="header">
    <div className="container">
      <h1>PayRox Go Beyond</h1>
      <p>AI-Powered Smart Contract Modularization Platform</p>
    </div>
  </header>
);

const ContractInput: React.FC<{
  onAnalyze: (code: string, name: string) => void;
  isAnalyzing: boolean;
}> = ({ onAnalyze, isAnalyzing }) => {
  const [contractCode, setContractCode] = useState('');
  const [contractName, setContractName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (contractCode.trim() && contractName.trim()) {
      onAnalyze(contractCode, contractName);
    }
  };

  const loadSampleContract = () => {
    setContractName('ExampleContract');
    setContractCode(`// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ExampleContract {
    address public owner;
    mapping(address => uint256) public balances;
    uint256 public totalSupply;
    bool public paused;

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }

    constructor() {
        owner = msg.sender;
        totalSupply = 1000000;
    }

    function setOwner(address newOwner) external onlyOwner {
        owner = newOwner;
    }

    function pause() external onlyOwner {
        paused = true;
    }

    function unpause() external onlyOwner {
        paused = false;
    }

    function transfer(address to, uint256 amount) external whenNotPaused {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        balances[msg.sender] -= amount;
        balances[to] += amount;
    }

    function mint(address to, uint256 amount) external onlyOwner {
        balances[to] += amount;
        totalSupply += amount;
    }

    function getBalance(address account) external view returns (uint256) {
        return balances[account];
    }
}`);
  };

  return (
    <section className="contract-input">
      <div className="container">
        <h2>Contract Analysis</h2>
        <form onSubmit={handleSubmit} className="analysis-form">
          <div className="form-group">
            <label htmlFor="contractName">Contract Name</label>
            <input
              id="contractName"
              type="text"
              value={contractName}
              onChange={(e) => setContractName(e.target.value)}
              placeholder="Enter contract name"
              disabled={isAnalyzing}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="contractCode">Solidity Contract Code</label>
            <textarea
              id="contractCode"
              value={contractCode}
              onChange={(e) => setContractCode(e.target.value)}
              placeholder="Paste your Solidity contract code here..."
              disabled={isAnalyzing}
              rows={20}
              required
            />
          </div>
          
          <div className="form-actions">
            <button
              type="button"
              onClick={loadSampleContract}
              className="btn btn-secondary"
              disabled={isAnalyzing}
            >
              Load Sample Contract
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isAnalyzing || !contractCode.trim() || !contractName.trim()}
            >
              {isAnalyzing ? (
                <>
                  <span className="spinner"></span>
                  Analyzing...
                </>
              ) : (
                'Analyze Contract'
              )}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
};

const AnalysisResults: React.FC<{ analysis: ContractAnalysis }> = ({ analysis }) => (
  <section className="analysis-results">
    <div className="container">
      <h2>Analysis Results</h2>
      
      <div className="results-grid">
        <div className="metrics-card">
          <h3>Basic Metrics</h3>
          <div className="metrics-list">
            <div className="metric">
              <span className="metric-label">Contract Name:</span>
              <span className="metric-value">{analysis.name}</span>
            </div>
            <div className="metric">
              <span className="metric-label">Total Functions:</span>
              <span className="metric-value">{analysis.functions}</span>
            </div>
            <div className="metric">
              <span className="metric-label">Total Variables:</span>
              <span className="metric-value">{analysis.variables}</span>
            </div>
            <div className="metric">
              <span className="metric-label">Contract Size:</span>
              <span className="metric-value">{analysis.size} bytes</span>
            </div>
            <div className="metric">
              <span className="metric-label">Deployment Strategy:</span>
              <span className={`metric-value strategy-${analysis.deploymentStrategy}`}>
                {analysis.deploymentStrategy}
              </span>
            </div>
            <div className="metric">
              <span className="metric-label">Chunking Required:</span>
              <span className={`metric-value ${analysis.chunkingRequired ? 'warning' : 'success'}`}>
                {analysis.chunkingRequired ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
        </div>

        <div className="facets-card">
          <h3>Facet Candidates</h3>
          <div className="facets-list">
            {analysis.facetCandidates.map((facet, index) => (
              <div key={index} className="facet-item">
                <h4>{facet.name}</h4>
                <p>{facet.functions.length} functions</p>
                <div className="function-list">
                  {facet.functions.map((fn, fnIndex) => (
                    <div key={fnIndex} className="function-item">
                      <code>{fn.name}</code>
                      <span className="function-meta">
                        {fn.stateMutability}, {fn.visibility}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="routes-card">
          <h3>Manifest Routes</h3>
          <div className="routes-table">
            <table>
              <thead>
                <tr>
                  <th>Function</th>
                  <th>Selector</th>
                  <th>Security Level</th>
                </tr>
              </thead>
              <tbody>
                {analysis.manifestRoutes.slice(0, 5).map((route, index) => (
                  <tr key={index}>
                    <td><code>{route.functionName}</code></td>
                    <td><code>{route.selector}</code></td>
                    <td>
                      <span className={`security-badge security-${route.securityLevel}`}>
                        {route.securityLevel}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {analysis.storageWarnings.length > 0 && (
          <div className="warnings-card">
            <h3>Storage Warnings</h3>
            <ul className="warnings-list">
              {analysis.storageWarnings.map((warning, index) => (
                <li key={index} className="warning-item">{warning}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="optimizations-card">
          <h3>Gas Optimizations</h3>
          <ul className="optimizations-list">
            {analysis.gasOptimizations.map((optimization, index) => (
              <li key={index} className="optimization-item">{optimization}</li>
            ))}
          </ul>
        </div>

        <div className="security-card">
          <h3>Security Considerations</h3>
          <ul className="security-list">
            {analysis.securityConsiderations.map((consideration, index) => (
              <li key={index} className="security-item">{consideration}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  </section>
);

const ErrorDisplay: React.FC<{ message: string; onClear: () => void }> = ({ message, onClear }) => (
  <div className="error-display">
    <div className="container">
      <div className="error-card">
        <h3>Analysis Error</h3>
        <p>{message}</p>
        <button onClick={onClear} className="btn btn-secondary">
          Clear Error
        </button>
      </div>
    </div>
  </div>
);

// Main App Component
const App: React.FC = () => {
  const [analysis, setAnalysis] = useState<ContractAnalysis | null>(null);
  const [status, setStatus] = useState<AnalysisStatus>({
    isAnalyzing: false,
    hasError: false,
  });

  const handleAnalyze = async (contractCode: string, contractName: string) => {
    setStatus({ isAnalyzing: true, hasError: false });
    setAnalysis(null);

    try {
      // Simulate API call - replace with actual backend integration
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock analysis result - replace with actual API response
      const mockAnalysis: ContractAnalysis = {
        name: contractName,
        functions: 11,
        variables: 4,
        size: 1404,
        deploymentStrategy: 'faceted',
        chunkingRequired: false,
        facetCandidates: [
          {
            name: 'CoreFacet',
            functions: [
              { name: 'constructor', visibility: 'default', stateMutability: 'nonpayable' },
              { name: 'transfer', visibility: 'external', stateMutability: 'nonpayable' }
            ]
          },
          {
            name: 'AdminFacet',
            functions: [
              { name: 'setOwner', visibility: 'external', stateMutability: 'nonpayable' },
              { name: 'pause', visibility: 'external', stateMutability: 'nonpayable' },
              { name: 'unpause', visibility: 'external', stateMutability: 'nonpayable' }
            ]
          },
          {
            name: 'ViewFacet',
            functions: [
              { name: 'getBalance', visibility: 'external', stateMutability: 'view' }
            ]
          }
        ],
        manifestRoutes: [
          { functionName: 'setOwner', selector: '0x40caae06', securityLevel: 'critical' },
          { functionName: 'pause', selector: '0x8456cb59', securityLevel: 'critical' },
          { functionName: 'transfer', selector: '0x8a4068dd', securityLevel: 'medium' }
        ],
        storageWarnings: [
          'Contract may not be diamond storage compliant - consider using diamond storage pattern'
        ],
        gasOptimizations: [
          'Modular facet deployment reduces individual deployment costs',
          'Implement diamond storage pattern to avoid storage collisions'
        ],
        securityConsiderations: [
          '3 critical functions require enhanced access control',
          'Storage collisions detected - implement proper facet isolation',
          'Separate AdminFacet recommended for privileged functions'
        ]
      };

      setAnalysis(mockAnalysis);
      setStatus({ isAnalyzing: false, hasError: false });
    } catch (error) {
      setStatus({
        isAnalyzing: false,
        hasError: true,
        errorMessage: error instanceof Error ? error.message : 'Analysis failed'
      });
    }
  };

  const clearError = () => {
    setStatus({ isAnalyzing: false, hasError: false });
  };

  return (
    <div className="app">
      <Header />
      
      <main className="main-content">
        <ContractInput onAnalyze={handleAnalyze} isAnalyzing={status.isAnalyzing} />
        
        {status.hasError && status.errorMessage && (
          <ErrorDisplay message={status.errorMessage} onClear={clearError} />
        )}
        
        {analysis && <AnalysisResults analysis={analysis} />}
      </main>
      
      <footer className="footer">
        <div className="container">
          <p>PayRox Go Beyond - AI-Powered Smart Contract Modularization</p>
        </div>
      </footer>
    </div>
  );
};

export default App;