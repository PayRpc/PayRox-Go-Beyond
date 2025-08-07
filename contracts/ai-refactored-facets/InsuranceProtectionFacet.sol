// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// ------------------------
// Errors (gas-efficient custom errors)
// ------------------------
error NotInitialized();
error AlreadyInitialized();
error Paused();
error Unauthorized();
error InvalidAmount();
error InsufficientBalance();
error InvalidTokenAddress();

// ------------------------
// Enums
// ------------------------
enum PolicyType { BASIC, PREMIUM, ENTERPRISE }
enum ClaimStatus { PENDING, APPROVED, REJECTED, PAID }

// ------------------------
// Structs and Types (no visibility keywords)
// ------------------------
struct InsurancePolicy {
    uint256 coverage;
    uint256 premium;
    uint256 expiry;
    bool active;
    PolicyType policyType;
}

struct InsuranceClaim {
    address claimer;
    uint256 amount;
    string reason;
    bool approved;
    bool paid;
    uint256 timestamp;
}

// ------------------------
// Storage (native pattern: direct slots, no LibDiamond)
// ------------------------
bytes32 constant STORAGE_SLOT = keccak256("payrox.facet.insuranceprotection.v1");

struct Layout {
    // Insurance state
    mapping(address => uint256) insuranceCoverage;
    mapping(address => InsurancePolicy[]) userPolicies;
    mapping(uint256 => InsuranceClaim) claims;
    uint256 totalInsuranceFund;
    uint256 claimCount;
    uint256 premiumRate;
    
    // Lifecycle management
    bool initialized;
    bool paused;
    address operator;
    uint8 version;
}

/**
 * @title InsuranceProtectionFacet
 * @notice Insurance and risk protection system
 * @dev Standalone PayRox facet with manifest integration
 */
contract InsuranceProtectionFacet is ReentrancyGuard {
    using SafeERC20 for IERC20;

    function _layout() private pure returns (Layout storage l) {
        bytes32 slot = STORAGE_SLOT;
        assembly { l.slot := slot }
    }

    // ------------------------
    // Events
    // ------------------------
    event InsuranceProtectionFacetInitialized(address indexed operator, uint256 timestamp);
    event PauseStatusChanged(bool paused);
    event PolicyPurchased(address indexed user, uint256 coverage, uint256 premium, PolicyType policyType);
    event ClaimSubmitted(uint256 indexed claimId, address indexed claimer, uint256 amount);
    event ClaimProcessed(uint256 indexed claimId, bool approved, uint256 payout);

    // ------------------------
    // Modifiers (native PayRox pattern - facet-owned)
    // ------------------------
    modifier whenInitialized() {
        if (!_layout().initialized) revert NotInitialized();
        _;
    }

    modifier whenNotPaused() {
        if (_layout().paused) revert Paused();
        _;
    }

    modifier onlyOperator() {
        if (msg.sender != _layout().operator) revert Unauthorized();
        _;
    }

    // ------------------------
    // Initialization (manifest-compatible, no constructor)
    // ------------------------
    function initializeInsuranceProtectionFacet(address operator_) external {
        if (operator_ == address(0)) revert Unauthorized();
        
        Layout storage l = _layout();
        if (l.initialized) revert AlreadyInitialized();
        
        l.initialized = true;
        l.operator = operator_;
        l.version = 1;
        l.paused = false;
        
        emit InsuranceProtectionFacetInitialized(operator_, block.timestamp);
    }

    // ------------------------
    // Core Business Logic
    // ------------------------
    function buyInsurance(
        uint256 coverage,
        uint256 duration,
        PolicyType policyType
    ) external payable nonReentrant whenInitialized whenNotPaused {
        if (coverage == 0 || duration == 0) revert InvalidAmount();
        
        Layout storage l = _layout();
        uint256 premium = calculatePremium(coverage, duration, policyType);
        if (msg.value < premium) revert InsufficientBalance();
        
        l.userPolicies[msg.sender].push(InsurancePolicy({
            coverage: coverage,
            premium: premium,
            expiry: block.timestamp + duration,
            active: true,
            policyType: policyType
        }));
        
        l.insuranceCoverage[msg.sender] += coverage;
        l.totalInsuranceFund += premium;
        
        emit PolicyPurchased(msg.sender, coverage, premium, policyType);
    }

    function calculatePremium(
        uint256 coverage,
        uint256 duration,
        PolicyType policyType
    ) public view returns (uint256) {
        Layout storage l = _layout();
        uint256 basePremium = (coverage * l.premiumRate * duration) / (365 days * 10000);
        
        // Adjust premium based on policy type
        if (policyType == PolicyType.PREMIUM) {
            return (basePremium * 150) / 100; // 1.5x for premium
        } else if (policyType == PolicyType.ENTERPRISE) {
            return (basePremium * 200) / 100; // 2x for enterprise
        }
        
        return basePremium;
    }

    // ------------------------
    // Admin Functions (operator-gated)
    // ------------------------
    function setPaused(bool _paused) external onlyOperator {
        _layout().paused = _paused;
        emit PauseStatusChanged(_paused);
    }

    // ------------------------
    // View Functions
    // ------------------------
    function isInsuranceProtectionFacetInitialized() external view returns (bool) {
        return _layout().initialized;
    }

    function getInsuranceProtectionFacetVersion() external view returns (uint8) {
        return _layout().version;
    }

    function isInsuranceProtectionFacetPaused() external view returns (bool) {
        return _layout().paused;
    }

    // ------------------------
    // Manifest Integration (REQUIRED for PayRox deployment)
    // ------------------------
    function getFacetInfo()
        external
        pure
        returns (string memory name, string memory version, bytes4[] memory selectors)
    {
        name = "InsuranceProtection";
        version = "1.0.0";

        // CRITICAL: All external function selectors for manifest routing
        selectors = new bytes4[](12);
        uint256 index = 0;
        
        // Core function selectors
        selectors[index++] = this.buyInsurance.selector;
        selectors[index++] = this.calculatePremium.selector;
        
        // Standard selectors
        selectors[index++] = this.initializeInsuranceProtectionFacet.selector;
        selectors[index++] = this.setPaused.selector;
        selectors[index++] = this.isInsuranceProtectionFacetInitialized.selector;
        selectors[index++] = this.getInsuranceProtectionFacetVersion.selector;
        selectors[index++] = this.isInsuranceProtectionFacetPaused.selector;
    }
}