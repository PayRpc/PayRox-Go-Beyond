// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../utils/LibDiamond.sol";

/**
 * @title TradingFacet
 * @notice Production-safe Diamond facet scaffolding with isolated storage and role-gated admin.
 * @dev AI-generated facet following PayRox production standards
 */

/// ------------------------
/// Errors (gas-efficient)
/// ------------------------
error NotInit();
error AlreadyInit();
error Paused();
error Reentrancy();
error InvalidToken();
error InsufficientBalance();
error OrderNotFound();
error NotOrderOwner();

/// ------------------------
/// Types
/// ------------------------
struct Order {
    address trader;
    address tokenIn;
    address tokenOut;
    uint256 amountIn;
    uint256 targetRate;
    uint256 deadline;
    bool filled;
}

enum OrderType { MARKET, LIMIT, STOP_LOSS }

/// ------------------------
/// Roles
/// ------------------------
bytes32 constant PAUSER_ROLE = keccak256("TRADINGFACET_PAUSER_ROLE");

library TradingFacetStorage {
    bytes32 internal constant SLOT = keccak256("payrox.gobeyond.facet.storage.tradingfacet.v2");

    struct Layout {
        // Core state (scaffold) - NO DUPLICATES
        mapping(address => uint256) userBalances;
        mapping(address => mapping(address => uint256)) tokenBalances;
        mapping(address => bool) approvedTokens;
        mapping(bytes32 => Order) orders;
        mapping(address => uint256) tradingFees;
        uint256 totalTradingVolume;
        uint256 tradingFeeRate;
        
        // Ordering
        uint256 orderNonce;
        
        // Lifecycle
        bool initialized;
        uint8 version;
        
        // Security
        uint256 _reentrancy; // 1=unlocked, 2=locked
        bool paused;
    }

    function layout() internal pure returns (Layout storage l) {
        bytes32 slot = SLOT;
        assembly { l.slot := slot }
    }
}

