/**
 * @title PayRox SDK - AI Deployment Integration
 * @notice Main SDK entry point with integrated AI deployment service
 * @dev Production-ready SDK with zero-time deployment intelligence
 */

export { 
  PayRoxAIDeploymentService,
  getPayRoxAI,
  quickDeploy,
  deployPayRoxSystem,
  deployTerraStake,
  type InstantDeployResult,
  type SystemDeployResult,
  type BatchDeployResult
} from './ai/PayRoxAIDeploymentService';

/**
 * PayRox SDK Main Class with integrated AI deployment
 */
export class PayRoxSDK {
  private ai: import('./ai/PayRoxAIDeploymentService').PayRoxAIDeploymentService;
  
  constructor(projectRoot?: string) {
    const { PayRoxAIDeploymentService } = require('./ai/PayRoxAIDeploymentService');
    this.ai = PayRoxAIDeploymentService.getInstance(projectRoot);
  }

  /**
   * AI-powered instant deployment
   */
  async deploy(contractName: string, args: any[] = []): Promise<import('./ai/PayRoxAIDeploymentService').InstantDeployResult> {
    return await this.ai.deployInstant(contractName, args);
  }

  /**
   * Deploy complete PayRox system
   */
  async deploySystem(options = {}): Promise<import('./ai/PayRoxAIDeploymentService').SystemDeployResult> {
    return await this.ai.deployPayRoxSystem(options);
  }

  /**
   * Get AI deployment service
   */
  get deployment() {
    return this.ai;
  }
}

/**
 * Create PayRox SDK instance
 */
export function createPayRoxSDK(projectRoot?: string): PayRoxSDK {
  return new PayRoxSDK(projectRoot);
}

/**
 * Default export for easy importing
 */
const sdk = new PayRoxSDK();
export default sdk;
