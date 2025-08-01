import { ethers } from 'ethers';
import { useEffect, useState } from 'react';

// Import deployed contracts configuration
import deployedContracts from '../../../config/deployed-contracts.json';

interface ContractFunction {
  name: string;
  inputs: Array<{
    name: string;
    type: string;
    internalType?: string;
  }>;
  outputs: Array<{
    name: string;
    type: string;
    internalType?: string;
  }>;
  stateMutability: 'view' | 'pure' | 'nonpayable' | 'payable';
  type: 'function';
}

interface ContractInfo {
  name: string;
  address: string;
  abi: any[];
  functions: ContractFunction[];
}

interface DeployedContracts {
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
}

interface FunctionCallResult {
  success: boolean;
  result?: any;
  error?: string;
  gasUsed?: string;
  transactionHash?: string;
}

interface UseContractReturn {
  contracts: DeployedContracts | null;
  loading: boolean;
  error: string | null;
  connected: boolean;
  networkInfo: any;
  callFunction: (
    category: keyof DeployedContracts,
    contractName: string,
    functionName: string,
    args: any[],
    overrides?: any
  ) => Promise<FunctionCallResult>;
  getContractFunctions: (
    category: keyof DeployedContracts,
    contractName: string
  ) => ContractFunction[];
  connectWallet: () => Promise<void>;
  getCurrentBlock: () => Promise<number | null>;
}

