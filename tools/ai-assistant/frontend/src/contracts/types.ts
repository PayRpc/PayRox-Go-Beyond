// Auto-generated TypeScript definitions for PayRox contracts
// Generated at: 2025-08-02T21:56:20.389Z

export interface ContractABI {
  contractName: string;
  abi: any[];
  bytecode: string;
  linkReferences: any;
  deployedBytecode: string;
}

export interface ContractInfo {
  name: string;
  address: string;
  hasABI: boolean;
  timestamp?: string;
  error?: string;
}

export interface PayRoxContracts {
  AuditRegistry: ContractABI;
  ManifestDispatcher: ContractABI;
  ExampleFacetA: ContractABI;
  ExampleFacetB: ContractABI;
  DeterministicChunkFactory: ContractABI;
  GovernanceOrchestrator: ContractABI;
  Orchestrator: ContractABI;
  }

export const CONTRACT_ADDRESSES = {
  'AUDIT-REGISTRY': '0xc5a5C42992dECbae36851359345FE25997F5C42d',
  DISPATCHER: '0x68B1D87F95878fE05B998F19b66F4baba5De1aed',
  'FACET-A': '0x4ed7c70F96B99c776995fB64377f0d4aB3B0e1C1',
  'FACET-B': '0x322813Fd9A801c5507c9de605d63CEA4f2CE6c44',
  FACTORY: '0x59b670e9fA9D0A427751Af201D676719a970857b',
  'GOVERNANCE-ORCHESTRATOR': '0x09635F643e140090A9A8Dcd712eD6285858ceBef',
  ORCHESTRATOR: '0x7a2088a1bFc9d81c55368AE168C2C02570cB814F',
  'PING-FACET': '0x67d269191c92Caf3cD7723F116c85e6E9bf55933',
} as const;
