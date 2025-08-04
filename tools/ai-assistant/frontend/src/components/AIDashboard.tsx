import React, { useState, useEffect } from 'react';
import AIAnalysis from './AIAnalysis';
import { payRoxService, AnalysisResult, ContractInfo } from '../services/PayRoxContracts';
import '../styles/ai-dashboard.css';

interface SystemStatus {
  connected: boolean;
  networkInfo?: {
    name: string;
    chainId: string;
    blockNumber: number;
    rpcUrl: string;
  };
  contractsLoaded: number;
  aiBackendStatus: 'online' | 'offline';
}

interface ActiveAnalysis {
  id: string;
  contractName: string;
  timestamp: Date;
  result: AnalysisResult;
}

const AIDashboard: React.FC = () => {
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    connected: false,
    contractsLoaded: 0,
    aiBackendStatus: 'offline'
  });
  const [contracts, setContracts] = useState<ContractInfo[]>([]);
  const [activeAnalyses, setActiveAnalyses] = useState<ActiveAnalysis[]>([]);
  const [selectedTab, setSelectedTab] = useState<'analysis' | 'contracts' | 'history'>('analysis');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string>('');

  useEffect(() => {
    initializeSystem();
    const interval = setInterval(updateSystemStatus, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const initializeSystem = async () => {
    try {
      await updateSystemStatus();
      await loadContracts();
    } catch (error) {
      console.error('Failed to initialize system:', error);
    }
  };

  const updateSystemStatus = async () => {
    try {
      const status = await payRoxService.getSystemStatus();
      setSystemStatus(status);
    } catch (error) {
      console.error('Failed to update system status:', error);
    }
  };

  const loadContracts = async () => {
    try {
      const contractList = payRoxService.getContracts();
      setContracts(contractList);
    } catch (error) {
      console.error('Failed to load contracts:', error);
    }
  };

  const connectToNetwork = async () => {
    setIsConnecting(true);
    setConnectionError('');
    
    try {
      await payRoxService.connectToNetwork();
      await updateSystemStatus();
      await loadContracts();
    } catch (error) {
      setConnectionError(`Failed to connect: ${error}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleAnalysisComplete = (result: AnalysisResult) => {
    const analysis: ActiveAnalysis = {
      id: Date.now().toString(),
      contractName: result.contractName,
      timestamp: new Date(),
      result
    };
    
    setActiveAnalyses(prev => [analysis, ...prev.slice(0, 9)]); // Keep last 10 analyses
  };

  const renderSystemStatus = () => (
    <div className="system-status">
      <div className="status-header">
        <h3>🚀 PayRox AI System Status</h3>
        <button 
          onClick={updateSystemStatus}
          className="refresh-button"
          title="Refresh Status"
        >
          🔄
        </button>
      </div>
      
      <div className="status-grid">
        <div className="status-item">
          <div className="status-label">Network Connection</div>
          <div className={`status-value ${systemStatus.connected ? 'connected' : 'disconnected'}`}>
            {systemStatus.connected ? '✅ Connected' : '❌ Disconnected'}
          </div>
          {!systemStatus.connected && (
            <button 
              onClick={connectToNetwork}
              disabled={isConnecting}
              className="connect-button"
            >
              {isConnecting ? 'Connecting...' : 'Connect'}
            </button>
          )}
        </div>

        <div className="status-item">
          <div className="status-label">AI Backend</div>
          <div className={`status-value ${systemStatus.aiBackendStatus === 'online' ? 'online' : 'offline'}`}>
            {systemStatus.aiBackendStatus === 'online' ? '🟢 Online' : '🔴 Offline'}
          </div>
        </div>

        <div className="status-item">
          <div className="status-label">Contracts Loaded</div>
          <div className="status-value contracts">
            📋 {systemStatus.contractsLoaded} contracts
          </div>
        </div>

        {systemStatus.networkInfo && (
          <div className="status-item">
            <div className="status-label">Network Info</div>
            <div className="status-value network-info">
              <div>Chain: {systemStatus.networkInfo.chainId}</div>
              <div>Block: #{systemStatus.networkInfo.blockNumber}</div>
            </div>
          </div>
        )}
      </div>

      {connectionError && (
        <div className="connection-error">
          ❌ {connectionError}
        </div>
      )}
    </div>
  );

  const renderContractsList = () => (
    <div className="contracts-list">
      <h3>📋 Available Contracts</h3>
      <div className="contracts-grid">
        {contracts.map((contract, index) => (
          <div key={index} className="contract-card">
            <div className="contract-header">
              <h4>{contract.name}</h4>
              <span className={`category category-${contract.category.toLowerCase()}`}>
                {contract.category}
              </span>
            </div>
            <div className="contract-address">
              <strong>Address:</strong>
              <code>{contract.address}</code>
            </div>
            <div className="contract-functions">
              <strong>Functions:</strong> {contract.abi.filter((item: any) => item.type === 'function').length}
            </div>
            <div className="contract-status">
              {contract.instance ? '✅ Initialized' : '⚠️ Not Initialized'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderAnalysisHistory = () => (
    <div className="analysis-history">
      <h3>📊 Analysis History</h3>
      {activeAnalyses.length === 0 ? (
        <div className="no-analyses">
          <p>No analyses performed yet. Use the AI Analysis tab to analyze your contracts.</p>
        </div>
      ) : (
        <div className="analyses-list">
          {activeAnalyses.map((analysis) => (
            <div key={analysis.id} className="analysis-item">
              <div className="analysis-header">
                <h4>{analysis.contractName}</h4>
                <span className="timestamp">
                  {analysis.timestamp.toLocaleString()}
                </span>
              </div>
              <div className="analysis-summary">
                {analysis.result.results.security && (
                  <div className="summary-item">
                    <span className="label">Security:</span>
                    <span className="value">{analysis.result.results.security.score}/100</span>
                  </div>
                )}
                {analysis.result.results.gas && (
                  <div className="summary-item">
                    <span className="label">Gas Savings:</span>
                    <span className="value">{analysis.result.results.gas.totalSavings}</span>
                  </div>
                )}
                {analysis.result.results.facets && (
                  <div className="summary-item">
                    <span className="label">Facets:</span>
                    <span className="value">{analysis.result.results.facets.suggested.length}</span>
                  </div>
                )}
              </div>
              <div className="analysis-type">
                Type: {analysis.result.analysisType}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="ai-dashboard">
      <div className="dashboard-header">
        <h1>PayRox AI Assistant Dashboard</h1>
        <p>AI-powered smart contract analysis and deployment platform</p>
      </div>

      {renderSystemStatus()}

      <div className="dashboard-content">
        <div className="tab-navigation">
          <button 
            className={`tab-button ${selectedTab === 'analysis' ? 'active' : ''}`}
            onClick={() => setSelectedTab('analysis')}
          >
            🤖 AI Analysis
          </button>
          <button 
            className={`tab-button ${selectedTab === 'contracts' ? 'active' : ''}`}
            onClick={() => setSelectedTab('contracts')}
          >
            📋 Contracts
          </button>
          <button 
            className={`tab-button ${selectedTab === 'history' ? 'active' : ''}`}
            onClick={() => setSelectedTab('history')}
          >
            📊 History
          </button>
        </div>

        <div className="tab-content">
          {selectedTab === 'analysis' && (
            <AIAnalysis onAnalysisComplete={handleAnalysisComplete} />
          )}
          {selectedTab === 'contracts' && renderContractsList()}
          {selectedTab === 'history' && renderAnalysisHistory()}
        </div>
      </div>
    </div>
  );
};

export default AIDashboard;
