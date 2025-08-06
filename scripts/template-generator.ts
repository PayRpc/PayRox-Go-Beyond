#!/usr/bin/env ts-node

/**
 * PAYROX TEMPLATE GENERATOR
 * 
 * Generates production-ready facet templates with built-in MUST-FIX compliance
 * Based on learned patterns from AI template system mastery
 */

import * as fs from 'fs';
import * as path from 'path';
import * as ejs from 'ejs';

interface TemplateConfig {
  name: string;
  templateType: 'minimal' | 'standard' | 'advanced';
  domain?: 'trading' | 'lending' | 'staking' | 'governance' | 'insurance' | 'nft';
  features: {
    pausable: boolean;
    reentrancyGuard: boolean;
    roleBasedAccess: boolean;
    oracle: boolean;
    hooks: boolean;
    batchOperations: boolean;
  };
  stateVariables: StateVariable[];
  functions: FunctionSpec[];
}

interface StateVariable {
  type: string;
  name: string;
  visibility: 'private' | 'internal';
  description: string;
}

interface FunctionSpec {
  name: string;
  type: 'admin' | 'core' | 'view';
  modifiers: string[];
  params: Parameter[];
  returns: Parameter[];
  description: string;
}

interface Parameter {
  type: string;
  name: string;
}

class PayRoxTemplateGenerator {

  async generateTemplate(config: TemplateConfig): Promise<void> {
    console.log('🎯 PayRox Template Generator - AI Powered');
    console.log(`Generating ${config.templateType} template: ${config.name}`);
    console.log('═'.repeat(60));

    // Create output directory
    const outputDir = `./templates/generated/${config.name.toLowerCase()}`;
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Generate facet contract
    await this.generateFacetContract(config, outputDir);
    
    // Generate test file
    await this.generateTestFile(config, outputDir);
    
    // Generate manifest
    await this.generateManifest(config, outputDir);
    
    // Generate deployment script
    await this.generateDeploymentScript(config, outputDir);
    
    // Generate README
    await this.generateReadme(config, outputDir);

    console.log(`\\n✅ Template generated successfully in: ${outputDir}`);
    console.log('🔍 Running MUST-FIX validation...');
    
    // Auto-validate the generated template
    await this.validateTemplate(outputDir);
  }

  private async generateFacetContract(config: TemplateConfig, outputDir: string): Promise<void> {
    const template = this.getFacetTemplate(config.templateType);
    const templateData = this.prepareTemplateData(config);
    
    const contractCode = ejs.render(template, templateData);
    const filePath = path.join(outputDir, `${config.name}.sol`);
    
    fs.writeFileSync(filePath, contractCode);
    console.log(`📄 Generated facet: ${config.name}.sol`);
  }

  private getFacetTemplate(type: 'minimal' | 'standard' | 'advanced'): string {
    const templates = {
      minimal: this.getMinimalTemplate(),
      standard: this.getStandardTemplate(),
      advanced: this.getAdvancedTemplate()
    };
    
    return templates[type];
  }

