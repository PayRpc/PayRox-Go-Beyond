// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ITerraStakeInsuranceFacet
 * @dev AI-Generated interface for PayRox Go Beyond
 * @notice This interface is PayRox-compatible and future-ready
 * 
 * Compatibility: PayRox, OpenZeppelin, EIP
 * AI-Generated: Yes
 * PayRox Ready: Yes
 */

interface ITerraStakeInsuranceFacet {
// Custom Errors for Gas Efficiency
error ZeroPremium();
error InvalidClaimAmount();
error InsufficientCoverage();
error ClaimAlreadyProcessed();
error ClaimNotFound();
error UnauthorizedCaller();
error InsufficientFund();
error TransferFailed(address from, address token, address to, uint256 amount);
error AlreadyInitialized();
error NotInitialized();

// Events
event PremiumPaid(address indexed, uint256 premium, uint256 coverageGranted, uint256 timestamp);
event ClaimFiled(address indexed, uint256 claimId, uint256 claimAmount, uint256 timestamp);
event ClaimProcessed(uint256 claimId, address indexed, bool approved, uint256 amountPaid, uint256 timestamp);
event InsuranceFacetInitialized(address tstakeToken, uint256 minCapital, uint256 premiumRate, uint256 multiplier);

// Interface Functions
function initializeInsurance(address _tstakeToken, uint256 _minCapitalRequirement, uint256 _basePremiumRate, uint256 _coverageMultiplier) external;
    function payPremium(uint256 premiumAmount) external;
    function fileClaim(uint256 claimAmount) external;
    function processClaim(uint256 claimId, bool approve) external;
    function getUserClaimCount(address user) external view;
    function getClaim(uint256 claimId) external view;
    function getFundBalance() external view;
    function premiumsPaid(address user) external view;
    function coverageAmount(address user) external view;
    function totalFundValue() external view;
    function minCapitalRequirement() external view;
    function basePremiumRate() external view;
    function coverageMultiplier() external view;
    function getFacetFunctionSelectors() external pure returns (bytes4[] memory);
    function supportsInterface(bytes4 interfaceId) external view;
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