// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/ITerraStakeInsuranceFund.sol";

/**
 * @title TerraStakeInsuranceFacet
 * @notice Diamond facet for TerraStake insurance fund functionality
 * @dev Integrates with the TerraStake ecosystem through the Diamond proxy pattern
 */
contract TerraStakeInsuranceFacet is AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // ============================
    // Storage Slot for Diamond Pattern
    // ============================
    bytes32 internal constant _INSURANCE_STORAGE_SLOT = keccak256("payrox.terrastake.insurance.v1");

    struct InsuranceStorage {
        // TSTAKE token contract reference
        IERC20 tstakeToken;
        
        // Premiums paid (in TSTAKE tokens) by each participant
        mapping(address => uint256) premiumsPaid;
        
        // Coverage available for each user
        mapping(address => uint256) coverageAmount;
        
        // Total fund value held (in TSTAKE tokens)
        uint256 totalFundValue;
        
        // Minimum capital requirement for fund stability
        uint256 minCapitalRequirement;
        
        // Base premium rate (expressed in basis points)
        uint256 basePremiumRate;
        
        // Coverage multiplier
        uint256 coverageMultiplier;
        
        // Claims data
        ITerraStakeInsuranceFund.Claim[] claims;
        mapping(address => uint256[]) userClaimIds;
        
        // Initialization flag
        bool initialized;
    }

    // ============================
    // Roles
    // ============================
    bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");
    bytes32 public constant FUND_MANAGER_ROLE = keccak256("FUND_MANAGER_ROLE");
    bytes32 public constant INSURANCE_ADMIN_ROLE = keccak256("INSURANCE_ADMIN_ROLE");

    // ============================
    // Custom Errors
    // ============================
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

    // ============================
    // Events
    // ============================
    event PremiumPaid(address indexed user, uint256 premium, uint256 coverageGranted, uint256 timestamp);
    event ClaimFiled(address indexed user, uint256 claimId, uint256 claimAmount, uint256 timestamp);
    event ClaimProcessed(uint256 claimId, address indexed claimant, bool approved, uint256 amountPaid, uint256 timestamp);
    event InsuranceFacetInitialized(address tstakeToken, uint256 minCapital, uint256 premiumRate, uint256 multiplier);

    // ============================
    // Modifiers
    // ============================
    modifier onlyInitialized() {
        if (!_getInsuranceStorage().initialized) revert NotInitialized();
        _;
    }

    // ============================
    // Diamond Storage Pattern
    // ============================
    function _getInsuranceStorage() private pure returns (InsuranceStorage storage $) {
        bytes32 slot = _INSURANCE_STORAGE_SLOT;
        assembly {
            $.slot := slot
        }
    }

    // ============================
    // Initialization Function
    // ============================
    function initializeInsurance(
        address _tstakeToken,
        uint256 _minCapitalRequirement,
        uint256 _basePremiumRate,
        uint256 _coverageMultiplier
    ) external {
        InsuranceStorage storage $ = _getInsuranceStorage();
        if ($.initialized) revert AlreadyInitialized();
        if (_tstakeToken == address(0)) revert TransferFailed(address(0), _tstakeToken, address(0), 0);

        $.tstakeToken = IERC20(_tstakeToken);
        $.minCapitalRequirement = _minCapitalRequirement;
        $.basePremiumRate = _basePremiumRate;
        $.coverageMultiplier = _coverageMultiplier;
        $.totalFundValue = 0;
        $.initialized = true;

        // Setup initial roles - inherit from main contract's access control
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(GOVERNANCE_ROLE, msg.sender);
        _grantRole(FUND_MANAGER_ROLE, msg.sender);
        _grantRole(INSURANCE_ADMIN_ROLE, msg.sender);

        emit InsuranceFacetInitialized(_tstakeToken, _minCapitalRequirement, _basePremiumRate, _coverageMultiplier);
    }

    // ============================
    // Premium & Coverage Functions
    // ============================
    function payPremium(uint256 premiumAmount) external nonReentrant whenNotPaused onlyInitialized {
        if (premiumAmount == 0) revert ZeroPremium();
        InsuranceStorage storage $ = _getInsuranceStorage();

        // Transfer the TSTAKE tokens from the user to the contract
        $.tstakeToken.safeTransferFrom(msg.sender, address(this), premiumAmount);

        // Update user and global fund records
        $.premiumsPaid[msg.sender] += premiumAmount;
        $.totalFundValue += premiumAmount;

        // Calculate coverage granted
        uint256 grantedCoverage = premiumAmount * $.coverageMultiplier;
        $.coverageAmount[msg.sender] += grantedCoverage;

        emit PremiumPaid(msg.sender, premiumAmount, grantedCoverage, block.timestamp);
    }

    // ============================
    // Claims Functions
    // ============================
    function fileClaim(uint256 claimAmount) external nonReentrant whenNotPaused onlyInitialized returns (uint256 claimId) {
        if (claimAmount == 0) revert InvalidClaimAmount();
        InsuranceStorage storage $ = _getInsuranceStorage();
        if (claimAmount > $.coverageAmount[msg.sender]) revert InsufficientCoverage();

        claimId = $.claims.length;
        $.claims.push(ITerraStakeInsuranceFund.Claim({
            claimant: msg.sender,
            amount: claimAmount,
            timestamp: block.timestamp,
            processed: false,
            approved: false
        }));
        $.userClaimIds[msg.sender].push(claimId);

        emit ClaimFiled(msg.sender, claimId, claimAmount, block.timestamp);
    }

    function processClaim(uint256 claimId, bool approve) external nonReentrant whenNotPaused onlyRole(FUND_MANAGER_ROLE) onlyInitialized {
        InsuranceStorage storage $ = _getInsuranceStorage();
        if (claimId >= $.claims.length) revert ClaimNotFound();
        
        ITerraStakeInsuranceFund.Claim storage userClaim = $.claims[claimId];
        if (userClaim.processed) revert ClaimAlreadyProcessed();

        userClaim.processed = true;
        userClaim.approved = approve;

        uint256 payout = 0;
        if (approve) {
            if (userClaim.amount > $.totalFundValue) revert InsufficientFund();
            payout = userClaim.amount;
            $.totalFundValue -= payout;
            $.tstakeToken.safeTransfer(userClaim.claimant, payout);
        }

        emit ClaimProcessed(claimId, userClaim.claimant, approve, payout, block.timestamp);
    }

    // ============================
    // View Functions
    // ============================
    function getUserClaimCount(address user) external view onlyInitialized returns (uint256) {
        return _getInsuranceStorage().userClaimIds[user].length;
    }

    function getClaim(uint256 claimId) external view onlyInitialized returns (ITerraStakeInsuranceFund.Claim memory) {
        InsuranceStorage storage $ = _getInsuranceStorage();
        if (claimId >= $.claims.length) revert ClaimNotFound();
        return $.claims[claimId];
    }

    function getFundBalance() external view onlyInitialized returns (uint256) {
        return _getInsuranceStorage().tstakeToken.balanceOf(address(this));
    }

    function premiumsPaid(address user) external view onlyInitialized returns (uint256) {
        return _getInsuranceStorage().premiumsPaid[user];
    }

    function coverageAmount(address user) external view onlyInitialized returns (uint256) {
        return _getInsuranceStorage().coverageAmount[user];
    }

    function totalFundValue() external view onlyInitialized returns (uint256) {
        return _getInsuranceStorage().totalFundValue;
    }

    function minCapitalRequirement() external view onlyInitialized returns (uint256) {
        return _getInsuranceStorage().minCapitalRequirement;
    }

    function basePremiumRate() external view onlyInitialized returns (uint256) {
        return _getInsuranceStorage().basePremiumRate;
    }

    function coverageMultiplier() external view onlyInitialized returns (uint256) {
        return _getInsuranceStorage().coverageMultiplier;
    }

    // ============================
    // Function Selectors for Diamond Pattern
    // ============================
    function getFacetFunctionSelectors() external pure returns (bytes4[] memory selectors) {
        selectors = new bytes4[](15);
        selectors[0] = this.initializeInsurance.selector;
        selectors[1] = this.payPremium.selector;
        selectors[2] = this.fileClaim.selector;
        selectors[3] = this.processClaim.selector;
        selectors[4] = this.getUserClaimCount.selector;
        selectors[5] = this.getClaim.selector;
        selectors[6] = this.getFundBalance.selector;
        selectors[7] = this.premiumsPaid.selector;
        selectors[8] = this.coverageAmount.selector;
        selectors[9] = this.totalFundValue.selector;
        selectors[10] = this.minCapitalRequirement.selector;
        selectors[11] = this.basePremiumRate.selector;
        selectors[12] = this.coverageMultiplier.selector;
        selectors[13] = this.getFacetFunctionSelectors.selector;
        selectors[14] = this.supportsInterface.selector;
    }

    // ============================
    // Interface Support
    // ============================
    function supportsInterface(bytes4 interfaceId) public view override(AccessControl) returns (bool) {
        return interfaceId == type(ITerraStakeInsuranceFund).interfaceId || super.supportsInterface(interfaceId);
    }
}
