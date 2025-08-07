// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title LiveDemoContract - PayRox AI Splitting Target
 * @notice Large contract for demonstrating real-time AI analysis
 * @dev Will be split into optimized Diamond facets by PayRox AI
 */
contract LiveDemoContract {
    // State variables (AI will analyze storage patterns)
    mapping(address => uint256) public balances;
    mapping(address => mapping(address => uint256)) public allowances;
    mapping(address => uint256) public stakingBalances;
    mapping(address => uint256) public votingPower;
    mapping(uint256 => Proposal) public proposals;
    
    address public owner;
    uint256 public totalSupply;
    uint256 public stakingRewardRate;
    uint256 public proposalCount;
    bool public paused;
    
    struct Proposal {
        string description;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 deadline;
        bool executed;
    }
    
    // Events (AI will group by functional domain)
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event ProposalCreated(uint256 indexed id, string description);
    event VoteCast(address indexed voter, uint256 indexed proposalId, bool support);
    event RewardsDistributed(address indexed user, uint256 amount);
    event EmergencyPause(bool status);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    modifier whenNotPaused() {
        require(!paused, "Contract paused");
        _;
    }
    
    constructor() {
        owner = msg.sender;
        totalSupply = 1000000 * 10**18;
        balances[msg.sender] = totalSupply;
        stakingRewardRate = 500; // 5%
    }
    
    // TOKEN FUNCTIONS (AI will identify as TokenFacet)
    function transfer(address to, uint256 amount) external whenNotPaused returns (bool) {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        balances[msg.sender] -= amount;
        balances[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }
    
    function approve(address spender, uint256 amount) external returns (bool) {
        allowances[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }
    
    function transferFrom(address from, address to, uint256 amount) external whenNotPaused returns (bool) {
        require(allowances[from][msg.sender] >= amount, "Insufficient allowance");
        require(balances[from] >= amount, "Insufficient balance");
        
        allowances[from][msg.sender] -= amount;
        balances[from] -= amount;
        balances[to] += amount;
        
        emit Transfer(from, to, amount);
        return true;
    }
    
    function mint(address to, uint256 amount) external onlyOwner {
        totalSupply += amount;
        balances[to] += amount;
        emit Transfer(address(0), to, amount);
    }
    
    function burn(uint256 amount) external {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        balances[msg.sender] -= amount;
        totalSupply -= amount;
        emit Transfer(msg.sender, address(0), amount);
    }
    
    // STAKING FUNCTIONS (AI will identify as StakingFacet)
    function stake(uint256 amount) external whenNotPaused {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        balances[msg.sender] -= amount;
        stakingBalances[msg.sender] += amount;
        votingPower[msg.sender] += amount;
        emit Staked(msg.sender, amount);
    }
    
    function unstake(uint256 amount) external whenNotPaused {
        require(stakingBalances[msg.sender] >= amount, "Insufficient staked");
        stakingBalances[msg.sender] -= amount;
        votingPower[msg.sender] -= amount;
        balances[msg.sender] += amount;
        emit Unstaked(msg.sender, amount);
    }
    
    function calculateRewards(address user) public view returns (uint256) {
        return stakingBalances[user] * stakingRewardRate / 10000;
    }
    
    function claimRewards() external whenNotPaused {
        uint256 rewards = calculateRewards(msg.sender);
        require(rewards > 0, "No rewards");
        balances[msg.sender] += rewards;
        totalSupply += rewards;
        emit RewardsDistributed(msg.sender, rewards);
    }
    
    function updateRewardRate(uint256 newRate) external onlyOwner {
        stakingRewardRate = newRate;
    }
    
    // GOVERNANCE FUNCTIONS (AI will identify as GovernanceFacet)
    function createProposal(string memory description) external returns (uint256) {
        require(votingPower[msg.sender] > 0, "No voting power");
        uint256 proposalId = proposalCount++;
        proposals[proposalId] = Proposal({
            description: description,
            forVotes: 0,
            againstVotes: 0,
            deadline: block.timestamp + 7 days,
            executed: false
        });
        emit ProposalCreated(proposalId, description);
        return proposalId;
    }
    
    function vote(uint256 proposalId, bool support) external {
        require(votingPower[msg.sender] > 0, "No voting power");
        require(block.timestamp < proposals[proposalId].deadline, "Voting ended");
        
        if (support) {
            proposals[proposalId].forVotes += votingPower[msg.sender];
        } else {
            proposals[proposalId].againstVotes += votingPower[msg.sender];
        }
        
        emit VoteCast(msg.sender, proposalId, support);
    }
    
    function executeProposal(uint256 proposalId) external {
        require(block.timestamp >= proposals[proposalId].deadline, "Voting not ended");
        require(!proposals[proposalId].executed, "Already executed");
        require(proposals[proposalId].forVotes > proposals[proposalId].againstVotes, "Proposal failed");
        
        proposals[proposalId].executed = true;
        // Execution logic would go here
    }
    
    function getProposal(uint256 proposalId) external view returns (
        string memory description,
        uint256 forVotes,
        uint256 againstVotes,
        uint256 deadline,
        bool executed
    ) {
        Proposal memory prop = proposals[proposalId];
        return (prop.description, prop.forVotes, prop.againstVotes, prop.deadline, prop.executed);
    }
    
    // ADMIN FUNCTIONS (AI will identify as AdminFacet)
    function pause() external onlyOwner {
        paused = true;
        emit EmergencyPause(true);
    }
    
    function unpause() external onlyOwner {
        paused = false;
        emit EmergencyPause(false);
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }
    
    function emergencyWithdraw() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
    
    function batchTransfer(address[] calldata recipients, uint256[] calldata amounts) external onlyOwner {
        require(recipients.length == amounts.length, "Array mismatch");
        for (uint i = 0; i < recipients.length; i++) {
            require(balances[msg.sender] >= amounts[i], "Insufficient balance");
            balances[msg.sender] -= amounts[i];
            balances[recipients[i]] += amounts[i];
            emit Transfer(msg.sender, recipients[i], amounts[i]);
        }
    }
    
    // VIEW FUNCTIONS (AI will identify as ViewFacet)
    function balanceOf(address account) external view returns (uint256) {
        return balances[account];
    }
    
    function allowance(address owner, address spender) external view returns (uint256) {
        return allowances[owner][spender];
    }
    
    function stakingBalanceOf(address account) external view returns (uint256) {
        return stakingBalances[account];
    }
    
    function votingPowerOf(address account) external view returns (uint256) {
        return votingPower[account];
    }
    
    function getTotalSupply() external view returns (uint256) {
        return totalSupply;
    }
    
    function getRewardRate() external view returns (uint256) {
        return stakingRewardRate;
    }
    
    function getProposalCount() external view returns (uint256) {
        return proposalCount;
    }
    
    function isPaused() external view returns (bool) {
        return paused;
    }
    
    function getOwner() external view returns (address) {
        return owner;
    }
    
    // Receive function
    receive() external payable {}
}