contract TradingFacet {
    using SafeERC20 for IERC20;

    /// ------------------------
    /// Events
    /// ------------------------
    event OrderPlaced(bytes32 indexed orderId, address indexed trader, address tokenIn, address tokenOut, uint256 amountIn);
    event OrderFilled(bytes32 indexed orderId, address indexed trader, uint256 amountOut);
    event TradeExecuted(address indexed trader, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut);
    event PausedSet(bool paused);
    event TokenApprovalSet(address indexed token, bool approved);
    event TradingFacetInitialized(address indexed dispatcher, uint256 timestamp);
    event TradingFacetFunctionCalled(bytes4 indexed selector, address indexed caller);

    /// ------------------------
    /// Modifiers (CONSISTENT PATTERN)
    /// ------------------------
    modifier onlyDispatcher() {
        LibDiamond.enforceIsDispatcher();
        _;
    }

    modifier onlyPauser() {
        LibDiamond.enforceRole(PAUSER_ROLE, msg.sender);
        _;
    }

    modifier nonReentrant() {
        TradingFacetStorage.Layout storage ds = TradingFacetStorage.layout();
        if (ds._reentrancy == 2) revert Reentrancy();
        ds._reentrancy = 2;
        _;
        ds._reentrancy = 1;
    }

    modifier whenNotPaused() {
        if (TradingFacetStorage.layout().paused) revert Paused();
        _;
    }

    modifier onlyInitialized() {
        if (!TradingFacetStorage.layout().initialized) revert NotInit();
        _;
    }

    /// ------------------------
    /// Initialization (no constructor)
    /// ------------------------
    function initializeTradingFacet() external onlyDispatcher {
        TradingFacetStorage.Layout storage ds = TradingFacetStorage.layout();
        if (ds.initialized) revert AlreadyInit();
        ds.initialized = true;
        ds.version = 2;
        ds._reentrancy = 1;
        emit TradingFacetInitialized(msg.sender, block.timestamp);
    }

    /// ------------------------
    /// Admin (role-gated via dispatcher)
    /// ------------------------
    function setPaused(bool _paused) external onlyDispatcher onlyPauser {
        TradingFacetStorage.layout().paused = _paused;
        emit PausedSet(_paused);
    }

    function setTokenApproved(address token, bool approved) external onlyDispatcher onlyPauser {
        if (token == address(0)) revert InvalidToken();
        TradingFacetStorage.layout().approvedTokens[token] = approved;
        emit TokenApprovalSet(token, approved);
    }

    /// ------------------------
    /// Core Functions - PROPERLY GATED
    /// ------------------------
    function placeMarketOrder(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut
    )
        external
        onlyDispatcher      // CRITICAL: Must go through dispatcher
        onlyInitialized     // CONSISTENT: Use modifier not inline check
        whenNotPaused       // SECURITY: Respect pause state
        nonReentrant        // SECURITY: Prevent reentrancy
    {
        emit TradingFacetFunctionCalled(msg.sig, msg.sender);
        
        TradingFacetStorage.Layout storage ds = TradingFacetStorage.layout();
        
        // TODO: implement production logic (checks-effects-interactions + SafeERC20)
        // - validate approvals: ds.approvedTokens[tokenIn/out]
        // - compute amountOut via oracle/AMM hook: _quote(tokenIn, tokenOut, amountIn)
        // - update totals: ds.totalTradingVolume += amountIn;
        // - transfer: IERC20(tokenIn).safeTransferFrom(...); IERC20(tokenOut).safeTransfer(...);
        
        // Example implementation skeleton:
        // if (!ds.approvedTokens[tokenIn] || !ds.approvedTokens[tokenOut]) revert InvalidToken();
        // if (ds.userBalances[msg.sender] < amountIn) revert InsufficientBalance();
        // uint256 amountOut = _quote(tokenIn, tokenOut, amountIn);
        // if (amountOut < minAmountOut) revert InsufficientBalance();
        // 
        // ds.userBalances[msg.sender] -= amountIn;
        // ds.tokenBalances[msg.sender][tokenOut] += amountOut;
        // ds.totalTradingVolume += amountIn;
        // 
        // emit TradeExecuted(msg.sender, tokenIn, tokenOut, amountIn, amountOut);
    }

    function placeLimitOrder(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 targetRate,
        uint256 deadline
    )
        external
        onlyDispatcher      // CRITICAL: All state changes must be gated
        onlyInitialized
        whenNotPaused
        nonReentrant
    {
        emit TradingFacetFunctionCalled(msg.sig, msg.sender);
        
        // TODO: create order with unique ID using _newOrderId(...)
        // bytes32 id = _newOrderId(msg.sender, tokenIn, tokenOut, amountIn);
        // TradingFacetStorage.Layout storage ds = TradingFacetStorage.layout();
        // ds.orders[id] = Order({
        //     trader: msg.sender,
        //     tokenIn: tokenIn,
        //     tokenOut: tokenOut,
        //     amountIn: amountIn,
        //     targetRate: targetRate,
        //     deadline: deadline,
        //     filled: false
        // });
        // IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        // emit OrderPlaced(id, msg.sender, tokenIn, tokenOut, amountIn);
    }

    function cancelOrder(bytes32 orderId)
        external
        onlyDispatcher      // CRITICAL: All state changes must be gated
        onlyInitialized
        whenNotPaused
        nonReentrant
    {
        emit TradingFacetFunctionCalled(msg.sig, msg.sender);
        
        TradingFacetStorage.Layout storage ds = TradingFacetStorage.layout();
        Order storage order = ds.orders[orderId];
        
        if (order.trader == address(0)) revert OrderNotFound();
        if (order.trader != msg.sender) revert NotOrderOwner();
        if (order.filled) revert OrderNotFound(); // Already filled
        
        // TODO: implement cancellation logic
        // - refund locked tokens: IERC20(order.tokenIn).safeTransfer(order.trader, order.amountIn);
        // - mark order as cancelled/delete: delete ds.orders[orderId];
        // - emit cancellation event
    }

    /// ------------------------
    /// Internal hooks
    /// ------------------------
    function _quote(address /*tokenIn*/, address /*tokenOut*/, uint256 amountIn) internal pure returns (uint256) {
        // TODO: wire oracle/AMM; revert on stale/invalid prices
        return amountIn; // placeholder 1:1
    }

    function _newOrderId(
        address user,
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) internal returns (bytes32) {
        TradingFacetStorage.Layout storage ds = TradingFacetStorage.layout();
        return keccak256(abi.encodePacked(block.chainid, user, tokenIn, tokenOut, amountIn, ds.orderNonce++));
    }

    /// ------------------------
    /// Views (no gating needed)
    /// ------------------------
    function isTradingFacetInitialized() external view returns (bool) {
        return TradingFacetStorage.layout().initialized;
    }

    function getTradingFacetVersion() external view returns (uint256) {
        return TradingFacetStorage.layout().version;
    }

    function isTradingFacetPaused() external view returns (bool) {
        return TradingFacetStorage.layout().paused;
    }

    function getOrder(bytes32 orderId) external view returns (Order memory) {
        return TradingFacetStorage.layout().orders[orderId];
    }
}
