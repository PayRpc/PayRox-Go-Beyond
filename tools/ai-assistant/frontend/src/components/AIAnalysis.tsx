import React, { useState } from 'react';
import { payRoxService, AnalysisResult, AnalysisRequest } from '../services/PayRoxContracts';
import '../styles/ai-analysis.css';

interface AIAnalysisProps {
  onAnalysisComplete?: (result: AnalysisResult) => void;
}

interface AnalysisProgress {
  stage: string;
  progress: number;
  message: string;
}

const AIAnalysis: React.FC<AIAnalysisProps> = ({ onAnalysisComplete }) => {
  const [contractCode, setContractCode] = useState('');
  const [contractName, setContractName] = useState('');
  const [analysisType, setAnalysisType] = useState<'full' | 'security' | 'gas' | 'facets'>('full');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState<AnalysisProgress>({
    stage: '',
    progress: 0,
    message: ''
  });
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string>('');

  const sampleContract = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title PayRox Sample Contract
 * @dev Example contract for AI analysis and facet splitting
 */
contract PayRoxSample {
    address public owner;
    mapping(address => uint256) public balances;
    mapping(address => mapping(address => uint256)) public allowances;
    uint256 public totalSupply;
    string public name;
    string public symbol;
    bool public paused;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Mint(address indexed to, uint256 value);
    event Burn(address indexed from, uint256 value);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }

    constructor(string memory _name, string memory _symbol) {
        owner = msg.sender;
        name = _name;
        symbol = _symbol;
        totalSupply = 1000000 * 10**18;
        balances[msg.sender] = totalSupply;
    }

    // Core functions - good candidates for CoreFacet
    function transfer(address to, uint256 amount) external whenNotPaused returns (bool) {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        balances[msg.sender] -= amount;
        balances[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external whenNotPaused returns (bool) {
        allowances[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external whenNotPaused returns (bool) {
        require(allowances[from][msg.sender] >= amount, "Insufficient allowance");
        require(balances[from] >= amount, "Insufficient balance");
        
        allowances[from][msg.sender] -= amount;
        balances[from] -= amount;
        balances[to] += amount;
        
        emit Transfer(from, to, amount);
        return true;
    }

    // View functions - good candidates for ViewFacet
    function balanceOf(address account) external view returns (uint256) {
        return balances[account];
    }

    function allowance(address owner_, address spender) external view returns (uint256) {
        return allowances[owner_][spender];
    }

    // Admin functions - good candidates for AdminFacet
    function mint(address to, uint256 amount) external onlyOwner {
        totalSupply += amount;
        balances[to] += amount;
        emit Mint(to, amount);
        emit Transfer(address(0), to, amount);
    }

    function burn(uint256 amount) external {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        balances[msg.sender] -= amount;
        totalSupply -= amount;
        emit Burn(msg.sender, amount);
        emit Transfer(msg.sender, address(0), amount);
    }

    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner");
        owner = newOwner;
    }

    // Complex function that might need optimization
    function complexOperation(uint256[] calldata values) external view returns (uint256) {
        uint256 result = 0;
        for (uint256 i = 0; i < values.length; i++) {
            result += values[i] * i;
        }
        return result;
    }
}`;

  const loadSampleContract = () => {
    setContractName('PayRoxSample');
    setContractCode(sampleContract);
  };

  const simulateAnalysisProgress = () => {
    const stages = [
      { stage: 'parsing', progress: 10, message: 'Parsing contract code...' },
      { stage: 'ast_analysis', progress: 25, message: 'Analyzing contract structure...' },
      { stage: 'security_scan', progress: 40, message: 'Running security analysis...' },
      { stage: 'gas_optimization', progress: 60, message: 'Analyzing gas optimization opportunities...' },
      { stage: 'facet_analysis', progress: 75, message: 'Determining optimal facet architecture...' },
      { stage: 'payrox_integration', progress: 90, message: 'Checking PayRox integration compatibility...' },
      { stage: 'complete', progress: 100, message: 'Analysis complete!' }
    ];

    let currentStage = 0;
    const interval = setInterval(() => {
      if (currentStage < stages.length) {
        setAnalysisProgress(stages[currentStage]);
        currentStage++;
      } else {
        clearInterval(interval);
      }
    }, 800);

    return interval;
  };

  const performAnalysis = async () => {
    if (!contractCode.trim() || !contractName.trim()) {
      setError('Please provide both contract name and code');
      return;
    }

    setIsAnalyzing(true);
    setError('');
    setAnalysisResult(null);

    const progressInterval = simulateAnalysisProgress();

    try {
      const request: AnalysisRequest = {
        contractCode,
        contractName,
        analysisType
      };

      const result = await payRoxService.analyzeContract(request);
      
      clearInterval(progressInterval);
      setAnalysisResult(result);
      onAnalysisComplete?.(result);
    } catch (err) {
      clearInterval(progressInterval);
      setError(`Analysis failed: ${err}`);
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress({ stage: '', progress: 0, message: '' });
    }
  };

  const renderSecurityResults = (security: any) => (
    <div className="analysis-section">
      <h4>🛡️ Security Analysis</h4>
      <div className="security-score">
        <span className="score">Security Score: {security.score}/100</span>
        <div className="score-bar">
          <div 
            className="score-fill" 
            style={{ width: `${security.score}%` }}
          ></div>
        </div>
      </div>
      <div className="security-issues">
        <h5>Issues Found:</h5>
        {security.issues.map((issue: any, index: number) => (
          <div key={index} className={`issue issue-${issue.severity}`}>
            <div className="issue-header">
              <span className="severity">{issue.severity.toUpperCase()}</span>
              <span className="title">{issue.title}</span>
            </div>
            <p className="description">{issue.description}</p>
            {issue.location && <span className="location">{issue.location}</span>}
          </div>
        ))}
      </div>
    </div>
  );

  const renderGasResults = (gas: any) => (
    <div className="analysis-section">
      <h4>⚡ Gas Optimization</h4>
      <div className="gas-savings">
        <span className="total-savings">Total Estimated Savings: {gas.totalSavings}</span>
      </div>
      <div className="optimizations">
        <h5>Optimization Opportunities:</h5>
        {gas.optimizations.map((opt: any, index: number) => (
          <div key={index} className="optimization">
            <div className="opt-header">
              <span className="type">{opt.type}</span>
              <span className="savings">{opt.estimatedSavings}</span>
            </div>
            <p className="description">{opt.description}</p>
          </div>
        ))}
      </div>
    </div>
  );

  const renderFacetResults = (facets: any) => (
    <div className="analysis-section">
      <h4>💎 Facet Architecture</h4>
      <div className="compatibility-status">
        <div className={`status ${facets.compatibility.deterministicFactory ? 'compatible' : 'incompatible'}`}>
          <span>DeterministicFactory: {facets.compatibility.deterministicFactory ? '✅' : '❌'}</span>
        </div>
        <div className={`status ${facets.compatibility.manifestDispatcher ? 'compatible' : 'incompatible'}`}>
          <span>ManifestDispatcher: {facets.compatibility.manifestDispatcher ? '✅' : '❌'}</span>
        </div>
      </div>
      <div className="suggested-facets">
        <h5>Suggested Facets:</h5>
        {facets.suggested.map((facet: any, index: number) => (
          <div key={index} className="facet">
            <div className="facet-header">
              <span className="name">{facet.name}</span>
              <span className={`strategy strategy-${facet.strategy}`}>{facet.strategy}</span>
            </div>
            <div className="functions">
              <strong>Functions:</strong> {facet.functions.join(', ')}
            </div>
            {facet.estimatedAddress && (
              <div className="address">
                <strong>Estimated Address:</strong> 
                <code>{facet.estimatedAddress}</code>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderPayRoxResults = (payRox: any) => (
    <div className="analysis-section">
      <h4>🚀 PayRox Integration</h4>
      <div className="payrox-status">
        <div className={`status ${payRox.factoryCompatible ? 'compatible' : 'incompatible'}`}>
          Factory Compatible: {payRox.factoryCompatible ? '✅' : '❌'}
        </div>
        <p className="recommendation">{payRox.recommendation}</p>
      </div>
      <div className="predicted-addresses">
        <h5>Predicted Deployment Addresses:</h5>
        {payRox.predictedAddresses.map((addr: any, index: number) => (
          <div key={index} className="predicted-address">
            <span className="facet-name">{addr.facetName}:</span>
            <code className="address">{addr.address}</code>
            <span className={`strategy strategy-${addr.strategy}`}>({addr.strategy})</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="ai-analysis">
      <div className="analysis-header">
        <h3>🤖 AI-Powered Contract Analysis</h3>
        <p>Analyze your smart contracts with PayRox AI for security, gas optimization, and facet architecture.</p>
      </div>

      <div className="input-section">
        <div className="contract-input">
          <div className="input-row">
            <div className="input-group">
              <label htmlFor="contractName">Contract Name:</label>
              <input
                id="contractName"
                type="text"
                value={contractName}
                onChange={(e) => setContractName(e.target.value)}
                placeholder="Enter contract name..."
                disabled={isAnalyzing}
              />
            </div>
            <div className="input-group">
              <label htmlFor="analysisType">Analysis Type:</label>
              <select
                id="analysisType"
                value={analysisType}
                onChange={(e) => setAnalysisType(e.target.value as any)}
                disabled={isAnalyzing}
              >
                <option value="full">Full Analysis</option>
                <option value="security">Security Only</option>
                <option value="gas">Gas Optimization</option>
                <option value="facets">Facet Architecture</option>
              </select>
            </div>
          </div>
          
          <div className="input-group">
            <label htmlFor="contractCode">Contract Code:</label>
            <textarea
              id="contractCode"
              value={contractCode}
              onChange={(e) => setContractCode(e.target.value)}
              placeholder="Paste your Solidity contract code here..."
              rows={15}
              disabled={isAnalyzing}
            />
          </div>

          <div className="button-row">
            <button
              type="button"
              onClick={loadSampleContract}
              className="sample-button"
              disabled={isAnalyzing}
            >
              Load Sample Contract
            </button>
            <button
              type="button"
              onClick={performAnalysis}
              className="analyze-button"
              disabled={isAnalyzing || !contractCode.trim() || !contractName.trim()}
            >
              {isAnalyzing ? 'Analyzing...' : 'Analyze Contract'}
            </button>
          </div>
        </div>
      </div>

      {isAnalyzing && (
        <div className="progress-section">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${analysisProgress.progress}%` }}
            ></div>
          </div>
          <div className="progress-info">
            <span className="stage">{analysisProgress.stage}</span>
            <span className="message">{analysisProgress.message}</span>
            <span className="percentage">{analysisProgress.progress}%</span>
          </div>
        </div>
      )}

      {error && (
        <div className="error-section">
          <span className="error-message">❌ {error}</span>
        </div>
      )}

      {analysisResult && (
        <div className="results-section">
          <div className="results-header">
            <h3>Analysis Results for {analysisResult.contractName}</h3>
            <span className="timestamp">
              {new Date(analysisResult.timestamp).toLocaleString()}
            </span>
          </div>

          {analysisResult.results.security && renderSecurityResults(analysisResult.results.security)}
          {analysisResult.results.gas && renderGasResults(analysisResult.results.gas)}
          {analysisResult.results.facets && renderFacetResults(analysisResult.results.facets)}
          {analysisResult.results.payRoxIntegration && renderPayRoxResults(analysisResult.results.payRoxIntegration)}
        </div>
      )}
    </div>
  );
};

export default AIAnalysis;
