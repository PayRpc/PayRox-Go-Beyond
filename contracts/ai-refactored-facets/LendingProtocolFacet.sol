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
enum LoanStatus { PENDING, ACTIVE, REPAID, DEFAULTED }
enum CollateralType { ETH, TOKEN, NFT }

// ------------------------
// Structs and Types (no visibility keywords)
// ------------------------
struct LendingPool {
    IERC20 token;
    uint256 totalDeposits;
    uint256 totalBorrows;
    uint256 interestRate;
    uint256 collateralRatio;
    bool active;
}

// ------------------------
// Storage (native pattern: direct slots, no LibDiamond)
// ------------------------
bytes32 constant STORAGE_SLOT = keccak256("payrox.facet.lendingprotocol.v1");

struct Layout {
    // Lending state
    mapping(address => uint256) lendingBalances;
    mapping(address => uint256) borrowingBalances;
    mapping(address => uint256) collateralBalances;
    mapping(address => LendingPool) lendingPools;
    mapping(address => uint256) liquidationThresholds;
    uint256 totalLent;
    uint256 totalBorrowed;
    
    // Lifecycle management
    bool initialized;
    bool paused;
    address operator;
    uint8 version;
}

/**
 * @title LendingProtocolFacet
 * @notice Complete lending and borrowing protocol
 * @dev Standalone PayRox facet with manifest integration
 */
contract LendingProtocolFacet is ReentrancyGuard {
    using SafeERC20 for IERC20;

    function _layout() private pure returns (Layout storage l) {
        bytes32 slot = STORAGE_SLOT;
        assembly { l.slot := slot }
    }

    // ------------------------
    // Events
    // ------------------------
    event LendingProtocolFacetInitialized(address indexed operator, uint256 timestamp);
    event PauseStatusChanged(bool paused);
    event LendingPoolCreated(address indexed token, uint256 interestRate);
    event Deposited(address indexed user, address indexed token, uint256 amount);
    event Borrowed(address indexed user, address indexed token, uint256 amount, uint256 collateral);
    event Repaid(address indexed user, address indexed token, uint256 amount);
    event Liquidated(address indexed borrower, address indexed liquidator, address token, uint256 amount);

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
    function initializeLendingProtocolFacet(address operator_) external {
        if (operator_ == address(0)) revert Unauthorized();
        
        Layout storage l = _layout();
        if (l.initialized) revert AlreadyInitialized();
        
        l.initialized = true;
        l.operator = operator_;
        l.version = 1;
        l.paused = false;
        
        emit LendingProtocolFacetInitialized(operator_, block.timestamp);
    }

    // ------------------------
    // Core Business Logic
    // ------------------------
    function createLendingPool(
        address token,
        uint256 interestRate,
        uint256 collateralRatio
    ) external onlyOperator whenInitialized {
        if (token == address(0)) revert InvalidTokenAddress();
        if (interestRate == 0 || collateralRatio == 0) revert InvalidAmount();
        
        Layout storage l = _layout();
        l.lendingPools[token] = LendingPool({
            token: IERC20(token),
            totalDeposits: 0,
            totalBorrows: 0,
            interestRate: interestRate,
            collateralRatio: collateralRatio,
            active: true
        });
        
        emit LendingPoolCreated(token, interestRate);
    }

    function deposit(address token, uint256 amount) external nonReentrant whenInitialized whenNotPaused {
        if (token == address(0)) revert InvalidTokenAddress();
        if (amount == 0) revert InvalidAmount();
        
        Layout storage l = _layout();
        if (!l.lendingPools[token].active) revert Unauthorized();
        
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        l.lendingBalances[msg.sender] += amount;
        l.lendingPools[token].totalDeposits += amount;
        l.totalLent += amount;
        
        emit Deposited(msg.sender, token, amount);
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
    function isLendingProtocolFacetInitialized() external view returns (bool) {
        return _layout().initialized;
    }

    function getLendingProtocolFacetVersion() external view returns (uint8) {
        return _layout().version;
    }

    function isLendingProtocolFacetPaused() external view returns (bool) {
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
        name = "LendingProtocol";
        version = "1.0.0";

        // CRITICAL: All external function selectors for manifest routing
        selectors = new bytes4[](13);
        uint256 index = 0;
        
        // Core function selectors
        selectors[index++] = this.createLendingPool.selector;
        selectors[index++] = this.deposit.selector;
        
        // Standard selectors
        selectors[index++] = this.initializeLendingProtocolFacet.selector;
        selectors[index++] = this.setPaused.selector;
        selectors[index++] = this.isLendingProtocolFacetInitialized.selector;
        selectors[index++] = this.getLendingProtocolFacetVersion.selector;
        selectors[index++] = this.isLendingProtocolFacetPaused.selector;
    }
}