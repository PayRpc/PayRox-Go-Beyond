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
enum OrderType { MARKET, LIMIT, STOP_LOSS }
enum OrderStatus { PENDING, FILLED, CANCELLED, EXPIRED }

// ------------------------
// Structs and Types (no visibility keywords)
// ------------------------
struct Order {
    address trader;
    address tokenIn;
    address tokenOut;
    uint256 amountIn;
    uint256 amountOut;
    uint256 deadline;
    bool filled;
    OrderType orderType;
}

// ------------------------
// Storage (native pattern: direct slots, no LibDiamond)
// ------------------------
bytes32 constant STORAGE_SLOT = keccak256("payrox.facet.tradingcore.v1");

struct Layout {
    // Trading state
    mapping(address => uint256) userBalances;
    mapping(address => mapping(address => uint256)) tokenBalances;
    mapping(address => bool) approvedTokens;
    mapping(bytes32 => Order) orders;
    mapping(address => uint256) tradingFees;
    uint256 totalTradingVolume;
    uint256 tradingFeeRate;
    
    // Lifecycle management
    bool initialized;
    bool paused;
    address operator;
    uint8 version;
}

/**
 * @title TradingCoreFacet
 * @notice Core trading functionality with order management
 * @dev Standalone PayRox facet with manifest integration
 */
contract TradingCoreFacet is ReentrancyGuard {
    using SafeERC20 for IERC20;

    function _layout() private pure returns (Layout storage l) {
        bytes32 slot = STORAGE_SLOT;
        assembly { l.slot := slot }
    }

    // ------------------------
    // Events
    // ------------------------
    event TradingCoreFacetInitialized(address indexed operator, uint256 timestamp);
    event PauseStatusChanged(bool paused);
    event OrderPlaced(bytes32 indexed orderId, address indexed trader, address tokenIn, address tokenOut, uint256 amountIn);
    event OrderFilled(bytes32 indexed orderId, address indexed trader, uint256 amountOut);
    event TradeExecuted(address indexed trader, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut);

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
    function initializeTradingCoreFacet(address operator_) external {
        if (operator_ == address(0)) revert Unauthorized();
        
        Layout storage l = _layout();
        if (l.initialized) revert AlreadyInitialized();
        
        l.initialized = true;
        l.operator = operator_;
        l.version = 1;
        l.paused = false;
        
        emit TradingCoreFacetInitialized(operator_, block.timestamp);
    }

    // ------------------------
    // Core Business Logic
    // ------------------------
    function placeMarketOrder(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut
    ) external nonReentrant whenInitialized whenNotPaused {
        if (tokenIn == address(0) || tokenOut == address(0)) revert InvalidTokenAddress();
        if (amountIn == 0) revert InvalidAmount();
        
        Layout storage l = _layout();
        bytes32 orderId = keccak256(abi.encodePacked(msg.sender, block.timestamp, amountIn));
        
        l.orders[orderId] = Order({
            trader: msg.sender,
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            amountIn: amountIn,
            amountOut: minAmountOut,
            deadline: block.timestamp + 300, // 5 minute market order
            filled: false,
            orderType: OrderType.MARKET
        });
        
        l.totalTradingVolume += amountIn;
        
        emit OrderPlaced(orderId, msg.sender, tokenIn, tokenOut, amountIn);
    }

    function placeLimitOrder(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 targetRate,
        uint256 deadline
    ) external nonReentrant whenInitialized whenNotPaused {
        if (tokenIn == address(0) || tokenOut == address(0)) revert InvalidTokenAddress();
        if (amountIn == 0 || targetRate == 0) revert InvalidAmount();
        if (deadline <= block.timestamp) revert InvalidAmount();
        
        Layout storage l = _layout();
        bytes32 orderId = keccak256(abi.encodePacked(msg.sender, block.timestamp, amountIn, targetRate));
        
        l.orders[orderId] = Order({
            trader: msg.sender,
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            amountIn: amountIn,
            amountOut: (amountIn * targetRate) / 1e18,
            deadline: deadline,
            filled: false,
            orderType: OrderType.LIMIT
        });
        
        emit OrderPlaced(orderId, msg.sender, tokenIn, tokenOut, amountIn);
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
    function isTradingCoreFacetInitialized() external view returns (bool) {
        return _layout().initialized;
    }

    function getTradingCoreFacetVersion() external view returns (uint8) {
        return _layout().version;
    }

    function isTradingCoreFacetPaused() external view returns (bool) {
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
        name = "TradingCore";
        version = "1.0.0";

        // CRITICAL: All external function selectors for manifest routing
        selectors = new bytes4[](12);
        uint256 index = 0;
        
        // Core function selectors
        selectors[index++] = this.placeMarketOrder.selector;
        selectors[index++] = this.placeLimitOrder.selector;
        
        // Standard selectors
        selectors[index++] = this.initializeTradingCoreFacet.selector;
        selectors[index++] = this.setPaused.selector;
        selectors[index++] = this.isTradingCoreFacetInitialized.selector;
        selectors[index++] = this.getTradingCoreFacetVersion.selector;
        selectors[index++] = this.isTradingCoreFacetPaused.selector;
    }
}