export const useContracts = (): UseContractReturn => {
  const [contracts, setContracts] = useState<DeployedContracts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [provider, setProvider] = useState<ethers.Provider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [networkInfo, setNetworkInfo] = useState<any>(null);

  // Initialize contracts and connection
  useEffect(() => {
    initializeContracts();
  }, []);

  const initializeContracts = async () => {
    try {
      setLoading(true);
      setError(null);

      // Connect to the network
      const rpcUrl = deployedContracts.network.rpcUrl;
      const jsonProvider = new ethers.JsonRpcProvider(rpcUrl);
      setProvider(jsonProvider);

      // Try to connect to MetaMask if available
      if (typeof window !== 'undefined' && window.ethereum) {
        try {
          const browserProvider = new ethers.BrowserProvider(window.ethereum);
          const accounts = await window.ethereum.request({
            method: 'eth_accounts',
          });

          if (accounts.length > 0) {
            const walletSigner = await browserProvider.getSigner();
            setSigner(walletSigner);
            setProvider(browserProvider);
            setConnected(true);
          }
        } catch (walletError) {
          console.warn('Wallet connection failed, using read-only mode');
        }
      }

      // Get network info
      const network = await jsonProvider.getNetwork();
      const blockNumber = await jsonProvider.getBlockNumber();

      setNetworkInfo({
        name: deployedContracts.network.name,
        chainId: network.chainId.toString(),
        blockNumber,
        rpcUrl: deployedContracts.network.rpcUrl,
      });

      // Load contract ABIs and create contract info
      const contractsData: DeployedContracts = await loadContractData();
      setContracts(contractsData);
      setLoading(false);
    } catch (err) {
      console.error('Failed to initialize contracts:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to initialize contracts'
      );
      setLoading(false);
    }
  };

  const loadContractData = async (): Promise<DeployedContracts> => {
    // This would normally load ABIs from the artifact files
    // For now, we'll create a simplified structure
    const loadABI = async (contractPath: string) => {
      try {
        // In a real implementation, you would fetch the ABI from the artifact files
        // For now, return a mock ABI structure
        return [
          {
            name: 'ping',
            type: 'function',
            stateMutability: 'pure',
            inputs: [],
            outputs: [{ name: '', type: 'string', internalType: 'string' }],
          },
          {
            name: 'owner',
            type: 'function',
            stateMutability: 'view',
            inputs: [],
            outputs: [{ name: '', type: 'address', internalType: 'address' }],
          },
        ];
      } catch {
        return [];
      }
    };

    const createContractInfo = async (
      contractConfig: any
    ): Promise<ContractInfo> => {
      const abi = await loadABI(contractConfig.abi);
      const functions = abi.filter(
        (item: any) => item.type === 'function'
      ) as ContractFunction[];

      return {
        name: contractConfig.name,
        address: contractConfig.address,
        abi,
        functions,
      };
    };

    return {
      core: {
        factory: await createContractInfo(
          deployedContracts.contracts.core.factory
        ),
        dispatcher: await createContractInfo(
          deployedContracts.contracts.core.dispatcher
        ),
      },
      orchestrators: {
        main: await createContractInfo(
          deployedContracts.contracts.orchestrators.main
        ),
        governance: await createContractInfo(
          deployedContracts.contracts.orchestrators.governance
        ),
        auditRegistry: await createContractInfo(
          deployedContracts.contracts.orchestrators.auditRegistry
        ),
      },
      facets: {
        ping: await createContractInfo(deployedContracts.contracts.facets.ping),
      },
    };
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      throw new Error('MetaMask not found');
    }

    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      const walletSigner = await browserProvider.getSigner();

      setSigner(walletSigner);
      setProvider(browserProvider);
      setConnected(true);
    } catch (err) {
      throw new Error('Failed to connect wallet');
    }
  };

  const callFunction = async (
    category: keyof DeployedContracts,
    contractName: string,
    functionName: string,
    args: any[] = [],
    overrides: any = {}
  ): Promise<FunctionCallResult> => {
    if (!contracts || !provider) {
      return { success: false, error: 'Contracts not initialized' };
    }

    try {
      const contractInfo = (contracts[category] as any)[
        contractName
      ] as ContractInfo;
      if (!contractInfo) {
        return { success: false, error: 'Contract not found' };
      }

      const contractInstance = new ethers.Contract(
        contractInfo.address,
        contractInfo.abi,
        signer || provider
      );

      const functionAbi = contractInfo.functions.find(
        f => f.name === functionName
      );
      if (!functionAbi) {
        return { success: false, error: 'Function not found' };
      }

      let result: any;
      let gasUsed: string | undefined;
      let transactionHash: string | undefined;

      if (
        functionAbi.stateMutability === 'view' ||
        functionAbi.stateMutability === 'pure'
      ) {
        // Read-only function call
        result = await contractInstance[functionName](...args);
      } else {
        // State-changing function call
        if (!signer) {
          return {
            success: false,
            error: 'Wallet connection required for transactions',
          };
        }

        const tx = await contractInstance[functionName](...args, overrides);
        const receipt = await tx.wait();

        result =
          receipt.status === 1
            ? 'Transaction successful'
            : 'Transaction failed';
        gasUsed = receipt.gasUsed.toString();
        transactionHash = receipt.hash;
      }

      // Format result for display
      let formattedResult: string;
      if (typeof result === 'bigint') {
        formattedResult = result.toString();
      } else if (typeof result === 'object' && result !== null) {
        formattedResult = JSON.stringify(result, null, 2);
      } else {
        formattedResult = result?.toString() || 'No result';
      }

      return {
        success: true,
        result: formattedResult,
        gasUsed,
        transactionHash,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Function call failed',
      };
    }
  };

  const getContractFunctions = (
    category: keyof DeployedContracts,
    contractName: string
  ): ContractFunction[] => {
    if (!contracts) return [];

    const contractInfo = (contracts[category] as any)[
      contractName
    ] as ContractInfo;
    return contractInfo?.functions || [];
  };

  const getCurrentBlock = async (): Promise<number | null> => {
    if (!provider) return null;

    try {
      return await provider.getBlockNumber();
    } catch {
      return null;
    }
  };

  return {
    contracts,
    loading,
    error,
    connected,
    networkInfo,
    callFunction,
    getContractFunctions,
    connectWallet,
    getCurrentBlock,
  };
};

declare global {
  interface Window {
    ethereum?: any;
  }
}
