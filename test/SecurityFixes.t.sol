// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "forge-std/Test.sol";
import "../contracts/orchestrator/GovernanceOrchestrator.sol";
import "../contracts/factory/DeterministicChunkFactory.sol";

contract SecurityFixesTest is Test {
    GovernanceOrchestrator governance;
    DeterministicChunkFactory chunkFactory;
    
    address admin = address(0x1);
    address voter1 = address(0x2);
    address voter2 = address(0x3);
    address feeRecipient = address(0x4);
    
    function setUp() public {
        // Deploy contracts
        governance = new GovernanceOrchestrator(admin);
        chunkFactory = new DeterministicChunkFactory(admin, feeRecipient, 1 ether);
        
        // Setup voting power
        vm.startPrank(admin);
        governance.updateVotingPower(voter1, 100);
        governance.updateVotingPower(voter2, 50);
        vm.stopPrank();
    }
    
    function testGovernanceVoteTracking() public {
        // Create a proposal
        bytes32 proposalId = keccak256("test-proposal");
        string memory description = "Test proposal";
        bytes32[] memory targetHashes = new bytes32[](0);
        uint256 votingPeriod = 7 days;
        
        vm.prank(admin);
        governance.createProposal(proposalId, description, targetHashes, votingPeriod);
        
        // Voter1 votes FOR
        vm.prank(voter1);
        governance.castVote(proposalId, true);
        
        // Check vote counts
        (, , , , , uint256 forVotes, uint256 againstVotes, ) = governance.getProposal(proposalId);
        assertEq(forVotes, 100);
        assertEq(againstVotes, 0);
        
        // Voter1 changes vote to AGAINST - this should work without underflow
        vm.prank(voter1);
        governance.castVote(proposalId, false);
        
        // Check vote counts after vote change
        (, , , , , forVotes, againstVotes, ) = governance.getProposal(proposalId);
        assertEq(forVotes, 0);
        assertEq(againstVotes, 100);
        
        // Voter2 votes FOR
        vm.prank(voter2);
        governance.castVote(proposalId, true);
        
        // Final vote counts
        (, , , , , forVotes, againstVotes, ) = governance.getProposal(proposalId);
        assertEq(forVotes, 50);
        assertEq(againstVotes, 100);
    }
    
    function testChunkFactoryFeeRefund() public {
        bytes memory testData = "Hello, PayRox!";
        uint256 fee = 1 ether;
        uint256 overpayment = 0.5 ether;
        uint256 totalSent = fee + overpayment;
        
        // Enable fees
        vm.prank(admin);
        chunkFactory.setFees(fee, true, feeRecipient);
        
        // Give voter1 some ETH
        vm.deal(voter1, 10 ether);
        
        uint256 initialBalance = voter1.balance;
        uint256 initialRecipientBalance = feeRecipient.balance;
        
        // Stage chunk with overpayment
        vm.prank(voter1);
        (address chunk, bytes32 hash) = chunkFactory.stage{value: totalSent}(testData);
        
        // Check that only the fee was sent to recipient and overpayment was refunded
        assertEq(feeRecipient.balance, initialRecipientBalance + fee);
        assertEq(voter1.balance, initialBalance - fee); // Should have received refund
        assertTrue(chunk != address(0));
        assertTrue(hash != bytes32(0));
    }
    
    function testChunkFactoryBatchRefund() public {
        bytes[] memory blobs = new bytes[](2);
        blobs[0] = "First chunk";
        blobs[1] = "Second chunk";
        
        uint256 feePerChunk = 0.5 ether;
        uint256 totalRequiredFee = feePerChunk * 2;
        uint256 overpayment = 0.3 ether;
        uint256 totalSent = totalRequiredFee + overpayment;
        
        // Enable fees
        vm.prank(admin);
        chunkFactory.setFees(feePerChunk, true, feeRecipient);
        
        // Give voter1 some ETH
        vm.deal(voter1, 10 ether);
        
        uint256 initialBalance = voter1.balance;
        uint256 initialRecipientBalance = feeRecipient.balance;
        
        // Stage batch with overpayment
        vm.prank(voter1);
        (address[] memory chunks, bytes32[] memory hashes) = chunkFactory.stageBatch{value: totalSent}(blobs);
        
        // Check that only the required fees were sent and overpayment was refunded
        assertEq(feeRecipient.balance, initialRecipientBalance + totalRequiredFee);
        assertEq(voter1.balance, initialBalance - totalRequiredFee); // Should have received refund
        assertEq(chunks.length, 2);
        assertEq(hashes.length, 2);
    }
}
