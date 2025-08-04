import React, { useState, useEffect } from 'react';
import AIAnalysisSimple from './components/AIAnalysisSimple';
import { payRoxService } from './services/PayRoxContracts';
import './styles/components.css';
import './styles/globals.css';

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

const App: React.FC = () => {
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    connected: false,
    contractsLoaded: 0,
    aiBackendStatus: 'offline'
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'analysis' | 'contracts' | 'dashboard'>('analysis');

  useEffect(() => {
    initializeSystem();
  }, []);

  const initializeSystem = async () => {
    try {
      setLoading(true);
      
      // Connect to network
      await payRoxService.connectToNetwork();
      
      // Get system status
      const status = await payRoxService.getSystemStatus();
      setSystemStatus(status);
      
    } catch (error) {
      console.error('Failed to initialize system:', error);
    } finally {
      setLoading(false);
    }
  };

  const connectWallet = async () => {
    try {
      await payRoxService.connectWallet();
      const status = await payRoxService.getSystemStatus();
      setSystemStatus(status);
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      alert('Failed to connect wallet. Make sure MetaMask is installed.');
    }
  };

  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <h2>🚀 PayRox Go Beyond</h2>
          <p>Initializing AI Assistant...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="header-container">
          <div className="header-brand">
            <h1>🚀 PayRox Go Beyond</h1>
            <p>AI-Powered Smart Contract Platform</p>
          </div>
          
          <div className="header-status">
            <div className="status-grid">
              <div className={`status-item ${systemStatus.connected ? 'connected' : 'disconnected'}`}>
                <span className="status-indicator"></span>
                <span className="status-text">
                  {systemStatus.connected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              
              <div className={`status-item ${systemStatus.aiBackendStatus === 'online' ? 'online' : 'offline'}`}>
                <span className="status-indicator"></span>
                <span className="status-text">
                  AI Backend: {systemStatus.aiBackendStatus}
                </span>
              </div>
              
              <div className="status-item">
                <span className="status-text">
                  Contracts: {systemStatus.contractsLoaded}
                </span>
              </div>
              
              {systemStatus.networkInfo && (
                <div className="status-item">
                  <span className="status-text">
                    Block: #{systemStatus.networkInfo.blockNumber}
                  </span>
                </div>
              )}
            </div>
            
            <button 
              className="connect-wallet-btn"
              onClick={connectWallet}
            >
              🦊 Connect Wallet
            </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="app-nav">
        <div className="nav-container">
          <button 
            className={`nav-tab ${activeTab === 'analysis' ? 'active' : ''}`}
            onClick={() => setActiveTab('analysis')}
          >
            🤖 AI Analysis
          </button>
          <button 
            className={`nav-tab ${activeTab === 'contracts' ? 'active' : ''}`}
            onClick={() => setActiveTab('contracts')}
          >
            📋 Contracts
          </button>
          <button 
            className={`nav-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            📊 Dashboard
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="app-main">
        <div className="main-container">
          {activeTab === 'analysis' && (
            <div className="tab-content">
              <AIAnalysisSimple />
            </div>
          )}
          
          {activeTab === 'contracts' && (
            <div className="tab-content">
              <div className="contracts-view">
                <h2>📋 PayRox Contracts</h2>
                <p>Contract interaction interface coming soon...</p>
                <div className="contracts-grid">
                  {payRoxService.getContracts().map((contract, index) => (
                    <div key={index} className="contract-card">
                      <div className="contract-header">
                        <h3>{contract.name}</h3>
                        <span className={`category category-${contract.category.toLowerCase()}`}>
                          {contract.category}
                        </span>
                      </div>
                      <div className="contract-details">
                        <p className="contract-address">
                          <strong>Address:</strong>
                          <code>{contract.address}</code>
                        </p>
                        <p className="contract-functions">
                          <strong>Functions:</strong> {contract.abi.filter(item => item.type === 'function').length}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'dashboard' && (
            <div className="tab-content">
              <div className="dashboard-view">
                <h2>📊 System Dashboard</h2>
                <div className="dashboard-grid">
                  <div className="dashboard-card">
                    <h3>🌐 Network Status</h3>
                    {systemStatus.networkInfo ? (
                      <div className="network-info">
                        <p><strong>Network:</strong> {systemStatus.networkInfo.name}</p>
                        <p><strong>Chain ID:</strong> {systemStatus.networkInfo.chainId}</p>
                        <p><strong>Block Number:</strong> #{systemStatus.networkInfo.blockNumber}</p>
                        <p><strong>RPC URL:</strong> {systemStatus.networkInfo.rpcUrl}</p>
                      </div>
                    ) : (
                      <p>No network information available</p>
                    )}
                  </div>
                  
                  <div className="dashboard-card">
                    <h3>🤖 AI Backend Status</h3>
                    <div className={`ai-status ${systemStatus.aiBackendStatus}`}>
                      <div className="status-indicator"></div>
                      <span>{systemStatus.aiBackendStatus === 'online' ? 'AI Backend Online' : 'AI Backend Offline (Using Mock)'}</span>
                    </div>
                  </div>
                  
                  <div className="dashboard-card">
                    <h3>📋 Contracts Loaded</h3>
                    <div className="contract-count">
                      <span className="count">{systemStatus.contractsLoaded}</span>
                      <span className="label">PayRox Contracts</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <div className="footer-container">
          <p>© 2025 PayRox Go Beyond - AI-Powered Smart Contract Platform</p>
          <div className="footer-links">
            <span>🔗 CLI Integration Available</span>
            <span>🛡️ Security First</span>
            <span>💎 Diamond Pattern Support</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
