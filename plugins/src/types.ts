export interface PluginConfig {
  name: string;
  version: string;
  description: string;
  author: string;
  tags: string[];
  dependencies?: string[];
  contracts?: string[];
  networks?: string[];
}

export interface CLICommand {
  name: string;
  description: string;
  options?: CommandOption[];
  action: (args: any, options: any) => Promise<void>;
}

export interface CommandOption {
  flag: string;
  description: string;
  required?: boolean;
  default?: any;
}

export interface TemplateConfig {
  name: string;
  description: string;
  category: 'defi' | 'nft' | 'dao' | 'gaming' | 'oracle' | 'bridge' | 'utility';
  contracts: string[];
  frontend?: 'react' | 'vue' | 'next' | 'none';
  features: string[];
}

export interface DAppConfig {
  name: string;
  template: string;
  network: string;
  contracts: ContractConfig[];
  frontend?: FrontendConfig;
  deployment?: DeploymentConfig;
}

export interface ContractConfig {
  name: string;
  source: string;
  constructor?: any[];
  proxy?: boolean;
  upgradeable?: boolean;
}

export interface FrontendConfig {
  framework: 'react' | 'vue' | 'next';
  features: string[];
  components: string[];
}

export interface DeploymentConfig {
  network: string;
  gasPrice?: string;
  gasLimit?: number;
  confirmations?: number;
  verify?: boolean;
}

export interface PluginMetadata {
  config: PluginConfig;
  path: string;
  installed: boolean;
  active: boolean;
}

export interface TemplateMetadata {
  config: TemplateConfig;
  path: string;
  files: string[];
}

// Event types for plugin system
export type PluginEvent = 
  | 'plugin:loaded'
  | 'plugin:unloaded'
  | 'plugin:installed'
  | 'plugin:uninstalled'
  | 'template:created'
  | 'dapp:deployed'
  | 'contract:compiled'
  | 'contract:deployed';

export interface PluginEventData {
  plugin?: string;
  template?: string;
  dapp?: string;
  contract?: string;
  network?: string;
  address?: string;
  error?: Error;
}
