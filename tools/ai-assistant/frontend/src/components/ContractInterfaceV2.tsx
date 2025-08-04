import { ethers } from 'ethers';
import React, { useEffect, useState } from 'react';
import './contract-interface.css';

// Import contract configurations and ABIs
import contractABIs from '../contracts/abis.json';
import contractConfig from '../contracts/config.json';

interface ContractState {
  name: string;
  address: string;
  category: string;
  connected: boolean;
  functions: ContractFunction[];
  abi: any[];
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
  transactionHash?: string;
  gasUsed?: string;
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

  // Define contract categories for better organization
  const categoryMapping: Record<string, string> = {
    'DeterministicChunkFactory': 'Core',
    'ManifestDispatcher': 'Core',
    'Orchestrator': 'Orchestrator',
    'GovernanceOrchestrator': 'Orchestrator',
    'AuditRegistry': 'Orchestrator',
    'PingFacet': 'Facet',
    'ExampleFacetA': 'Facet',
    'ExampleFacetB': 'Facet'
  };

  useEffect(() => {
    initializeConnection();
  }, []);

  const initializeConnection = async () => {
    try {
      setLoading(true);

      // Connect to the network (localhost in this case)
      const rpcUrl = 'http://localhost:8545';
      const jsonProvider = new ethers.JsonRpcProvider(rpcUrl);
      setProvider(jsonProvider);

      // Get network info
      const network = await jsonProvider.getNetwork();
      const blockNumber = await jsonProvider.getBlockNumber();

      setNetworkInfo({
        name: 'localhost',
        chainId: network.chainId.toString(),
        blockNumber,
        rpcUrl
      });

      // Initialize contract states from generated config and ABIs
      const contractStates: Record<string, ContractState> = {};

      for (const [key, config] of Object.entries(contractConfig.contracts)) {
        const contractName = (config as any).name;
        const abi = (contractABIs as any)[contractName]?.abi || [];

        const functions = abi
          .filter((item: any) => item.type === 'function')
          .map((func: any) => ({
            name: func.name,
            inputs: func.inputs || [],
            outputs: func.outputs || [],
            stateMutability: func.stateMutability || 'nonpayable'
          }));

        contractStates[contractName] = {
          name: contractName,
          address: (config as any).address,
          category: categoryMapping[contractName] || 'Other',
          connected: true,
          functions,
          abi
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
    const func = contract?.functions.find((f: any) => f.name === functionName);

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

    const contractState = contracts[selectedContract];
    const func = contractState.functions.find((f: any) => f.name === selectedFunction);

    if (!contractState || !func) {
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

    setFunctionCalls((prev: any) => [newCall, ...prev]);

    try {
      const contractInstance = new ethers.Contract(
        contractState.address,
        contractState.abi,
        signer || provider
      );

      // Prepare arguments with proper type conversion
      const args = functionInputs.map((input, index) => {
        const inputType = func.inputs[index]?.type;

        if (!input.trim()) {
          if (inputType?.includes('uint') || inputType?.includes('int')) {
            return '0';
          } else if (inputType === 'bool') {
            return false;
          } else if (inputType === 'address') {
            return ethers.ZeroAddress;
          } else if (inputType === 'bytes32') {
            return ethers.ZeroHash;
          }
          return '';
        }

        if (inputType?.includes('uint') || inputType?.includes('int')) {
          return ethers.parseUnits(input, 0); // Parse as integer
        } else if (inputType === 'bool') {
          return input.toLowerCase() === 'true';
        } else if (inputType === 'bytes32') {
          return input.startsWith('0x') ? input : ethers.id(input);
        } else if (inputType === 'address') {
          return ethers.getAddress(input);
        }
        return input;
      }).filter((_, index) => func.inputs[index]); // Only include args for actual inputs

      let result: any;
      let transactionHash: string | undefined;
      let gasUsed: string | undefined;

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

        transactionHash = receipt.hash;
        gasUsed = receipt.gasUsed.toString();
        result = `Transaction successful`;
      }

      // Format result for display
      let formattedResult: string;
      if (typeof result === 'bigint') {
        formattedResult = result.toString();
      } else if (typeof result === 'boolean') {
        formattedResult = result.toString();
      } else if (Array.isArray(result)) {
        formattedResult = JSON.stringify(result, (key, value) =>
          typeof value === 'bigint' ? value.toString() : value, 2
        );
      } else if (typeof result === 'object' && result !== null) {
        formattedResult = JSON.stringify(result, (key, value) =>
          typeof value === 'bigint' ? value.toString() : value, 2
        );
      } else {
        formattedResult = result?.toString() || 'Success';
      }

      // Update call with result
      setFunctionCalls((prev: any) => prev.map((call: any) =>
        call.id === callId
          ? {
              ...call,
              result: formattedResult,
              loading: false,
              transactionHash,
              gasUsed
            }
          : call
      ));

    } catch (error: any) {
      // Update call with error
      setFunctionCalls((prev: any) => prev.map((call: any) =>
        call.id === callId
          ? {
              ...call,
              error: error?.message || 'Unknown error',
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
  const selectedFunctionData = selectedContractData?.functions.find((f: any) => f.name === selectedFunction);
  const contractsByCategory = Object.values(contracts).reduce((acc, contract) => {
    const category = contract.category;

    if (!acc[category]) acc[category] = [];
    acc[category].push(contract);
    return acc;
  }, {} as Record<string, ContractState[]>);

  return (
    <div className="contract-interface">
      <div className="card">
        <div className="header-info">
          <h2>🔧 Smart Contract Interface</h2>
          <div className="network-info">
            <span className={`status-dot ${connected ? 'connected' : 'disconnected'}`}></span>
            <span>
              {networkInfo ? `${networkInfo.name} (Block: ${networkInfo.blockNumber})` : 'Disconnected'}
            </span>
            {!connected && (
              <button onClick={requestWalletConnection} className="btn btn-sm btn-primary">
                🔗 Connect Wallet
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="interface-content">
        <div className="card">
          <div className="form-group">
            <label>📋 Select Contract</label>
            <select
              value={selectedContract}
              onChange={(e) => handleContractChange(e.target.value)}
              className="form-select"
              title="Select a smart contract to interact with"
            >
              <option value="">Choose a contract...</option>
              {Object.entries(contractsByCategory).map(([category, categoryContracts]) => (
                <optgroup key={category} label={`${category} Contracts`}>
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
            <div className="form-group">
              <label>⚡ Select Function</label>
              <select
                value={selectedFunction}
                onChange={(e) => handleFunctionChange(e.target.value)}
                className="form-select"
                title="Select a function to call"
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
        </div>

        {selectedFunctionData && selectedFunctionData.inputs.length > 0 && (
          <div className="card">
            <div className="function-inputs">
              <label>📝 Function Parameters</label>
              {selectedFunctionData.inputs.map((input, index) => (
                <div key={`${input.name}-${index}`} className="input-row">
                  <span className="input-label">{input.name} ({input.type})</span>
                  <input
                    type="text"
                    value={functionInputs[index] || ''}
                    onChange={(e) => updateInput(index, e.target.value)}
                    placeholder={`Enter ${input.type} value`}
                    className="form-input"
                    title={`Parameter: ${input.name} of type ${input.type}`}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedFunction && (
          <div className="card">
            <div className="function-actions">
              <button
                onClick={executeFunction}
                className={`btn btn-primary ${
                  selectedFunctionData?.stateMutability === 'view' || selectedFunctionData?.stateMutability === 'pure'
                    ? 'btn-call'
                    : 'btn-send'
                }`}
                disabled={!selectedContract || !selectedFunction}
                title={`${selectedFunctionData?.stateMutability === 'view' || selectedFunctionData?.stateMutability === 'pure' ? 'Call' : 'Send transaction to'} ${selectedFunction}`}
              >
                {selectedFunctionData?.stateMutability === 'view' || selectedFunctionData?.stateMutability === 'pure'
                  ? '📖 Call Function'
                  : '📝 Send Transaction'
                }
              </button>

              {functionCalls.length > 0 && (
                <button onClick={clearHistory} className="btn btn-secondary" title="Clear function call history">
                  🗑️ Clear History
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <h3>📊 Function Call History</h3>
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

                {call.transactionHash && (
                  <div className="call-transaction">
                    <strong>Transaction:</strong> {call.transactionHash}
                    {call.gasUsed && <span> (Gas: {call.gasUsed})</span>}
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

      <div className="card">
        <div className="contracts-overview">
          <h3>🏗️ Available Contracts ({Object.keys(contracts).length})</h3>
          <div className="contracts-grid">
            {Object.entries(contractsByCategory).map(([category, categoryContracts]) => (
              <div key={category} className="category-section">
                <h4>{category} ({categoryContracts.length})</h4>
                <div className="contract-cards">
                  {categoryContracts.map(contract => (
                    <div key={contract.name} className="contract-card">
                      <div className="contract-header">
                        <span className="contract-name">{contract.name}</span>
                        <span className={`status-indicator ${contract.connected ? 'connected' : 'disconnected'}`}>
                          {contract.connected ? '✅' : '❌'}
                        </span>
                      </div>
                      <div className="contract-address" title={contract.address}>
                        {contract.address}
                      </div>
                      <div className="contract-functions-count">
                        📋 {contract.functions.length} functions available
                      </div>
                      {contract.functions.length > 0 && (
                        <div className="function-preview">
                          <small>
                            {contract.functions.slice(0, 3).map(f => f.name).join(', ')}
                            {contract.functions.length > 3 && '...'}
                          </small>
                        </div>
                      )}
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
