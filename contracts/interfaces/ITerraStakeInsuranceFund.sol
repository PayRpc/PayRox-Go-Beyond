// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.28;

/**
 * @title ITerraStakeInsuranceFund
 * @notice Interface for the TerraStake Insurance Fund contract
 */
interface ITerraStakeInsuranceFund {
    // ============================
    // Structs
    // ============================
    struct Claim {
        address claimant;
        uint256 amount;
        uint256 timestamp;
        bool processed;
        bool approved;
    }

    // ============================
    // Events
    // ============================
    event PremiumPaid(address indexed user, uint256 premium, uint256 coverageGranted, uint256 timestamp);
    event ClaimFiled(address indexed user, uint256 claimId, uint256 claimAmount, uint256 timestamp);
    event ClaimProcessed(uint256 claimId, address indexed claimant, bool approved, uint256 amountPaid, uint256 timestamp);

    // ============================
    // Premium & Coverage Functions
    // ============================
    function payPremium(uint256 premiumAmount) external;

    // ============================
    // Claims Functions
    // ============================
    function fileClaim(uint256 claimAmount) external returns (uint256 claimId);
    function processClaim(uint256 claimId, bool approve) external;

    // ============================
    // View Functions
    // ============================
    function getUserClaimCount(address user) external view returns (uint256);
    function getClaim(uint256 claimId) external view returns (Claim memory);
    function getFundBalance() external view returns (uint256);
    function premiumsPaid(address user) external view returns (uint256);
    function coverageAmount(address user) external view returns (uint256);
    function totalFundValue() external view returns (uint256);
    function minCapitalRequirement() external view returns (uint256);
    function basePremiumRate() external view returns (uint256);
    function coverageMultiplier() external view returns (uint256);
}
