// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.28;

interface ITerraStakeLiquidityGuard {
    function verifyTWAPForWithdrawal() external returns (bool);
    function injectLiquidity(uint256 amount) external;
    function getLiquidityPool() external view returns (address);
    function getLiquiditySettings() external view returns (bool);
    function isCircuitBreakerTriggered() external view returns (bool);
    function triggerCircuitBreaker() external;
    function resetCircuitBreaker() external;
}
