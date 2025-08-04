import React, { useState } from 'react';

const AIAnalysis: React.FC = () => {
  const [contractCode, setContractCode] = useState('');
  const [contractName, setContractName] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = () => {
    if (!contractCode.trim() || !contractName.trim()) {
      alert('Please provide both contract name and code');
      return;
    }
    
    setIsAnalyzing(true);
    
    // Simulate analysis
    setTimeout(() => {
      setIsAnalyzing(false);
      alert('Analysis complete! (This is a demo)');
    }, 2000);
  };

  const loadSample = () => {
    setContractName('SampleContract');
    setContractCode(`// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SampleContract {
    address public owner;
    mapping(address => uint256) public balances;
    
    constructor() {
        owner = msg.sender;
    }
    
    function mint(address to, uint256 amount) external {
        require(msg.sender == owner, "Not owner");
        balances[to] += amount;
    }
    
    function transfer(address to, uint256 amount) external {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        balances[msg.sender] -= amount;
        balances[to] += amount;
    }
}`);
  };

  return (
    <div style={{ padding: '20px', color: 'white' }}>
      <h2 style={{ color: '#ffd700', marginBottom: '20px' }}>🤖 AI Contract Analysis</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px' }}>Contract Name:</label>
        <input
          type="text"
          value={contractName}
          onChange={(e) => setContractName(e.target.value)}
          placeholder="Enter contract name..."
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: '6px',
            border: '1px solid rgba(255,255,255,0.3)',
            background: 'rgba(255,255,255,0.1)',
            color: 'white',
            marginBottom: '15px'
          }}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px' }}>Contract Code:</label>
        <textarea
          value={contractCode}
          onChange={(e) => setContractCode(e.target.value)}
          placeholder="Paste your Solidity contract code here..."
          rows={12}
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: '6px',
            border: '1px solid rgba(255,255,255,0.3)',
            background: 'rgba(255,255,255,0.1)',
            color: 'white',
            fontFamily: 'monospace',
            resize: 'vertical'
          }}
        />
      </div>

      <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
        <button
          onClick={loadSample}
          disabled={isAnalyzing}
          style={{
            padding: '12px 24px',
            borderRadius: '6px',
            border: 'none',
            background: 'rgba(255,255,255,0.2)',
            color: 'white',
            cursor: isAnalyzing ? 'not-allowed' : 'pointer',
            opacity: isAnalyzing ? 0.5 : 1
          }}
        >
          Load Sample
        </button>
        
        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing || !contractCode.trim() || !contractName.trim()}
          style={{
            padding: '12px 24px',
            borderRadius: '6px',
            border: 'none',
            background: isAnalyzing ? '#666' : 'linear-gradient(45deg, #ff6b6b, #ee5a24)',
            color: 'white',
            cursor: isAnalyzing || !contractCode.trim() || !contractName.trim() ? 'not-allowed' : 'pointer',
            opacity: isAnalyzing || !contractCode.trim() || !contractName.trim() ? 0.5 : 1
          }}
        >
          {isAnalyzing ? 'Analyzing...' : 'Analyze Contract'}
        </button>
      </div>

      {isAnalyzing && (
        <div style={{
          padding: '20px',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid rgba(255,255,255,0.3)',
            borderTop: '4px solid #ffd700',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 15px'
          }}></div>
          <p>Analyzing contract with PayRox AI...</p>
        </div>
      )}

      <div style={{
        marginTop: '30px',
        padding: '20px',
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '8px'
      }}>
        <h3 style={{ color: '#ffd700', marginBottom: '15px' }}>🚀 PayRox AI Features</h3>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          <li style={{ marginBottom: '8px' }}>✅ Smart Contract Security Analysis</li>
          <li style={{ marginBottom: '8px' }}>⚡ Gas Optimization Recommendations</li>
          <li style={{ marginBottom: '8px' }}>💎 Diamond Pattern Facet Suggestions</li>
          <li style={{ marginBottom: '8px' }}>🏗️ DeterministicChunkFactory Integration</li>
          <li style={{ marginBottom: '8px' }}>🔐 Hash Verification System</li>
          <li style={{ marginBottom: '8px' }}>🌐 Cross-Chain Deployment Support</li>
        </ul>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default AIAnalysis;
