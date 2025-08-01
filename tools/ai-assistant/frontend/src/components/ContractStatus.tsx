import React from 'react';

interface ContractInfo {
  address: string;
  name: string;
}

interface ContractStatusProps {
  contracts: {
    core: {
      factory: ContractInfo;
      dispatcher: ContractInfo;
    };
    orchestrators: {
      main: ContractInfo;
      governance: ContractInfo;
      auditRegistry: ContractInfo;
    };
    facets: {
      ping: ContractInfo;
    };
  };
}

const ContractStatus: React.FC<ContractStatusProps> = ({ contracts }) => {
  return (
    <div className="contract-status">
      <h3>🚀 Deployed PayRox Ecosystem</h3>

      <div className="contract-section">
        <h4>Core Infrastructure</h4>
        <div className="contract-grid">
          <div className="contract-item">
            <span className="contract-name">{contracts.core.factory.name}</span>
            <span className="contract-address">{contracts.core.factory.address}</span>
          </div>
          <div className="contract-item">
            <span className="contract-name">{contracts.core.dispatcher.name}</span>
            <span className="contract-address">{contracts.core.dispatcher.address}</span>
          </div>
        </div>
      </div>

      <div className="contract-section">
        <h4>Orchestration Layer</h4>
        <div className="contract-grid">
          <div className="contract-item">
            <span className="contract-name">{contracts.orchestrators.main.name}</span>
            <span className="contract-address">{contracts.orchestrators.main.address}</span>
          </div>
          <div className="contract-item">
            <span className="contract-name">{contracts.orchestrators.governance.name}</span>
            <span className="contract-address">{contracts.orchestrators.governance.address}</span>
          </div>
          <div className="contract-item">
            <span className="contract-name">{contracts.orchestrators.auditRegistry.name}</span>
            <span className="contract-address">{contracts.orchestrators.auditRegistry.address}</span>
          </div>
        </div>
      </div>

      <div className="contract-section">
        <h4>Example Facets</h4>
        <div className="contract-grid">
          <div className="contract-item">
            <span className="contract-name">{contracts.facets.ping.name}</span>
            <span className="contract-address">{contracts.facets.ping.address}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContractStatus;
