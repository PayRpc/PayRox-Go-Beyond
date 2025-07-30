import { ethers } from "ethers";

export interface PayRoxConfig {
  factoryAddress: string;
  dispatcherAddress: string;
  orchestratorAddress: string;
  provider: ethers.Provider;
  signer?: ethers.Signer;
}

export interface DeploymentResult {
  success: boolean;
  address?: string;
  transactionHash?: string;
  error?: string;
}

export interface ManifestEntry {
  target: string;
  selector: string;
  isActive: boolean;
  gasLimit: number;
}

export interface ChunkInfo {
  name: string;
  address: string;
  size: number;
  hash: string;
  isDeployed: boolean;
}

export interface FacetInfo {
  name: string;
  address: string;
  selectors: string[];
  isActive: boolean;
}

export interface OrchestrationInfo {
  id: string;
  initiator: string;
  startTime: number;
  gasLimit: number;
  completed: boolean;
  success: boolean;
}

export interface NetworkInfo {
  chainId: number;
  name: string;
  gasPrice: string;
  gasLimit: number;
  confirmations: number;
}

export interface DispatchInfo {
  target: string;
  callData: string;
  value: string;
}
