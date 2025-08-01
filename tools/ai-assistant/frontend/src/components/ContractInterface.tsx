import { ethers } from 'ethers';
import React, { useEffect, useState } from 'react';
import './contract-interface.css';

// Import contract configurations and ABIs

interface ContractState {
  name: string;
  address: string;
  connected: boolean;
  functions: ContractFunction[];
}

interface ContractFunction {
  name: string;
  inputs: Array<{ name: string; type: string }>;
  outputs: Array<{ name: string; type: string }>;
  stateMutability: string;
}

interface FunctionCall {
  id: string;
  contractName: string;
  functionName: string;
  parameters: string[];
  result?: string;
  error?: string;
  loading: boolean;
  timestamp: Date;
}

const ContractInterface: React.FC = () => {
  const [provider, setProvider] = useState<ethers.Provider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [connected, setConnected] = useState(false);
  const [networkInfo, setNetworkInfo] = useState<any>(null);
  const [contracts, setContracts] = useState<Record<string, ContractState>>({});
  const [selectedContract, setSelectedContract] = useState<string>('');
  const [selectedFunction, setSelectedFunction] = useState<string>('');
  const [functionInputs, setFunctionInputs] = useState<string[]>([]);
  const [functionCalls, setFunctionCalls] = useState<FunctionCall[]>([]);
  const [loading, setLoading] = useState(true);

  // Contract configurations with their ABIs
  const contractConfigs = {
    'DeterministicChunkFactory': {
      address: deployedContracts.contracts.core.factory.address,
      category: 'Core',
      abi: [
        { name: 'baseFeeWei', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
        { name: 'feeRecipient', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'address' }] },
        { name: 'manifestDispatcher', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'address' }] },
        { name: 'admin', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'address' }] },
        { name: 'deployChunk', type: 'function', stateMutability: 'payable', inputs: [
          { name: 'bytecode', type: 'bytes' },
          { name: 'constructorArgs', type: 'bytes' },
          { name: 'salt', type: 'bytes32' }
        ], outputs: [{ name: '', type: 'address' }] }
      ]
    },
    'ManifestDispatcher': {
      address: deployedContracts.contracts.core.dispatcher.address,
      category: 'Core',
      abi: [
        { name: 'activeRoot', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'bytes32' }] },
        { name: 'admin', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'address' }] },
        { name: 'activationDelay', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
        { name: 'frozen', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'bool' }] },
        { name: 'commitRoot', type: 'function', stateMutability: 'nonpayable', inputs: [
          { name: 'newRoot', type: 'bytes32' },
          { name: 'chunkCount', type: 'uint256' }
        ], outputs: [] }
      ]
    },
    'Orchestrator': {
      address: deployedContracts.contracts.orchestrators.main.address,
      category: 'Orchestrator',
      abi: [
        { name: 'factory', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'address' }] },
        { name: 'dispatcher', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'address' }] },
        { name: 'isValidChunk', type: 'function', stateMutability: 'view', inputs: [
          { name: 'chunkAddress', type: 'address' }
        ], outputs: [{ name: '', type: 'bool' }] }
      ]
    },
    'GovernanceOrchestrator': {
      address: deployedContracts.contracts.orchestrators.governance.address,
      category: 'Orchestrator',
      abi: [
        { name: 'factory', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'address' }] },
        { name: 'getProposalCount', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
        { name: 'createProposal', type: 'function', stateMutability: 'nonpayable', inputs: [
          { name: 'description', type: 'string' }
        ], outputs: [{ name: '', type: 'uint256' }] }
      ]
    },
    'AuditRegistry': {
      address: deployedContracts.contracts.orchestrators.auditRegistry.address,
      category: 'Orchestrator',
      abi: [
        { name: 'getAuditCount', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
        { name: 'isAudited', type: 'function', stateMutability: 'view', inputs: [
          { name: 'contractAddress', type: 'address' }
        ], outputs: [{ name: '', type: 'bool' }] },
        { name: 'addAudit', type: 'function', stateMutability: 'nonpayable', inputs: [
          { name: 'contractAddress', type: 'address' },
          { name: 'auditor', type: 'address' },
          { name: 'report', type: 'string' }
        ], outputs: [] }
      ]
    },
    'PingFacet': {
      address: deployedContracts.contracts.facets.ping.address,
      category: 'Facet',
      abi: [
        { name: 'ping', type: 'function', stateMutability: 'pure', inputs: [], outputs: [{ name: '', type: 'string' }] },
        { name: 'pingWithMessage', type: 'function', stateMutability: 'pure', inputs: [
          { name: 'message', type: 'string' }
        ], outputs: [{ name: '', type: 'string' }] }
      ]
    }
  };

  useEffect(() => {
    initializeConnection();
  }, []);

  const initializeConnection = async () => {
    try {
      setLoading(true);

      // Connect to the network
      const rpcUrl = deployedContracts.network.rpcUrl;
      const jsonProvider = new ethers.JsonRpcProvider(rpcUrl);
      setProvider(jsonProvider);

      // Get network info
      const network = await jsonProvider.getNetwork();
      const blockNumber = await jsonProvider.getBlockNumber();

      setNetworkInfo({
        name: deployedContracts.network.name,
        chainId: network.chainId.toString(),
        blockNumber,
        rpcUrl
      });

      // Initialize contract states
      const contractStates: Record<string, ContractState> = {};
      for (const [name, config] of Object.entries(contractConfigs)) {
        contractStates[name] = {
          name,
          address: config.address,
          connected: true,
          functions: config.abi.filter(item => item.type === 'function').map(func => ({
            name: func.name,
            inputs: func.inputs || [],
            outputs: func.outputs || [],
            stateMutability: func.stateMutability
          }))
        };
      }

      setContracts(contractStates);
      setLoading(false);

      // Try to connect to MetaMask
      await connectWallet();

    } catch (error) {
      console.error('Failed to initialize:', error);
      setLoading(false);
    }
  };

  const connectWallet = async () => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        const browserProvider = new ethers.BrowserProvider((window as any).ethereum);
        const accounts = await (window as any).ethereum.request({ method: 'eth_accounts' });

        if (accounts.length > 0) {
          const walletSigner = await browserProvider.getSigner();
          setSigner(walletSigner);
          setProvider(browserProvider);
          setConnected(true);
        }
      } catch (error) {
        console.warn('Wallet connection failed:', error);
      }
    }
  };

  const requestWalletConnection = async () => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
        await connectWallet();
      } catch (error) {
        console.error('Failed to connect wallet:', error);
      }
    } else {
      alert('MetaMask not found. Please install MetaMask to interact with contracts.');
    }
  };

  const handleContractChange = (contractName: string) => {
    setSelectedContract(contractName);
    setSelectedFunction('');
    setFunctionInputs([]);
  };

  const handleFunctionChange = (functionName: string) => {
    setSelectedFunction(functionName);

    const contract = contracts[selectedContract];
    const func = contract?.functions.find(f => f.name === functionName);

    if (func) {
      setFunctionInputs(new Array(func.inputs.length).fill(''));
    }
  };

  const updateInput = (index: number, value: string) => {
    const newInputs = [...functionInputs];
    newInputs[index] = value;
    setFunctionInputs(newInputs);
  };

  const executeFunction = async () => {
    if (!selectedContract || !selectedFunction || !provider) {
      return;
    }

    const contractConfig = contractConfigs[selectedContract as keyof typeof contractConfigs];
    const contract = contracts[selectedContract];
    const func = contract.functions.find(f => f.name === selectedFunction);

    if (!contractConfig || !func) {
      return;
    }

    const callId = `${Date.now()}-${Math.random()}`;
    const newCall: FunctionCall = {
      id: callId,
      contractName: selectedContract,
      functionName: selectedFunction,
      parameters: [...functionInputs],
      loading: true,
      timestamp: new Date()
    };

    setFunctionCalls(prev => [newCall, ...prev]);

    try {
      const contractInstance = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        signer || provider
      );

      // Prepare arguments
      const args = functionInputs.map((input, index) => {
        const inputType = func.inputs[index]?.type;

        if (inputType?.includes('uint') || inputType?.includes('int')) {
          return input || '0';
        } else if (inputType === 'bool') {
          return input.toLowerCase() === 'true';
        } else if (inputType === 'bytes32') {
          return input.startsWith('0x') ? input : ethers.id(input);
        }
        return input;
      }).filter((_, index) => func.inputs[index]); // Only include args for actual inputs

      let result: any;

      if (func.stateMutability === 'view' || func.stateMutability === 'pure') {
        // Read-only call
        result = await contractInstance[selectedFunction](...args);
      } else {
        // Transaction
        if (!signer) {
          throw new Error('Wallet connection required for transactions');
        }

        const tx = await contractInstance[selectedFunction](...args);
        const receipt = await tx.wait();
        result = `Transaction successful (Hash: ${receipt.hash})`;
      }

      // Format result
      let formattedResult: string;
      if (typeof result === 'bigint') {
        formattedResult = result.toString();
      } else if (typeof result === 'boolean') {
        formattedResult = result.toString();
      } else if (Array.isArray(result)) {
        formattedResult = JSON.stringify(result, null, 2);
      } else {
        formattedResult = result?.toString() || 'Success';
      }

      // Update call with result
      setFunctionCalls(prev => prev.map(call =>
        call.id === callId
          ? { ...call, result: formattedResult, loading: false }
          : call
      ));

    } catch (error) {
      // Update call with error
      setFunctionCalls(prev => prev.map(call =>
        call.id === callId
          ? {
              ...call,
              error: error instanceof Error ? error.message : 'Unknown error',
              loading: false
            }
          : call
      ));
    }
  };

  const clearHistory = () => {
    setFunctionCalls([]);
  };

  if (loading) {
    return (
      <div className="contract-interface loading">
        <div className="loading-content">
          <div className="spinner"></div>
          <p>Initializing contracts...</p>
        </div>
      </div>
    );
  }

  const selectedContractData = contracts[selectedContract];
  const selectedFunctionData = selectedContractData?.functions.find(f => f.name === selectedFunction);
  const contractsByCategory = Object.values(contracts).reduce((acc, contract) => {
    const config = contractConfigs[contract.name as keyof typeof contractConfigs];
    const category = config?.category || 'Other';

    if (!acc[category]) acc[category] = [];
    acc[category].push(contract);
    return acc;
  }, {} as Record<string, ContractState[]>);

  return (
    <div className="contract-interface">
      <div className="interface-header">
        <div className="header-info">
          <h2>Contract Interface</h2>
          <div className="network-info">
            <span className={`status-dot ${connected ? 'connected' : 'disconnected'}`}></span>
            <span>
              {networkInfo ? `${networkInfo.name} (Block: ${networkInfo.blockNumber})` : 'Disconnected'}
            </span>
            {!connected && (
              <button onClick={requestWalletConnection} className="btn btn-sm btn-primary">
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="interface-content">
        <div className="contract-selector-panel">
          <div className="selector-section">
            <label>Select Contract</label>
            <select
              value={selectedContract}
              onChange={(e) => handleContractChange(e.target.value)}
              className="form-select"
            >
              <option value="">Choose a contract...</option>
              {Object.entries(contractsByCategory).map(([category, categoryContracts]) => (
                <optgroup key={category} label={category}>
                  {categoryContracts.map(contract => (
                    <option key={contract.name} value={contract.name}>
                      {contract.name} ({contract.address.slice(0, 8)}...)
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {selectedContractData && (
            <div className="selector-section">
              <label>Select Function</label>
              <select
                value={selectedFunction}
                onChange={(e) => handleFunctionChange(e.target.value)}
                className="form-select"
              >
                <option value="">Choose a function...</option>
                {selectedContractData.functions.map(func => (
                  <option key={func.name} value={func.name}>
                    {func.name} ({func.stateMutability})
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedFunctionData && selectedFunctionData.inputs.length > 0 && (
            <div className="function-inputs">
              <label>Function Parameters</label>
              {selectedFunctionData.inputs.map((input, index) => (
                <div key={index} className="input-row">
                  <span className="input-label">{input.name} ({input.type})</span>
                  <input
                    type="text"
                    value={functionInputs[index] || ''}
                    onChange={(e) => updateInput(index, e.target.value)}
                    placeholder={`Enter ${input.type} value`}
                    className="form-input"
                  />
                </div>
              ))}
            </div>
          )}

          {selectedFunction && (
            <div className="function-actions">
              <button
                onClick={executeFunction}
                className={`btn btn-primary ${
                  selectedFunctionData?.stateMutability === 'view' || selectedFunctionData?.stateMutability === 'pure'
                    ? 'btn-call'
                    : 'btn-send'
                }`}
                disabled={!selectedContract || !selectedFunction}
              >
                {selectedFunctionData?.stateMutability === 'view' || selectedFunctionData?.stateMutability === 'pure'
                  ? '📖 Call Function'
                  : '📝 Send Transaction'
                }
              </button>

              {functionCalls.length > 0 && (
                <button onClick={clearHistory} className="btn btn-secondary">
                  🗑️ Clear History
                </button>
              )}
            </div>
          )}
        </div>

        <div className="results-panel">
          <h3>Function Call History</h3>
          {functionCalls.length === 0 ? (
            <div className="empty-state">
              <p>No function calls yet. Select a contract and function to get started.</p>
            </div>
          ) : (
            <div className="history-list">
              {functionCalls.map(call => (
                <div key={call.id} className={`history-item ${call.error ? 'error' : 'success'}`}>
                  <div className="call-header">
                    <span className="call-signature">
                      {call.contractName}.{call.functionName}
                    </span>
                    <span className="call-time">
                      {call.timestamp.toLocaleTimeString()}
                    </span>
                    {call.loading && <span className="loading-indicator">⏳</span>}
                  </div>

                  {call.parameters.length > 0 && (
                    <div className="call-params">
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
          )}
        </div>

        <div className="contracts-overview">
          <h3>Available Contracts</h3>
          <div className="contracts-grid">
            {Object.entries(contractsByCategory).map(([category, categoryContracts]) => (
              <div key={category} className="category-section">
                <h4>{category}</h4>
                <div className="contract-cards">
                  {categoryContracts.map(contract => (
                    <div key={contract.name} className="contract-card">
                      <div className="contract-header">
                        <span className="contract-name">{contract.name}</span>
                        <span className={`status-indicator ${contract.connected ? 'connected' : 'disconnected'}`}>
                          {contract.connected ? '✅' : '❌'}
                        </span>
                      </div>
                      <div className="contract-address">{contract.address}</div>
                      <div className="contract-functions-count">
                        {contract.functions.length} functions
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

export default ContractInterface;
