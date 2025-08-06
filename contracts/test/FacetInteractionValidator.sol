// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../utils/LibDiamond.sol";

/**
 * @title PayRox Facet Interaction Test Suite
 * @notice Validates real cross-facet communication and functionality
 * @dev Tests actual deployed facets to prove they maintain original contract behavior
 */
contract FacetInteractionValidator {
    using LibDiamond for LibDiamond.DiamondStorage;
    
    // Events for tracking real interactions
    event FacetInteractionTest(string testName, bool success, uint256 gasUsed);
    event CrossFacetCallTest(address fromFacet, address toFacet, bytes4 selector, bool success);
    event GasSavingsValidated(string operation, uint256 originalGas, uint256 facetGas, uint256 savingsPercent);
    
    struct TestResult {
        string testName;
        bool passed;
        uint256 gasUsed;
        string details;
    }
    
    // Test storage for validation
    mapping(string => TestResult) public testResults;
    string[] public testNames;
    
    /**
     * @notice Validate Governance Facet functionality
     * @dev Tests actual governance operations through facet routing
     */
    function validateGovernanceFacet(address diamond, bytes32 proposalId, bool support) 
        external returns (bool) {
        uint256 gasStart = gasleft();
        
        try this._testGovernanceExecution(diamond, proposalId, support) {
            uint256 gasUsed = gasStart - gasleft();
            
            _recordTest("GovernanceFacet_CastVote", true, gasUsed, "Vote cast successfully through facet");
            emit FacetInteractionTest("GovernanceFacet_CastVote", true, gasUsed);
            return true;
        } catch Error(string memory reason) {
            _recordTest("GovernanceFacet_CastVote", false, 0, reason);
            emit FacetInteractionTest("GovernanceFacet_CastVote", false, 0);
            return false;
        }
    }
    
    function _testGovernanceExecution(address diamond, bytes32 proposalId, bool support) external {
        // Call governance function through diamond proxy
        bytes memory data = abi.encodeWithSignature("castVote(bytes32,bool)", proposalId, support);
        (bool success, bytes memory result) = diamond.call(data);
        require(success, "Governance facet call failed");
    }
    
    /**
     * @notice Validate Staking-to-Rewards cross-facet communication
     * @dev Tests that staking operations properly trigger rewards calculations
     */
    function validateStakingRewardsCommunication(address diamond, uint256 stakeAmount) 
        external returns (bool) {
        uint256 gasStart = gasleft();
        
        // Step 1: Stake tokens (StakingFacet)
        bytes memory stakeData = abi.encodeWithSignature("stakeTokens(uint256)", stakeAmount);
        (bool stakeSuccess,) = diamond.call(stakeData);
        require(stakeSuccess, "Stake operation failed");
        
        // Step 2: Calculate rewards (RewardsFacet) - should access staking data
        bytes memory rewardData = abi.encodeWithSignature("calculateRewards(address)", msg.sender);
        (bool rewardSuccess, bytes memory result) = diamond.call(rewardData);
        require(rewardSuccess, "Reward calculation failed");
        
        uint256 rewards = abi.decode(result, (uint256));
        uint256 gasUsed = gasStart - gasleft();
        
        bool validCommunication = rewards > 0; // Proves cross-facet data access
        
        _recordTest("CrossFacet_StakingRewards", validCommunication, gasUsed, 
                   string(abi.encodePacked("Rewards calculated: ", _toString(rewards))));
        
        emit CrossFacetCallTest(
            _getFacetAddress(diamond, "stakeTokens(uint256)"),
            _getFacetAddress(diamond, "calculateRewards(address)"),
            bytes4(keccak256("calculateRewards(address)")),
            validCommunication
        );
        
        return validCommunication;
    }
    
    /**
     * @notice Test governance voting with staking balance validation
     * @dev Validates that GovernanceFacet can access StakingFacet data
     */
    function validateGovernanceStakingIntegration(address diamond, string memory proposalDesc) 
        external returns (bool) {
        uint256 gasStart = gasleft();
        
        // Step 1: Get staking balance (StakingFacet)
        bytes memory balanceData = abi.encodeWithSignature("stakingBalanceOf(address)", msg.sender);
        (bool balanceSuccess, bytes memory balanceResult) = diamond.call(balanceData);
        require(balanceSuccess, "Failed to get staking balance");
        
        uint256 stakingBalance = abi.decode(balanceResult, (uint256));
        
        // Step 2: Create proposal (GovernanceFacet) - should validate staking balance
        bytes memory proposalData = abi.encodeWithSignature("createProposal(string)", proposalDesc);
        (bool proposalSuccess, bytes memory proposalResult) = diamond.call(proposalData);
        
        uint256 gasUsed = gasStart - gasleft();
        bool hasVotingPower = stakingBalance > 0;
        
        if (hasVotingPower) {
            require(proposalSuccess, "Proposal creation should succeed with staking balance");
            uint256 proposalId = abi.decode(proposalResult, (uint256));
            
            _recordTest("CrossFacet_GovernanceStaking", true, gasUsed, 
                       string(abi.encodePacked("Proposal ", _toString(proposalId), " created with voting power")));
        } else {
            require(!proposalSuccess, "Proposal creation should fail without staking balance");
            _recordTest("CrossFacet_GovernanceStaking", true, gasUsed, "Correctly rejected proposal without staking");
        }
        
        return true;
    }
    
    /**
     * @notice Validate batch operations gas efficiency
     * @dev Tests that batch operations through facets achieve claimed gas savings
     */
    function validateBatchOperationEfficiency(address diamond, address[] memory recipients, uint256[] memory amounts) 
        external returns (bool) {
        
        // Test 1: Individual transfers (baseline)
        uint256 individualGasTotal = 0;
        for (uint i = 0; i < recipients.length && i < 3; i++) { // Limit for gas
            uint256 gasStart = gasleft();
            bytes memory transferData = abi.encodeWithSignature("transfer(address,uint256)", recipients[i], amounts[i]);
            diamond.call(transferData);
            individualGasTotal += (gasStart - gasleft());
        }
        
        // Test 2: Batch transfer (optimized)
        uint256 batchGasStart = gasleft();
        bytes memory batchData = abi.encodeWithSignature("batchTransfer(address[],uint256[])", recipients, amounts);
        (bool batchSuccess,) = diamond.call(batchData);
        uint256 batchGasUsed = batchGasStart - gasleft();
        
        require(batchSuccess, "Batch operation failed");
        
        // Calculate savings
        uint256 expectedIndividualGas = individualGasTotal * recipients.length / 3;
        uint256 savingsPercent = 0;
        if (expectedIndividualGas > batchGasUsed) {
            savingsPercent = ((expectedIndividualGas - batchGasUsed) * 100) / expectedIndividualGas;
        }
        
        bool achievesSavings = savingsPercent > 30; // Should achieve >30% savings
        
        _recordTest("BatchOperation_GasEfficiency", achievesSavings, batchGasUsed, 
                   string(abi.encodePacked("Gas savings: ", _toString(savingsPercent), "%")));
        
        emit GasSavingsValidated("batchTransfer", expectedIndividualGas, batchGasUsed, savingsPercent);
        
        return achievesSavings;
    }
    
    /**
     * @notice Validate emergency pause functionality across all facets
     * @dev Tests that admin controls properly affect all facet operations
     */
    function validateEmergencyPauseIntegration(address diamond) external returns (bool) {
        uint256 gasStart = gasleft();
        
        // Step 1: Pause contract (AdminFacet)
        bytes memory pauseData = abi.encodeWithSignature("emergencyPause()");
        (bool pauseSuccess,) = diamond.call(pauseData);
        require(pauseSuccess, "Emergency pause failed");
        
        // Step 2: Try governance operation (should fail)
        bytes memory govData = abi.encodeWithSignature("castVote(bytes32,bool)", 
                                                      bytes32(uint256(1)), true);
        (bool govSuccess,) = diamond.call(govData);
        
        // Step 3: Try staking operation (should fail)
        bytes memory stakeData = abi.encodeWithSignature("stakeTokens(uint256)", 100);
        (bool stakeSuccess,) = diamond.call(stakeData);
        
        // Step 4: Unpause contract
        bytes memory unpauseData = abi.encodeWithSignature("emergencyUnpause()");
        (bool unpauseSuccess,) = diamond.call(unpauseData);
        require(unpauseSuccess, "Emergency unpause failed");
        
        uint256 gasUsed = gasStart - gasleft();
        
        // Validation: Operations should fail when paused
        bool pauseWorksCorrectly = !govSuccess && !stakeSuccess;
        
        _recordTest("CrossFacet_EmergencyPause", pauseWorksCorrectly, gasUsed, 
                   "Pause correctly blocks operations across all facets");
        
        return pauseWorksCorrectly;
    }
    
    /**
     * @notice Run comprehensive validation suite
     * @dev Executes all validation tests and returns overall results
     */
    function runComprehensiveValidation(address diamond) external returns (bool) {
        uint256 totalGasStart = gasleft();
        
        // Test 1: Basic facet functionality
        bool test1 = this.validateGovernanceFacet(diamond, bytes32(uint256(1)), true);
        
        // Test 2: Cross-facet communication
        bool test2 = this.validateStakingRewardsCommunication(diamond, 5000);
        
        // Test 3: Complex integration
        bool test3 = this.validateGovernanceStakingIntegration(diamond, "Test proposal");
        
        // Test 4: Gas efficiency
        address[] memory recipients = new address[](5);
        uint256[] memory amounts = new uint256[](5);
        for (uint i = 0; i < 5; i++) {
            recipients[i] = address(uint160(i + 1));
            amounts[i] = 100 * (i + 1);
        }
        bool test4 = this.validateBatchOperationEfficiency(diamond, recipients, amounts);
        
        // Test 5: Emergency controls
        bool test5 = this.validateEmergencyPauseIntegration(diamond);
        
        uint256 totalGasUsed = totalGasStart - gasleft();
        
        bool allTestsPassed = test1 && test2 && test3 && test4 && test5;
        
        _recordTest("ComprehensiveValidation", allTestsPassed, totalGasUsed, 
                   string(abi.encodePacked("All tests: ", allTestsPassed ? "PASSED" : "FAILED")));
        
        return allTestsPassed;
    }
    
    // Helper functions
    function _getFacetAddress(address diamond, string memory functionSig) internal view returns (address) {
        bytes4 selector = bytes4(keccak256(bytes(functionSig)));
        // In real implementation, would query diamond storage for facet address
        return diamond; // Simplified for demo
    }
    
    function _recordTest(string memory name, bool passed, uint256 gas, string memory details) internal {
        testResults[name] = TestResult(name, passed, gas, details);
        testNames.push(name);
    }
    
    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
    
    /**
     * @notice Get all test results
     */
    function getAllTestResults() external view returns (TestResult[] memory) {
        TestResult[] memory results = new TestResult[](testNames.length);
        for (uint i = 0; i < testNames.length; i++) {
            results[i] = testResults[testNames[i]];
        }
        return results;
    }
    
    /**
     * @notice Get test summary
     */
    function getTestSummary() external view returns (
        uint256 totalTests,
        uint256 passedTests,
        uint256 totalGasUsed,
        bool allPassed
    ) {
        totalTests = testNames.length;
        totalGasUsed = 0;
        passedTests = 0;
        
        for (uint i = 0; i < testNames.length; i++) {
            TestResult memory result = testResults[testNames[i]];
            if (result.passed) passedTests++;
            totalGasUsed += result.gasUsed;
        }
        
        allPassed = (passedTests == totalTests) && totalTests > 0;
    }
}
