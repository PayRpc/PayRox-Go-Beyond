// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

/**
 * @title MockContract
 * @notice Simple contract for Universal AI deployment demonstrations
 * @dev Used by the Universal AI system to demonstrate actual deployments
 */
contract MockContract {
    string public name;
    address public deployer;
    uint256 public deployTime;
    uint256 public version = 1;
    
    event ContractDeployed(
        string indexed contractName, 
        address indexed deployer, 
        uint256 timestamp,
        uint256 version
    );
    
    event UniversalOperation(
        string operation,
        address user,
        uint256 value
    );
    
    constructor() {
        name = "UniversalAIFacet";
        deployer = msg.sender;
        deployTime = block.timestamp;
        
        emit ContractDeployed(name, msg.sender, block.timestamp, version);
    }
    
    /**
     * @notice Set the contract name (for facet customization)
     */
    function setName(string memory _name) external {
        require(msg.sender == deployer, "Only deployer can set name");
        name = _name;
        emit UniversalOperation("setName", msg.sender, 0);
    }
    
    /**
     * @notice Get contract information
     */
    function getInfo() external view returns (string memory, address, uint256, uint256) {
        return (name, deployer, deployTime, version);
    }
    
    /**
     * @notice Universal health check
     */
    function healthCheck() external pure returns (bool) {
        return true;
    }
    
    /**
     * @notice Simulate facet operation
     */
    function universalOperation(string calldata operation, uint256 value) external {
        emit UniversalOperation(operation, msg.sender, value);
    }
    
    /**
     * @notice Get contract version
     */
    function getVersion() external view returns (uint256) {
        return version;
    }
}