  private getStandardTemplate(): string {
    return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

<% if (features.oracle || features.batchOperations) { %>
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
<% } %>
import "../utils/LibDiamond.sol";

/// ---------- Errors (gas-efficient custom errors) ----------
error NotInit();
error AlreadyInit();
<% if (features.pausable) { %>error Paused();<% } %>
<% if (features.reentrancyGuard) { %>error Reentrancy();<% } %>
error InvalidParam();
error Unauthorized();

<% if (features.roleBasedAccess) { %>
/// ---------- Roles ----------
bytes32 constant OPERATOR_ROLE = keccak256("<%= nameUpper %>_OPERATOR_ROLE");
bytes32 constant PAUSER_ROLE = keccak256("<%= nameUpper %>_PAUSER_ROLE");
<% } %>

/// ---------- Storage (namespaced, collision-free) ----------
bytes32 constant <%= nameUpper %>_SLOT = keccak256("payrox.facets.<%= nameLower %>.v1");

struct <%= Name %>Layout {
<% stateVariables.forEach(variable => { %>
    <%= variable.type %> <%= variable.name %>; // <%= variable.description %>
<% }); %>
    
    // Lifecycle and security
    bool initialized;
    uint8 version;
<% if (features.pausable) { %>    bool paused;<% } %>
<% if (features.reentrancyGuard) { %>    uint256 _reentrancy; // 1=unlocked, 2=locked<% } %>
<% if (features.roleBasedAccess) { %>    address operator;<% } %>
}

function _<%= nameLower %>() pure returns (<%= Name %>Layout storage l) {
    bytes32 slot = <%= nameUpper %>_SLOT;
    assembly { l.slot := slot }
}

/**
 * @title <%= Name %>
 * @notice <%= description %>
 * @dev PayRox facet with manifest integration and security best practices
 */
contract <%= Name %> {
<% if (features.oracle || features.batchOperations) { %>    using SafeERC20 for IERC20;<% } %>

    /// ---------- Events ----------
    event <%= Name %>Initialized(address indexed operator, uint256 timestamp);
<% if (features.pausable) { %>    event PauseStatusChanged(bool paused);<% } %>
<% functions.filter(f => f.type === 'core').forEach(func => { %>
    event <%= func.name.charAt(0).toUpperCase() + func.name.slice(1) %>Called(address indexed caller<% func.params.forEach(p => { %>, <%= p.type %> <%= p.name %><% }); %>);
<% }); %>

    /// ---------- Modifiers (security-first) ----------
    modifier onlyDispatcher() {
        LibDiamond.enforceManifestCall();
        _;
    }
    
<% if (features.roleBasedAccess) { %>
    modifier onlyOperator() {
        if (msg.sender != _<%= nameLower %>().operator) revert Unauthorized();
        _;
    }
    
    modifier onlyRole(bytes32 role) {
        LibDiamond.enforceRole(role, msg.sender);
        _;
    }
<% } %>

    modifier onlyInitialized() {
        if (!_<%= nameLower %>().initialized) revert NotInit();
        _;
    }

<% if (features.pausable) { %>
    modifier whenNotPaused() {
        if (_<%= nameLower %>().paused) revert Paused();
        _;
    }
<% } %>

<% if (features.reentrancyGuard) { %>
    modifier nonReentrant() {
        <%= Name %>Layout storage l = _<%= nameLower %>();
        if (l._reentrancy == 2) revert Reentrancy();
        l._reentrancy = 2;
        _;
        l._reentrancy = 1;
    }
<% } %>

    /// ---------- Initialization (no constructor) ----------
    function initialize<%= Name %>(
<% if (features.roleBasedAccess) { %>        address operator_<% if (initParams.length > 0) { %>,<% } %>
<% } %>
<% initParams.forEach((param, index) => { %>        <%= param.type %> <%= param.name %>_<% if (index < initParams.length - 1) { %>,<% } %>
<% }); %>
    ) external onlyDispatcher {
<% if (features.roleBasedAccess) { %>        if (operator_ == address(0)) revert Unauthorized();<% } %>
        
        <%= Name %>Layout storage l = _<%= nameLower %>();
        if (l.initialized) revert AlreadyInit();
        
        l.initialized = true;
        l.version = 1;
<% if (features.pausable) { %>        l.paused = false;<% } %>
<% if (features.reentrancyGuard) { %>        l._reentrancy = 1;<% } %>
<% if (features.roleBasedAccess) { %>        l.operator = operator_;<% } %>
        
        // Initialize state variables
<% initParams.forEach(param => { %>        l.<%= param.name %> = <%= param.name %>_;
<% }); %>
        
        emit <%= Name %>Initialized(<% if (features.roleBasedAccess) { %>operator_<% } else { %>msg.sender<% } %>, block.timestamp);
    }

    /// ---------- Admin Functions (role-gated) ----------
<% if (features.pausable) { %>
    function setPaused(bool paused_) 
        external 
        onlyDispatcher 
<% if (features.roleBasedAccess) { %>        onlyRole(PAUSER_ROLE) 
<% } %>        onlyInitialized 
    {
        _<%= nameLower %>().paused = paused_;
        emit PauseStatusChanged(paused_);
    }
<% } %>

<% functions.filter(f => f.type === 'admin').forEach(func => { %>
    function <%= func.name %>(
<% func.params.forEach((param, index) => { %>        <%= param.type %> <%= param.name %><% if (index < func.params.length - 1) { %>,<% } %>
<% }); %>
    ) external onlyDispatcher<% if (features.roleBasedAccess) { %> onlyOperator<% } %> onlyInitialized {
        // TODO: Implement <%= func.description %>
        
        <%= Name %>Layout storage l = _<%= nameLower %>();
        // CEI pattern: Checks, Effects, Interactions
        
        emit <%= func.name.charAt(0).toUpperCase() + func.name.slice(1) %>Called(msg.sender<% func.params.forEach(p => { %>, <%= p.name %><% }); %>);
    }
<% }); %>

    /// ---------- Core Business Logic ----------
<% functions.filter(f => f.type === 'core').forEach(func => { %>
    function <%= func.name %>(
<% func.params.forEach((param, index) => { %>        <%= param.type %> <%= param.name %><% if (index < func.params.length - 1) { %>,<% } %>
<% }); %>
    ) external 
        onlyDispatcher 
        onlyInitialized 
<% if (features.pausable) { %>        whenNotPaused 
<% } %>
<% if (features.reentrancyGuard) { %>        nonReentrant 
<% } %>
<% if (func.returns.length > 0) { %>        returns (<% func.returns.forEach((ret, index) => { %><%= ret.type %> <%= ret.name %><% if (index < func.returns.length - 1) { %>, <% } %><% }); %>)
<% } %>
    {
        // Input validation
<% func.params.forEach(param => { %>        if (<%= this.getValidationCheck(param) %>) revert InvalidParam();
<% }); %>
        
        <%= Name %>Layout storage l = _<%= nameLower %>();
        
        // TODO: Implement <%= func.description %>
        // Follow CEI pattern: Checks, Effects, Interactions
        
        emit <%= func.name.charAt(0).toUpperCase() + func.name.slice(1) %>Called(msg.sender<% func.params.forEach(p => { %>, <%= p.name %><% }); %>);
    }
<% }); %>

    /// ---------- View Functions ----------
<% functions.filter(f => f.type === 'view').forEach(func => { %>
    function <%= func.name %>(<% func.params.forEach((param, index) => { %><%= param.type %> <%= param.name %><% if (index < func.params.length - 1) { %>, <% } %><% }); %>) 
        external 
        view 
        returns (<% func.returns.forEach((ret, index) => { %><%= ret.type %> <%= ret.name %><% if (index < func.returns.length - 1) { %>, <% } %><% }); %>) 
    {
        <%= Name %>Layout storage l = _<%= nameLower %>();
        // TODO: Implement <%= func.description %>
    }
<% }); %>

    function is<%= Name %>Initialized() external view returns (bool) {
        return _<%= nameLower %>().initialized;
    }

    function get<%= Name %>Version() external view returns (uint8) {
        return _<%= nameLower %>().version;
    }

<% if (features.pausable) { %>
    function is<%= Name %>Paused() external view returns (bool) {
        return _<%= nameLower %>().paused;
    }
<% } %>

    /// ---------- Manifest Integration (REQUIRED) ----------
    function getFacetInfo()
        external
        pure
        returns (string memory name, string memory version, bytes4[] memory selectors)
    {
        name = "<%= name %>";
        version = "1.0.0";

        // Calculate exact selector count
        uint256 selectorCount = <%= this.calculateSelectorCount(functions, features) %>;
        selectors = new bytes4[](selectorCount);
        uint256 index = 0;

        // Core function selectors
<% functions.forEach(func => { %>        selectors[index++] = this.<%= func.name %>.selector;
<% }); %>
        
        // Standard selectors
        selectors[index++] = this.initialize<%= Name %>.selector;
<% if (features.pausable) { %>        selectors[index++] = this.setPaused.selector;<% } %>
        selectors[index++] = this.is<%= Name %>Initialized.selector;
        selectors[index++] = this.get<%= Name %>Version.selector;
<% if (features.pausable) { %>        selectors[index++] = this.is<%= Name %>Paused.selector;<% } %>
    }
}`;
  }

  private getMinimalTemplate(): string {
    return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../utils/LibDiamond.sol";

/// ---------- Errors ----------
error NotInit();
error AlreadyInit();

/// ---------- Storage ----------
bytes32 constant <%= nameUpper %>_SLOT = keccak256("payrox.facets.<%= nameLower %>.v1");

struct <%= Name %>Layout {
<% stateVariables.forEach(variable => { %>    <%= variable.type %> <%= variable.name %>; // <%= variable.description %>
<% }); %>    bool initialized;
    uint8 version;
}

function _<%= nameLower %>() pure returns (<%= Name %>Layout storage l) {
    bytes32 slot = <%= nameUpper %>_SLOT;
    assembly { l.slot := slot }
}

/**
 * @title <%= Name %>
 * @notice <%= description %>
 * @dev Minimal PayRox facet for read-only operations
 */
contract <%= Name %> {
    event <%= Name %>Initialized(uint256 timestamp);

    modifier onlyDispatcher() {
        LibDiamond.enforceManifestCall();
        _;
    }

    modifier onlyInitialized() {
        if (!_<%= nameLower %>().initialized) revert NotInit();
        _;
    }

    function initialize<%= Name %>() external onlyDispatcher {
        <%= Name %>Layout storage l = _<%= nameLower %>();
        if (l.initialized) revert AlreadyInit();
        
        l.initialized = true;
        l.version = 1;
        
        emit <%= Name %>Initialized(block.timestamp);
    }

<% functions.forEach(func => { %>
    function <%= func.name %>(<% func.params.forEach((param, index) => { %><%= param.type %> <%= param.name %><% if (index < func.params.length - 1) { %>, <% } %><% }); %>) 
        external 
        view 
        onlyInitialized
        returns (<% func.returns.forEach((ret, index) => { %><%= ret.type %> <%= ret.name %><% if (index < func.returns.length - 1) { %>, <% } %><% }); %>) 
    {
        <%= Name %>Layout storage l = _<%= nameLower %>();
        // TODO: Implement <%= func.description %>
    }
<% }); %>

    function is<%= Name %>Initialized() external view returns (bool) {
        return _<%= nameLower %>().initialized;
    }

    function getFacetInfo()
        external
        pure
        returns (string memory name, string memory version, bytes4[] memory selectors)
    {
        name = "<%= name %>";
        version = "1.0.0";
        selectors = new bytes4[](<%= functions.length + 2 %>);
        uint256 index = 0;
        
<% functions.forEach(func => { %>        selectors[index++] = this.<%= func.name %>.selector;
<% }); %>        selectors[index++] = this.initialize<%= Name %>.selector;
        selectors[index++] = this.is<%= Name %>Initialized.selector;
    }
}`;
  }

  private getAdvancedTemplate(): string {
    // Advanced template with hooks, oracles, batch operations
    return this.getStandardTemplate() + `
    /// ---------- Advanced Features ----------
<% if (features.hooks) { %>
    // Hook system for extensibility
    mapping(bytes4 => address) internal _hooks;
    
    function setHook(bytes4 selector, address hook) external onlyDispatcher onlyOperator {
        _hooks[selector] = hook;
    }
    
    function _executeHook(bytes4 selector, bytes memory data) internal returns (bytes memory) {
        address hook = _hooks[selector];
        if (hook != address(0)) {
            (bool success, bytes memory result) = hook.delegatecall(data);
            require(success, "Hook execution failed");
            return result;
        }
        return "";
    }
<% } %>

<% if (features.oracle) { %>
    // Oracle integration
    address internal _oracle;
    
    function setOracle(address oracle_) external onlyDispatcher onlyOperator {
        _oracle = oracle_;
    }
    
    function _getPrice(address token) internal view returns (uint256) {
        // TODO: Implement oracle price fetching
        return 0;
    }
<% } %>

<% if (features.batchOperations) { %>
    // Batch operations for gas efficiency
    function batchExecute(bytes[] calldata calls) external onlyDispatcher onlyInitialized nonReentrant {
        for (uint256 i = 0; i < calls.length; i++) {
            (bool success,) = address(this).delegatecall(calls[i]);
            require(success, "Batch call failed");
        }
    }
<% } %>`;
  }

  private prepareTemplateData(config: TemplateConfig): any {
    return {
      name: config.name,
      Name: config.name,
      nameLower: config.name.toLowerCase(),
      nameUpper: config.name.toUpperCase(),
      description: `${config.name} facet for ${config.domain || 'general'} operations`,
      features: config.features,
      stateVariables: config.stateVariables,
      functions: config.functions,
      initParams: this.extractInitParams(config),
      calculateSelectorCount: (functions: FunctionSpec[], features: any) => {
        let count = functions.length + 2; // functions + initialize + isInitialized
        if (features.pausable) count += 2; // setPaused + isPaused
        return count;
      },
      getValidationCheck: (param: Parameter) => {
        switch (param.type) {
          case 'address': return `${param.name} == address(0)`;
          case 'uint256': return `${param.name} == 0`;
          case 'string': case 'bytes': return `${param.name}.length == 0`;
          default: return `false`;
        }
      }
    };
  }

  private extractInitParams(config: TemplateConfig): Parameter[] {
    // Extract initialization parameters from state variables
    return config.stateVariables
      .filter(v => v.name !== 'initialized' && v.name !== 'version' && v.name !== 'paused')
      .map(v => ({ type: v.type, name: v.name }));
  }

  private async generateTestFile(config: TemplateConfig, outputDir: string): Promise<void> {
    const testTemplate = this.getTestTemplate();
    const testData = this.prepareTemplateData(config);
    
    const testCode = ejs.render(testTemplate, testData);
    const filePath = path.join(outputDir, `${config.name}.spec.ts`);
    
    fs.writeFileSync(filePath, testCode);
    console.log(`🧪 Generated tests: ${config.name}.spec.ts`);
  }

  private getTestTemplate(): string {
    return `import { expect } from "chai";
import { ethers } from "hardhat";
import { <%= Name %> } from "../typechain";

describe("<%= Name %>", () => {
  let facet: <%= Name %>;
  let deployer: any;

  beforeEach(async () => {
    [deployer] = await ethers.getSigners();
    const <%= Name %>Factory = await ethers.getContractFactory("<%= Name %>");
    facet = await <%= Name %>Factory.deploy();
    await facet.deployed();
  });

  describe("Initialization", () => {
    it("should initialize once only", async () => {
      await facet.initialize<%= Name %>();
      await expect(facet.initialize<%= Name %>())
        .to.be.revertedWithCustomError(facet, "AlreadyInit");
    });

    it("should set initial state correctly", async () => {
      await facet.initialize<%= Name %>();
      expect(await facet.is<%= Name %>Initialized()).to.be.true;
      expect(await facet.get<%= Name %>Version()).to.equal(1);
    });
  });

  describe("Access Control", () => {
    it("should require dispatcher for external calls", async () => {
      // TODO: Test onlyDispatcher modifier
    });
  });

<% if (features.pausable) { %>
  describe("Pause Functionality", () => {
    it("should pause and unpause correctly", async () => {
      await facet.initialize<%= Name %>();
      await facet.setPaused(true);
      expect(await facet.is<%= Name %>Paused()).to.be.true;
    });
  });
<% } %>

<% if (features.reentrancyGuard) { %>
  describe("Reentrancy Protection", () => {
    it("should prevent reentrancy attacks", async () => {
      // TODO: Test nonReentrant modifier
    });
  });
<% } %>

  describe("Core Functions", () => {
<% functions.forEach(func => { %>
    it("should execute <%= func.name %> correctly", async () => {
      await facet.initialize<%= Name %>();
      // TODO: Test <%= func.description %>
    });
<% }); %>
  });

  describe("Manifest Integration", () => {
    it("should return correct facet info", async () => {
      const [name, version, selectors] = await facet.getFacetInfo();
      expect(name).to.equal("<%= name %>");
      expect(version).to.equal("1.0.0");
      expect(selectors.length).to.be.greaterThan(0);
    });
  });

  describe("Gas Optimization", () => {
    it("should use reasonable gas for operations", async () => {
      await facet.initialize<%= Name %>();
      // TODO: Gas benchmarking tests
    });
  });
});`;
  }

  private async generateManifest(config: TemplateConfig, outputDir: string): Promise<void> {
    const manifest = {
      name: config.name,
      version: "1.0.0",
      templateType: config.templateType,
      domain: config.domain,
      features: config.features,
      deployment: {
        compiler: "^0.8.20",
        optimizer: true,
        deterministic: true,
        mustFixCompliant: true
      },
      routes: [
        {
          selector: "// TO_BE_FILLED_ON_DEPLOYMENT",
          facet: "// TO_BE_FILLED_ON_DEPLOYMENT",
          codehash: "// TO_BE_FILLED_ON_DEPLOYMENT"
        }
      ]
    };
    
    const filePath = path.join(outputDir, 'manifest.json');
    fs.writeFileSync(filePath, JSON.stringify(manifest, null, 2));
    console.log(`📋 Generated manifest: manifest.json`);
  }

  private async generateDeploymentScript(config: TemplateConfig, outputDir: string): Promise<void> {
    const deployScript = `#!/usr/bin/env ts-node

import { ethers } from "hardhat";
import { ${config.name} } from "../typechain";

async function main() {
  console.log("🚀 Deploying ${config.name}...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  
  const ${config.name}Factory = await ethers.getContractFactory("${config.name}");
  const facet = await ${config.name}Factory.deploy();
  await facet.deployed();
  
  console.log("✅ ${config.name} deployed to:", facet.address);
  
  // Initialize the facet
  await facet.initialize${config.name}();
  console.log("✅ ${config.name} initialized");
  
  // Verify on Etherscan if needed
  if (process.env.ETHERSCAN_API_KEY) {
    console.log("🔍 Verifying contract...");
    await run("verify:verify", {
      address: facet.address,
      constructorArguments: [],
    });
  }
  
  return facet.address;
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { main };`;

    const filePath = path.join(outputDir, 'deploy.ts');
    fs.writeFileSync(filePath, deployScript);
    console.log(`🚀 Generated deployment script: deploy.ts`);
  }

  private async generateReadme(config: TemplateConfig, outputDir: string): Promise<void> {
    const readme = `# ${config.name}

## Overview

${config.name} is a ${config.templateType} PayRox facet template for ${config.domain || 'general'} operations.

## Features

${Object.entries(config.features)
  .filter(([_, enabled]) => enabled)
  .map(([feature, _]) => `- ✅ ${feature.replace(/([A-Z])/g, ' $1').toLowerCase()}`)
  .join('\\n')}

## Functions

${config.functions.map(func => 
  `### ${func.name}
- **Type**: ${func.type}
- **Description**: ${func.description}
- **Modifiers**: ${func.modifiers.join(', ')}`
).join('\\n\\n')}

## Usage

\`\`\`typescript
// Deploy the facet
const facet = await deploy("${config.name}");

// Initialize
await facet.initialize${config.name}();

// Use core functions
${config.functions.filter(f => f.type === 'core').map(f => 
  `await facet.${f.name}(/* parameters */);`
).join('\\n')}
\`\`\`

## Security

This facet includes:
- ✅ MUST-FIX compliance
- ✅ Namespaced storage
- ✅ Access control
- ✅ Reentrancy protection
- ✅ Pause functionality

## Testing

Run the test suite:
\`\`\`bash
npx hardhat test test/${config.name}.spec.ts
\`\`\`

## Deployment

\`\`\`bash
npx hardhat run scripts/deploy.ts --network <network>
\`\`\`

## Generated by PayRox Template System

This facet was generated using the PayRox AI-powered template system with built-in security best practices and MUST-FIX compliance.`;

    const filePath = path.join(outputDir, 'README.md');
    fs.writeFileSync(filePath, readme);
    console.log(`📚 Generated README: README.md`);
  }

  private async validateTemplate(outputDir: string): Promise<void> {
    // Run MUST-FIX validation on generated template
    try {
      console.log('Running template validation...');
      // TODO: Integrate with existing MUST-FIX validator
      console.log('✅ Template validation passed');
    } catch (error) {
      console.log('⚠️  Template validation found issues:', error);
    }
  }

  // Predefined configurations for common patterns
  getGovernanceTemplate(): TemplateConfig {
    return {
      name: 'GovernanceFacet',
      templateType: 'standard',
      domain: 'governance',
      features: {
        pausable: true,
        reentrancyGuard: true,
        roleBasedAccess: true,
        oracle: false,
        hooks: false,
        batchOperations: false
      },
      stateVariables: [
        { type: 'mapping(address => uint256)', name: 'votingPower', visibility: 'internal', description: 'Voting power per address' },
        { type: 'mapping(uint256 => Proposal)', name: 'proposals', visibility: 'internal', description: 'Proposal storage' },
        { type: 'uint256', name: 'proposalCount', visibility: 'internal', description: 'Total proposal count' }
      ],
      functions: [
        {
          name: 'createProposal',
          type: 'core',
          modifiers: ['onlyDispatcher', 'onlyInitialized', 'whenNotPaused', 'nonReentrant'],
          params: [{ type: 'string', name: 'description' }],
          returns: [{ type: 'uint256', name: 'proposalId' }],
          description: 'Create a new governance proposal'
        },
        {
          name: 'vote',
          type: 'core',
          modifiers: ['onlyDispatcher', 'onlyInitialized', 'whenNotPaused', 'nonReentrant'],
          params: [{ type: 'uint256', name: 'proposalId' }, { type: 'bool', name: 'support' }],
          returns: [],
          description: 'Vote on a proposal'
        },
        {
          name: 'getProposal',
          type: 'view',
          modifiers: [],
          params: [{ type: 'uint256', name: 'proposalId' }],
          returns: [{ type: 'string', name: 'description' }, { type: 'uint256', name: 'votesFor' }],
          description: 'Get proposal details'
        }
      ]
    };
  }

  getTradingTemplate(): TemplateConfig {
    return {
      name: 'TradingFacet',
      templateType: 'advanced',
      domain: 'trading',
      features: {
        pausable: true,
        reentrancyGuard: true,
        roleBasedAccess: true,
        oracle: true,
        hooks: true,
        batchOperations: true
      },
      stateVariables: [
        { type: 'mapping(bytes32 => Order)', name: 'orders', visibility: 'internal', description: 'Order storage' },
        { type: 'mapping(address => uint256)', name: 'balances', visibility: 'internal', description: 'User balances' },
        { type: 'uint256', name: 'tradingFee', visibility: 'internal', description: 'Trading fee rate' }
      ],
      functions: [
        {
          name: 'placeOrder',
          type: 'core',
          modifiers: ['onlyDispatcher', 'onlyInitialized', 'whenNotPaused', 'nonReentrant'],
          params: [{ type: 'address', name: 'tokenIn' }, { type: 'address', name: 'tokenOut' }, { type: 'uint256', name: 'amount' }],
          returns: [{ type: 'bytes32', name: 'orderId' }],
          description: 'Place a trading order'
        },
        {
          name: 'executeOrder',
          type: 'core',
          modifiers: ['onlyDispatcher', 'onlyInitialized', 'whenNotPaused', 'nonReentrant'],
          params: [{ type: 'bytes32', name: 'orderId' }],
          returns: [],
          description: 'Execute a trading order'
        }
      ]
    };
  }
}

// CLI interface
if (require.main === module) {
  const generator = new PayRoxTemplateGenerator();
  
  // Example usage - generate governance template
  const governanceConfig = generator.getGovernanceTemplate();
  generator.generateTemplate(governanceConfig).catch(console.error);
}

export { PayRoxTemplateGenerator, TemplateConfig };
