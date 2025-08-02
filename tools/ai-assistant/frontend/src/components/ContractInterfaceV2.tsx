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

interface NetworkInfo {
  name: string;
  blockNumber: number;
  chainId: string;
  rpcUrl: string;
  walletAddress?: string;
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
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);
  const [contracts, setContracts] = useState<Record<string, ContractState>>({});
  const [selectedContract, setSelectedContract] = useState<string>('');
  const [selectedFunction, setSelectedFunction] = useState<string>('');
  const [functionInputs, setFunctionInputs] = useState<string[]>([]);
  const [functionCalls, setFunctionCalls] = useState<FunctionCall[]>([]);
  const [loading, setLoading] = useState(true);

  // Deployment state
  const [activeSection, setActiveSection] = useState<'interaction' | 'deployment'>('interaction');
  const [deploymentBytecode, setDeploymentBytecode] = useState('');
  const [deploymentName, setDeploymentName] = useState('');
  const [constructorInputs, setConstructorInputs] = useState<string[]>([]);
  const [deploymentLoading, setDeploymentLoading] = useState(false);
  const [predictedAddress, setPredictedAddress] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  // Contract templates
  const contractTemplates = {
    'simple-storage': {
      name: 'Simple Storage',
      bytecode: '0x608060405234801561001057600080fd5b50610150806100206000396000f3fe608060405234801561001057600080fd5b50600436106100365760003560e01c80632e64cec11461003b5780636057361d14610059575b600080fd5b610043610075565b60405161005091906100a1565b60405180910390f35b6100736004803603810190610070919061008d565b61007e565b005b60008054905090565b8060008190555050565b6000813590506100a7816100bc565b92915050565b6000602082840312156100c3576100c26100b7565b5b60006100d184828501610098565b91505092915050565b6100e3816100ad565b82525050565b60006020820190506100fe60008301846100da565b92915050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052602260045260246000fd5b6000600282049050600182168061014b57505b6020821014610159576101596100fc565b5b5091905056fea26469706673582212209a8b5c6b2e6f7d8c9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f63736f6c63430008110033',
      constructorParams: [],
      description: 'A simple contract to store and retrieve a number'
    },
    'erc20-token': {
      name: 'ERC20 Token',
      bytecode: '0x608060405234801561001057600080fd5b506040516107d03803806107d08339818101604052810190610032919061007a565b80600090805190602001906100489291906100a7565b505061015b565b600080fd5b600080fd5b600080fd5b600080fd5b6000601f19601f8301169050919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052604160045260246000fd5b6100a08261005b565b810181811067ffffffffffffffff821117156100bf576100be610068565b5b80604052505050565b600080fd5b600080fd5b600080fd5b600080fd5b600080fd5b600080fd5b600080fd5b6000806000606084860312156100ff576100fe6100c8565b5b600084013567ffffffffffffffff81111561011d5761011c6100cd565b5b610129868287016100d2565b935050602061013a868287016100d2565b925050604061014b868287016100d2565b9150509250925092565b610666806101696000396000f3fe',
      constructorParams: ['MyToken', 'MTK', '1000000'],
      description: 'Standard ERC20 token with name, symbol, and initial supply'
    },
    'multi-sig': {
      name: 'Multi-Signature Wallet',
      bytecode: '0x608060405234801561001057600080fd5b506040516106123803806106128339818101604052810190610032919061008a565b806000819055505061012a565b600080fd5b6000819050919050565b61005681610043565b811461006157600080fd5b50565b6000815190506100738161004d565b92915050565b60006020828403121561008f5761008e61003e565b5b600061009d84828501610064565b91505092915050565b6104d9806101396000396000f3fe',
      constructorParams: ['2'],
      description: 'Multi-signature wallet requiring multiple approvals'
    },
    'custom': {
      name: 'Custom Contract',
      bytecode: '',
      constructorParams: [],
      description: 'Enter your own contract bytecode'
    }
  };

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

      for (const [, config] of Object.entries(contractConfig.contracts)) {
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
          const network = await browserProvider.getNetwork();
          const blockNumber = await browserProvider.getBlockNumber();

          setSigner(walletSigner);
          setProvider(browserProvider);
          setConnected(true);

          // Update network info with wallet connection
          setNetworkInfo({
            name: network.chainId === 31337n ? 'localhost' : network.name,
            chainId: network.chainId.toString(),
            blockNumber,
            rpcUrl: 'Connected via MetaMask',
            walletAddress: accounts[0]
          });

          console.log('Wallet connected:', accounts[0]);
        }
      } catch (error) {
        console.warn('Wallet connection failed:', error);
      }
    }
  };

  const requestWalletConnection = async () => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        // Request account access
        const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
        console.log('Accounts granted:', accounts);

        // Connect wallet
        await connectWallet();

        // Also check if we need to switch to localhost network
        const chainId = await (window as any).ethereum.request({ method: 'eth_chainId' });
        if (chainId !== '0x7a69') { // 31337 in hex
          try {
            await (window as any).ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: '0x7a69' }],
            });
          } catch (switchError: any) {
            // If the chain doesn't exist, add it
            if (switchError.code === 4902) {
              await (window as any).ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [
                  {
                    chainId: '0x7a69',
                    chainName: 'Hardhat Local',
                    nativeCurrency: {
                      name: 'Ethereum',
                      symbol: 'ETH',
                      decimals: 18,
                    },
                    rpcUrls: ['http://localhost:8545'],
                  },
                ],
              });
            }
          }
        }
      } catch (error) {
        console.error('Failed to connect wallet:', error);
        alert('Failed to connect wallet. Please make sure MetaMask is installed and try again.');
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
      } else if (Array.isArray(result) || (typeof result === 'object' && result !== null)) {
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

  // Deployment functions
  const predictContractAddress = async () => {
    if (!deploymentBytecode.trim()) return;

    try {
      if (!provider) throw new Error('Provider not connected');

      // Use Factory contract to predict address
      const factoryAddress = (contractConfig.contracts as any).core.factory.address;
      const factoryABI = (contractABIs as any).DeterministicChunkFactory?.abi || [];

      if (!factoryABI.length) {
        throw new Error('Factory ABI not found');
      }

      const factoryContract = new ethers.Contract(factoryAddress, factoryABI, provider);
      const bytecodeWithConstructor = deploymentBytecode + (constructorInputs.length > 0 ? ethers.AbiCoder.defaultAbiCoder().encode(['string[]'], [constructorInputs]).slice(2) : '');

      const predictedAddr = await factoryContract.predict(bytecodeWithConstructor);
      setPredictedAddress(predictedAddr);
    } catch (error) {
      console.error('Address prediction failed:', error);
      setPredictedAddress('');
    }
  };

  const deployContract = async () => {
    if (!signer || !deploymentBytecode.trim() || !deploymentName.trim()) {
      alert('Please connect wallet and provide contract bytecode and name');
      return;
    }

    setDeploymentLoading(true);

    try {
      // Use PayRox Factory for deployment
      const factoryAddress = (contractConfig.contracts as any).core.factory.address;
      const factoryABI = (contractABIs as any).DeterministicChunkFactory?.abi || [];

      const factoryContract = new ethers.Contract(factoryAddress, factoryABI, signer);

      // Prepare bytecode with constructor parameters
      const bytecodeWithConstructor = deploymentBytecode + (constructorInputs.length > 0 ? ethers.AbiCoder.defaultAbiCoder().encode(['string[]'], [constructorInputs]).slice(2) : '');

      // Deploy using PayRox Factory
      const tx = await factoryContract.stage(bytecodeWithConstructor, {
        value: ethers.parseEther('0.0007') // PayRox deployment fee
      });

      const receipt = await tx.wait();
      const deployedAddress = predictedAddress || 'Address calculation pending';

      // Add to function calls history
      const deploymentCall: FunctionCall = {
        id: Date.now().toString(),
        contractName: deploymentName,
        functionName: 'deploy',
        parameters: constructorInputs,
        result: `Deployed to: ${deployedAddress}`,
        loading: false,
        timestamp: new Date(),
        transactionHash: receipt.hash,
        gasUsed: receipt.gasUsed.toString()
      };

      setFunctionCalls(prev => [deploymentCall, ...prev]);

      alert(`Contract deployed successfully to: ${deployedAddress}`);

      // Clear deployment form
      setDeploymentBytecode('');
      setDeploymentName('');
      setConstructorInputs([]);
      setPredictedAddress('');

    } catch (error) {
      console.error('Deployment failed:', error);
      alert(`Deployment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setDeploymentLoading(false);
    }
  };

  const updateConstructorInput = (index: number, value: string) => {
    const newInputs = [...constructorInputs];
    newInputs[index] = value;
    setConstructorInputs(newInputs);
  };

  const handleTemplateSelect = (templateKey: string) => {
    setSelectedTemplate(templateKey);
    if (templateKey && contractTemplates[templateKey as keyof typeof contractTemplates]) {
      const template = contractTemplates[templateKey as keyof typeof contractTemplates];
      setDeploymentName(template.name);
      setDeploymentBytecode(template.bytecode);
      setConstructorInputs(template.constructorParams);
      setPredictedAddress('');
    }
  };

  const disconnectWallet = () => {
    setSigner(null);
    setConnected(false);
    setNetworkInfo((prev: NetworkInfo | null) => prev ? {...prev, walletAddress: undefined} : null);
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
            <div className="network-details">
              <span>
                {networkInfo ? `${networkInfo.name} (Block: ${networkInfo.blockNumber})` : 'Disconnected'}
              </span>
              {connected && networkInfo?.walletAddress && (
                <span className="wallet-address">
                  🔗 {networkInfo.walletAddress.slice(0, 6)}...{networkInfo.walletAddress.slice(-4)}
                </span>
              )}
            </div>
            {!connected ? (
              <button onClick={requestWalletConnection} className="btn btn-sm btn-primary">
                🔗 Connect Wallet
              </button>
            ) : (
              <button onClick={disconnectWallet} className="btn btn-sm btn-secondary">
                🔌 Disconnect
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="card">
        <div className="section-tabs">
          <button
            className={`tab ${activeSection === 'interaction' ? 'active' : ''}`}
            onClick={() => setActiveSection('interaction')}
          >
            🎛️ Contract Interaction
          </button>
          <button
            className={`tab ${activeSection === 'deployment' ? 'active' : ''}`}
            onClick={() => setActiveSection('deployment')}
          >
            🚀 Deploy Contract
          </button>
        </div>
      </div>

      {activeSection === 'interaction' && (
        <div className="interface-content">
        <div className="card">
          <div className="form-group">
            <label htmlFor="contract-select">📋 Select Contract</label>
            <select
              id="contract-select"
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
              <label htmlFor="function-select">⚡ Select Function</label>
              <select
                id="function-select"
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
              <label htmlFor="function-parameters-section">📝 Function Parameters</label>
              <div id="function-parameters-section">
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
      )}

      {activeSection === 'deployment' && (
        <div className="deployment-content">
          <div className="card">
            <h3>🚀 Deploy Smart Contract</h3>

            {/* Wallet Connection Status */}
            {!connected && (
              <div className="wallet-warning">
                <p>⚠️ Please connect your wallet to deploy contracts</p>
                <button onClick={requestWalletConnection} className="btn btn-primary">
                  🔗 Connect Wallet
                </button>
              </div>
            )}

            {/* Contract Templates */}
            <div className="form-group">
              <label htmlFor="template-select">📋 Contract Template</label>
              <select
                id="template-select"
                value={selectedTemplate}
                onChange={(e) => handleTemplateSelect(e.target.value)}
                className="form-select"
                title="Select Contract Template"
                aria-label="Select Contract Template"
              >
                <option value="">Choose a template...</option>
                {Object.entries(contractTemplates).map(([key, template]) => (
                  <option key={key} value={key}>
                    {template.name} - {template.description}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="contract-name-input">Contract Name</label>
              <input
                id="contract-name-input"
                type="text"
                value={deploymentName}
                onChange={(e) => setDeploymentName(e.target.value)}
                placeholder="Enter contract name"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="contract-bytecode-input">Contract Bytecode</label>
              <textarea
                id="contract-bytecode-input"
                value={deploymentBytecode}
                onChange={(e) => setDeploymentBytecode(e.target.value)}
                placeholder="Enter contract bytecode (0x...) or select a template above"
                className="form-textarea"
                rows={6}
              />
            </div>

            <div className="form-group">
              <label htmlFor="constructor-params-section">Constructor Parameters (one per line)</label>
              <div id="constructor-params-section" className="constructor-inputs">
                {constructorInputs.map((input, index) => (
                  <input
                    key={`constructor-input-${index}-${input.slice(0, 10)}`}
                    type="text"
                    value={input}
                    onChange={(e) => updateConstructorInput(index, e.target.value)}
                    placeholder={`Parameter ${index + 1}`}
                    className="form-input"
                  />
                ))}
                <button
                  type="button"
                  onClick={() => setConstructorInputs([...constructorInputs, ''])}
                  className="btn btn-sm btn-secondary"
                >
                  ➕ Add Parameter
                </button>
              </div>
            </div>

            <div className="deployment-actions">
              <button
                onClick={predictContractAddress}
                className="btn btn-secondary"
                disabled={!deploymentBytecode.trim()}
              >
                🔮 Predict Address
              </button>

              <button
                onClick={deployContract}
                className="btn btn-primary"
                disabled={!connected || !deploymentBytecode.trim() || !deploymentName.trim() || deploymentLoading}
              >
                {deploymentLoading ? '⏳ Deploying...' : '🚀 Deploy Contract'}
              </button>
            </div>

            {predictedAddress && (
              <div className="predicted-address">
                <h4>📍 Predicted Address:</h4>
                <code>{predictedAddress}</code>
              </div>
            )}

            <div className="deployment-info">
              <h4>💰 Deployment Fee: 0.0007 ETH</h4>
              <p>Contracts are deployed using PayRox's deterministic factory for consistent addresses across networks.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContractInterface;
