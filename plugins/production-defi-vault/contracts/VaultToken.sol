// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title production-defi-vault Vault Token
 * @notice ERC20 token representing shares in the DeFi vault
 * @dev Built with PayRox Go Beyond infrastructure
 */
contract VaultToken is ERC20, Ownable, ReentrancyGuard {
    
    /* ───────────────────────── State Variables ───────────────────────── */
    
    IERC20 public immutable underlyingToken;
    uint256 public totalDeposits;
    uint256 public totalRewards;
    
    mapping(address => uint256) public lastDepositTime;
    mapping(address => uint256) public userRewards;
    
    uint256 public constant LOCK_PERIOD = 7 days;
    uint256 public constant MAX_SUPPLY = 1000000 * 1e18;
    
    /* ───────────────────────── Events ───────────────────────── */
    
    event Deposit(address indexed user, uint256 amount, uint256 shares);
    event Withdraw(address indexed user, uint256 shares, uint256 amount);
    event RewardDistributed(uint256 amount);
    event RewardClaimed(address indexed user, uint256 amount);
    
    /* ───────────────────────── Errors ───────────────────────── */
    
    error InsufficientBalance();
    error InsufficientShares();
    error StillLocked();
    error ZeroAmount();
    error MaxSupplyExceeded();
    
    /* ───────────────────────── Constructor ───────────────────────── */
    
    constructor(
        string memory name,
        string memory symbol,
        address _underlyingToken
    ) ERC20(name, symbol) Ownable(msg.sender) {
        require(_underlyingToken != address(0), "Invalid token address");
        underlyingToken = IERC20(_underlyingToken);
    }
    
    /* ───────────────────────── Deposit Functions ───────────────────────── */
    
    /**
     * @notice Deposit underlying tokens to receive vault shares
     * @param amount Amount of underlying tokens to deposit
     * @return shares Number of vault shares minted
     */
    function deposit(uint256 amount) external nonReentrant returns (uint256 shares) {
        if (amount == 0) revert ZeroAmount();
        
        // Calculate shares to mint
        shares = totalSupply() == 0 ? amount : (amount * totalSupply()) / totalDeposits;
        
        if (totalSupply() + shares > MAX_SUPPLY) revert MaxSupplyExceeded();
        
        // Transfer tokens from user
        underlyingToken.transferFrom(msg.sender, address(this), amount);
        
        // Update state
        totalDeposits += amount;
        lastDepositTime[msg.sender] = block.timestamp;
        
        // Mint shares
        _mint(msg.sender, shares);
        
        emit Deposit(msg.sender, amount, shares);
    }
    
    /**
     * @notice Withdraw underlying tokens by burning vault shares
     * @param shares Number of shares to burn
     * @return amount Amount of underlying tokens returned
     */
    function withdraw(uint256 shares) external nonReentrant returns (uint256 amount) {
        if (shares == 0) revert ZeroAmount();
        if (balanceOf(msg.sender) < shares) revert InsufficientShares();
        if (block.timestamp < lastDepositTime[msg.sender] + LOCK_PERIOD) revert StillLocked();
        
        // Calculate amount to return
        amount = (shares * totalDeposits) / totalSupply();
        
        if (underlyingToken.balanceOf(address(this)) < amount) revert InsufficientBalance();
        
        // Update state
        totalDeposits -= amount;
        
        // Burn shares
        _burn(msg.sender, shares);
        
        // Transfer tokens to user
        underlyingToken.transfer(msg.sender, amount);
        
        emit Withdraw(msg.sender, shares, amount);
    }
    
    /* ───────────────────────── Reward Functions ───────────────────────── */
    
    /**
     * @notice Distribute rewards to all vault participants
     * @param rewardAmount Amount of rewards to distribute
     */
    function distributeRewards(uint256 rewardAmount) external onlyOwner {
        if (rewardAmount == 0) revert ZeroAmount();
        if (totalSupply() == 0) return;
        
        // Transfer reward tokens to vault
        underlyingToken.transferFrom(msg.sender, address(this), rewardAmount);
        
        totalRewards += rewardAmount;
        
        emit RewardDistributed(rewardAmount);
    }
    
    /**
     * @notice Calculate pending rewards for a user
     * @param user User address
     * @return pending Pending reward amount
     */
    function pendingRewards(address user) external view returns (uint256 pending) {
        if (totalSupply() == 0) return 0;
        
        uint256 userShare = balanceOf(user);
        uint256 totalRewardShare = (userShare * totalRewards) / totalSupply();
        pending = totalRewardShare - userRewards[user];
    }
    
    /**
     * @notice Claim pending rewards
     */
    function claimRewards() external nonReentrant {
        uint256 pending = this.pendingRewards(msg.sender);
        if (pending == 0) revert ZeroAmount();
        
        userRewards[msg.sender] += pending;
        
        underlyingToken.transfer(msg.sender, pending);
        
        emit RewardClaimed(msg.sender, pending);
    }
    
    /* ───────────────────────── View Functions ───────────────────────── */
    
    /**
     * @notice Get vault information
     */
    function getVaultInfo() external view returns (
        uint256 _totalDeposits,
        uint256 _totalRewards,
        uint256 _totalShares,
        uint256 _sharePrice
    ) {
        _totalDeposits = totalDeposits;
        _totalRewards = totalRewards;
        _totalShares = totalSupply();
        _sharePrice = _totalShares == 0 ? 1e18 : (_totalDeposits * 1e18) / _totalShares;
    }
    
    /**
     * @notice Get user information
     * @param user User address
     */
    function getUserInfo(address user) external view returns (
        uint256 shares,
        uint256 underlyingAmount,
        uint256 pendingReward,
        uint256 lockTime
    ) {
        shares = balanceOf(user);
        underlyingAmount = totalSupply() == 0 ? 0 : (shares * totalDeposits) / totalSupply();
        pendingReward = this.pendingRewards(user);
        lockTime = lastDepositTime[user] + LOCK_PERIOD;
    }
    
    /* ───────────────────────── Emergency Functions ───────────────────────── */
    
    /**
     * @notice Emergency withdraw (owner only)
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = underlyingToken.balanceOf(address(this));
        underlyingToken.transfer(owner(), balance);
    }
}
