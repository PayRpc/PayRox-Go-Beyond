// Auto-generated TypeScript definitions for PayRox contracts
// Generated at: 2025-08-01T15:15:12.053Z

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
  PingFacet: ContractABI;
}

export const CONTRACT_ADDRESSES = {
  'AUDIT-REGISTRY': '0x4c5859f0F772848b2D91F1D83E2Fe57935348029',
  DISPATCHER: '0x5f3f1dBD7B74C6B46e8c44f98792A1dAf8d69154',
  'FACET-A': '0x0E801D84Fa97b50751Dbf25036d067dCf18858bF',
  'FACET-B': '0x8f86403A4DE0BB5791fa46B8e795C547942fE4Cf',
  FACTORY: '0x82e01223d51Eb87e16A03E24687EDF0F294da6f1',
  'GOVERNANCE-ORCHESTRATOR': '0x809d550fca64d94Bd9F66E60752A544199cfAC3D',
  ORCHESTRATOR: '0x36C02dA8a0983159322a80FFE9F24b1acfF8B570',
  'PING-FACET': '0x1291Be112d480055DaFd8a610b7d1e203891C274',
} as const;
