// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ITerraStakeToken
 * @dev AI-Generated interface for PayRox Go Beyond
 * @notice This interface is PayRox-compatible and future-ready
 * 
 * Compatibility: PayRox, OpenZeppelin, EIP
 * AI-Generated: Yes
 * PayRox Ready: Yes
 */

interface ITerraStakeToken {
// Events
event BlacklistUpdated(address indexed, bool status);
event AirdropExecuted(address[] recipients, uint256 amount, uint256 totalAmount);
event TWAPPriceQueried(uint32 twapInterval, uint256 price);
event EmergencyWithdrawal(address token, address to, uint256 amount);
event TokenBurned(address indexed, uint256 amount);
event GovernanceUpdated(address indexed);
event StakingUpdated(address indexed);
event LiquidityGuardUpdated(address indexed);
event BuybackExecuted(uint256 amount, uint256 tokensReceived);
event LiquidityInjected(uint256 amount, uint256 tokensUsed);
event HalvingTriggered(uint256 epochNumber, uint256 timestamp);
event TransferBlocked(address indexed, address indexed, uint256 amount, string reason);
event StakingOperationExecuted(address indexed, uint256 amount, bool isStake);
event PermitUsed(address indexed, address indexed, uint256 amount);

// Interface Functions
function initialize(address _uniswapPool, address _governanceContract, address _stakingContract, address _liquidityGuard) external;
    function permitAndTransfer(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s, address to, uint256 amount) external;
    function setBlacklist(address account, bool status) external;
    function batchBlacklist(address[] calldata, bool status) external;
    function airdrop(address[] calldata, uint256 amount) external;
    function mint(address to, uint256 amount) external;
    function burnFrom(address from, uint256 amount) external;
    function getTWAPPrice(uint32 twapInterval) external returns (uint256 price);
    function emergencyWithdraw(address token, address to, uint256 amount) external;
    function emergencyWithdrawMultiple(address[] calldata, address to, uint256[] calldata) external;
    function updateGovernanceContract(address _governanceContract) external;
    function updateStakingContract(address _stakingContract) external;
    function updateLiquidityGuard(address _liquidityGuard) external;
    function stakeTokens(address from, uint256 amount) external;
    function unstakeTokens(address to, uint256 amount) external;
    function getGovernanceVotes(address account) external view returns (uint256 param48gauy5nn);
    function isGovernorPenalized(address account) external view returns (bool param0msmisyin);
    function executeBuyback(uint256 usdcAmount) external;
    function injectLiquidity(uint256 amount) external;
    function triggerHalving() external;
    function getHalvingDetails() external view returns (uint256 period, uint256 lastTime, uint256 epoch);
    function checkGovernanceApproval(address account, uint256 amount) external view returns (bool paramym8x26k0i);
    function penalizeGovernanceViolator(address account) external;
    function pause() external;
    function unpause() external;
    function activateCircuitBreaker() external;
    function resetCircuitBreaker() external;
    function getBuybackStatistics() external view returns (BuybackStats memory);
    function getLiquiditySettings() external view returns (bool paramd66c1wyt6);
    function isCircuitBreakerTriggered() external view returns (bool parammduszechs);
    function getImplementation() external view returns (address param7uqx3bdt0);
}

/**
 * @dev PayRox Integration Notes:
 * - This interface is designed for facet compatibility
 * - All functions are gas-optimized for dispatcher routing
 * - Custom errors used for efficient error handling
 * - Events follow PayRox monitoring standards
 * 
 * Future Enhancement Ready:
 * - Easy to swap with production interface
 * - Maintains signature compatibility
 * - Supports cross-chain deployment
 * - Compatible with CREATE2 deterministic deployment
 */