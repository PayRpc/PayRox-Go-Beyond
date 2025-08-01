import { ethers } from 'ethers';
import React, { useEffect, useState } from 'react';
import { ContractConfig, payRoxContracts, PayRoxContracts } from '../services/PayRoxContracts';

interface ContractFunctionCall {
  contractCategory: 'core' | 'orchestrators' | 'facets';
  contractName: string;
  functionName: string;
  parameters: any[];
  result?: any;
  error?: string;
  loading?: boolean;
}

interface ContractDashboardProps {
  onStatusChange?: (status: { connected: boolean; blockNumber?: number }) => void;
}

interface FunctionInput {
  name: string;
  type: string;
  value: string;
}

export const ContractDashboard: React.FC<ContractDashboardProps> = ({ onStatusChange }) => {
  const [contracts, setContracts] = useState<PayRoxContracts | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<'core' | 'orchestrators' | 'facets'>('core');
  const [selectedContract, setSelectedContract] = useState<string>('');
  const [selectedFunction, setSelectedFunction] = useState<string>('');
  const [functionInputs, setFunctionInputs] = useState<FunctionInput[]>([]);
  const [functionCalls, setFunctionCalls] = useState<ContractFunctionCall[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<{
    connected: boolean;
    blockNumber?: number;
    network?: string;
  }>({ connected: false });

  // Initialize contracts and connection
  useEffect(() => {
    initializeContracts();
  }, []);

  const initializeContracts = async () => {
    try {
      await payRoxContracts.connect();
      const contractsData = payRoxContracts.getContracts();
      setContracts(contractsData);

      // Check connection status
      const network = payRoxContracts.getNetwork();
      const blockNumber = await payRoxContracts['provider']?.getBlockNumber();

      const status = {
        connected: true,
        blockNumber,
        network: network.name
      };

      setConnectionStatus(status);
      onStatusChange?.(status);
    } catch (error) {
      console.error('Failed to initialize contracts:', error);
      setConnectionStatus({ connected: false });
      onStatusChange?.({ connected: false });
    }
  };

  // Get available contracts for selected category
  const getAvailableContracts = (): Array<{ name: string; config: ContractConfig }> => {
    if (!contracts) return [];

    const categoryContracts = contracts[selectedCategory] as any;
    return Object.entries(categoryContracts).map(([name, config]) => ({
      name,
      config: config as ContractConfig
    }));
  };

  // Get available functions for selected contract
  const getAvailableFunctions = (): Array<{ name: string; inputs: any[]; outputs: any[]; stateMutability: string }> => {
    if (!contracts || !selectedContract) return [];

    const categoryContracts = contracts[selectedCategory] as any;
    const contractConfig = categoryContracts[selectedContract];

    if (!contractConfig?.abi) return [];

    return contractConfig.abi
      .filter((item: any) => item.type === 'function')
      .map((func: any) => ({
        name: func.name,
        inputs: func.inputs || [],
        outputs: func.outputs || [],
        stateMutability: func.stateMutability || 'nonpayable'
      }));
  };

  // Handle contract category selection
  const handleCategoryChange = (category: 'core' | 'orchestrators' | 'facets') => {
    setSelectedCategory(category);
    setSelectedContract('');
    setSelectedFunction('');
    setFunctionInputs([]);
  };

  // Handle contract selection
  const handleContractChange = (contractName: string) => {
    setSelectedContract(contractName);
    setSelectedFunction('');
    setFunctionInputs([]);
  };

  // Handle function selection
  const handleFunctionChange = (functionName: string) => {
    setSelectedFunction(functionName);

    const functions = getAvailableFunctions();
    const selectedFunc = functions.find(f => f.name === functionName);

    if (selectedFunc) {
      const inputs = selectedFunc.inputs.map(input => ({
        name: input.name,
        type: input.type,
        value: ''
      }));
      setFunctionInputs(inputs);
    }
  };

  // Update function input values
  const updateFunctionInput = (index: number, value: string) => {
    const newInputs = [...functionInputs];
    newInputs[index].value = value;
    setFunctionInputs(newInputs);
  };

  // Execute contract function
  const executeFunction = async () => {
    if (!contracts || !selectedContract || !selectedFunction) return;

    const categoryContracts = contracts[selectedCategory] as any;
    const contractConfig = categoryContracts[selectedContract];

    if (!contractConfig?.contract) {
      console.error('Contract instance not available');
      return;
    }

    const callData: ContractFunctionCall = {
      contractCategory: selectedCategory,
      contractName: selectedContract,
      functionName: selectedFunction,
      parameters: functionInputs.map(input => {
        // Convert input values based on type
        if (input.type.includes('uint') || input.type.includes('int')) {
          return input.value;
        } else if (input.type === 'address') {
          return input.value;
        } else if (input.type === 'bool') {
          return input.value.toLowerCase() === 'true';
        } else if (input.type === 'bytes32') {
          return input.value.startsWith('0x') ? input.value : ethers.id(input.value);
        }
        return input.value;
      }),
      loading: true
    };

    setFunctionCalls(prev => [callData, ...prev]);

    try {
      const contract = contractConfig.contract;
      const args = callData.parameters;

      let result;
      if (args.length === 0) {
        result = await contract[selectedFunction]();
      } else {
        result = await contract[selectedFunction](...args);
      }

      // Update call with result
      setFunctionCalls(prev => prev.map((call, index) =>
        index === 0 ? { ...call, result: result.toString(), loading: false } : call
      ));

    } catch (error) {
      // Update call with error
      setFunctionCalls(prev => prev.map((call, index) =>
        index === 0 ? {
          ...call,
          error: error instanceof Error ? error.message : 'Unknown error',
          loading: false
        } : call
      ));
    }
  };

  // Health check for all contracts
  const performHealthCheck = async () => {
    if (!contracts) return;

    try {
      const healthResult = await payRoxContracts.healthCheck();
      console.log('Health check result:', healthResult);

      // Update function calls with health check result
      const healthCall: ContractFunctionCall = {
        contractCategory: 'core',
        contractName: 'system',
        functionName: 'healthCheck',
        parameters: [],
        result: JSON.stringify(healthResult, null, 2)
      };

      setFunctionCalls(prev => [healthCall, ...prev]);
    } catch (error) {
      console.error('Health check failed:', error);
    }
  };

  if (!contracts) {
    return (
      <div className="contract-dashboard loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Initializing contracts...</p>
        </div>
      </div>
    );
  }

  const availableContracts = getAvailableContracts();
  const availableFunctions = getAvailableFunctions();
  const selectedFunc = availableFunctions.find(f => f.name === selectedFunction);

  return (
    <div className="contract-dashboard">
      <div className="dashboard-header">
        <h2>Contract Dashboard</h2>
        <div className="connection-info">
          <span className={`status-dot ${connectionStatus.connected ? 'connected' : 'disconnected'}`}></span>
          <span className="status-text">
            {connectionStatus.connected
              ? `Connected to ${connectionStatus.network} (Block: ${connectionStatus.blockNumber})`
              : 'Disconnected'
            }
          </span>
          <button onClick={performHealthCheck} className="btn btn-sm btn-secondary">
            Health Check
          </button>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="contract-selector">
          <div className="selector-group">
            <label>Contract Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => handleCategoryChange(e.target.value as any)}
              className="form-select"
            >
              <option value="core">Core Contracts</option>
              <option value="orchestrators">Orchestrators</option>
              <option value="facets">Facets</option>
            </select>
          </div>

          <div className="selector-group">
            <label>Contract</label>
            <select
              value={selectedContract}
              onChange={(e) => handleContractChange(e.target.value)}
              className="form-select"
              disabled={availableContracts.length === 0}
            >
              <option value="">Select Contract</option>
              {availableContracts.map(({ name, config }) => (
                <option key={name} value={name}>
                  {config.name} ({config.address.slice(0, 8)}...)
                </option>
              ))}
            </select>
          </div>

          <div className="selector-group">
            <label>Function</label>
            <select
              value={selectedFunction}
              onChange={(e) => handleFunctionChange(e.target.value)}
              className="form-select"
              disabled={availableFunctions.length === 0}
            >
              <option value="">Select Function</option>
              {availableFunctions.map((func) => (
                <option key={func.name} value={func.name}>
                  {func.name} ({func.stateMutability})
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedFunc && (
          <div className="function-details">
            <h3>{selectedFunc.name}</h3>
            <div className="function-info">
              <span className={`mutability-badge ${selectedFunc.stateMutability}`}>
                {selectedFunc.stateMutability}
              </span>
              <span className="inputs-count">{selectedFunc.inputs.length} inputs</span>
              <span className="outputs-count">{selectedFunc.outputs.length} outputs</span>
            </div>

            {functionInputs.length > 0 && (
              <div className="function-inputs">
                <h4>Parameters</h4>
                {functionInputs.map((input, index) => (
                  <div key={index} className="input-group">
                    <label>{input.name} ({input.type})</label>
                    <input
                      type="text"
                      value={input.value}
                      onChange={(e) => updateFunctionInput(index, e.target.value)}
                      placeholder={`Enter ${input.type} value`}
                      className="form-input"
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="function-actions">
              <button
                onClick={executeFunction}
                className={`btn btn-primary ${selectedFunc.stateMutability === 'view' ? 'btn-call' : 'btn-send'}`}
                disabled={functionInputs.some(input => input.value === '' && input.name !== '')}
              >
                {selectedFunc.stateMutability === 'view' ? 'Call Function' : 'Send Transaction'}
              </button>
            </div>
          </div>
        )}

        {functionCalls.length > 0 && (
          <div className="function-history">
            <h3>Function Call History</h3>
            <div className="history-list">
              {functionCalls.map((call, index) => (
                <div key={index} className={`history-item ${call.error ? 'error' : 'success'}`}>
                  <div className="call-header">
                    <span className="call-signature">
                      {call.contractCategory}.{call.contractName}.{call.functionName}
                    </span>
                    {call.loading && <span className="loading-indicator">⏳</span>}
                  </div>

                  {call.parameters.length > 0 && (
                    <div className="call-parameters">
                      <strong>Parameters:</strong> [{call.parameters.join(', ')}]
                    </div>
                  )}

                  {call.result && (
                    <div className="call-result">
                      <strong>Result:</strong>
                      <pre>{call.result}</pre>
                    </div>
                  )}

                  {call.error && (
                    <div className="call-error">
                      <strong>Error:</strong> {call.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="contract-overview">
          <h3>Contract Overview</h3>
          <div className="contracts-grid">
            {Object.entries(contracts).map(([category, categoryContracts]) => (
              <div key={category} className="category-card">
                <h4>{category.charAt(0).toUpperCase() + category.slice(1)}</h4>
                <div className="contract-list">
                  {Object.entries(categoryContracts as any).map(([name, config]: [string, any]) => (
                    <div key={name} className="contract-item">
                      <div className="contract-name">{config.name}</div>
                      <div className="contract-address">{config.address}</div>
                      <div className="contract-functions">
                        {config.abi?.filter((item: any) => item.type === 'function').length || 0} functions
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContractDashboard;
