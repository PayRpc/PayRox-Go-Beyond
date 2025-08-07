# AI Facet Generation Standards - Critical Blockers & Solutions

## 🚨 CRITICAL BLOCKERS TO AVOID

### 1. **Duplicate Storage Fields**
```solidity
// ❌ WRONG - Compilation will fail
struct Layout {
    mapping(bytes32 => Order) orders;
    mapping(bytes32 => Order) orders; // DUPLICATE!
}

// ✅ CORRECT - Each field declared once
struct Layout {
    mapping(bytes32 => Order) orders;
    mapping(address => uint256) userBalances;
}
```

### 2. **Missing Dispatcher Gating**
```solidity
// ❌ WRONG - Can be called directly, bypassing router
function placeMarketOrder(...) external {
    // No dispatcher check!
}

// ✅ CORRECT - Must go through dispatcher
function placeMarketOrder(...) external onlyDispatcher onlyInitialized whenNotPaused nonReentrant {
    // Properly gated
}
```

### 3. **Inconsistent Init Checks**
```solidity
// ❌ WRONG - Inline checks are inconsistent
function someFunction() external {
    if (!ds.initialized) revert NotInit();
}

// ✅ CORRECT - Use consistent modifier
function someFunction() external onlyInitialized {
    // Consistent pattern
}
```

### 4. **Non-ASCII Characters**
```solidity
// ❌ WRONG - Will fail ASCII-only linters
// 🔒 PayRox Professional Access Control ⚡️

// ✅ CORRECT - ASCII only
// PayRox Professional Access Control
```

### 5. **Unused Imports**
```solidity
// ❌ WRONG - Imported but not used
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
// Never used in code

// ✅ CORRECT - Either use or reference in TODO
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
contract MyFacet {
    using SafeERC20 for IERC20; // Actually used
}
```

## 🎯 PRODUCTION-READY PATTERN

### Complete Facet Template:
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../utils/LibDiamond.sol";

/**
 * @title ExchangeBeyondFacet
 * @notice Production-safe Diamond facet scaffolding with isolated storage and role-gated admin.
 */

/// ------------------------
/// Errors (gas-efficient)
/// ------------------------
error NotInit();
error AlreadyInit();
error Paused();
error Reentrancy();
error InvalidToken();

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
    bool    filled;
}

/// ------------------------
/// Roles
/// ------------------------
bytes32 constant PAUSER_ROLE = keccak256("EXCHANGEBEYONDFACET_PAUSER_ROLE");

library ExchangeBeyondFacetStorage {
    bytes32 internal constant SLOT = keccak256("payrox.gobeyond.facet.storage.exchangebeyondfacet.v2");

    struct Layout {
        // Core state (scaffold) - NO DUPLICATES!
        mapping(address => uint256) userBalances;
        mapping(address => mapping(address => uint256)) tokenBalances;
        mapping(address => bool) approvedTokens;
        mapping(bytes32 => Order) orders; // SINGLE DECLARATION
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

contract ExchangeBeyondFacet {
    using SafeERC20 for IERC20; // ACTUALLY USE IMPORTS

    /// ------------------------
    /// Events
    /// ------------------------
    event OrderPlaced(bytes32 indexed orderId, address indexed trader, address tokenIn, address tokenOut, uint256 amountIn);
    event OrderFilled(bytes32 indexed orderId, address indexed trader, uint256 amountOut);
    event TradeExecuted(address indexed trader, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut);
    event PausedSet(bool paused);
    event TokenApprovalSet(address indexed token, bool approved);
    event ExchangeBeyondFacetInitialized(address indexed dispatcher, uint256 timestamp);
    event ExchangeBeyondFacetFunctionCalled(bytes4 indexed selector, address indexed caller);

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
        ExchangeBeyondFacetStorage.Layout storage ds = ExchangeBeyondFacetStorage.layout();
        if (ds._reentrancy == 2) revert Reentrancy();
        ds._reentrancy = 2;
        _;
        ds._reentrancy = 1;
    }

    modifier whenNotPaused() {
        if (ExchangeBeyondFacetStorage.layout().paused) revert Paused();
        _;
    }

    modifier onlyInitialized() {
        if (!ExchangeBeyondFacetStorage.layout().initialized) revert NotInit();
        _;
    }

    /// ------------------------
    /// Initialization (no constructor)
    /// ------------------------
    function initializeExchangeBeyondFacet() external onlyDispatcher {
        ExchangeBeyondFacetStorage.Layout storage ds = ExchangeBeyondFacetStorage.layout();
        if (ds.initialized) revert AlreadyInit();
        ds.initialized = true;
        ds.version = 2;
        ds._reentrancy = 1;
        emit ExchangeBeyondFacetInitialized(msg.sender, block.timestamp);
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
        emit ExchangeBeyondFacetFunctionCalled(msg.sig, msg.sender);
        // TODO: implement production logic (checks-effects-interactions + SafeERC20)
        // - validate approvals: ExchangeBeyondFacetStorage.layout().approvedTokens[tokenIn/out]
        // - compute amountOut via oracle/AMM hook: _quote(tokenIn, tokenOut, amountIn)
        // - update totals: ds.totalTradingVolume += amountIn;
        // - transfer: IERC20(tokenIn).safeTransferFrom(...); IERC20(tokenOut).safeTransfer(...);
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
        emit ExchangeBeyondFacetFunctionCalled(msg.sig, msg.sender);
        // TODO: create order with unique ID using _newOrderId(...)
        // bytes32 id = _newOrderId(msg.sender, tokenIn, tokenOut, amountIn);
        // ds.orders[id] = Order({ ... });
        // IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        // emit OrderPlaced(id, msg.sender, tokenIn, tokenOut, amountIn);
    }

    /// ------------------------
    /// Internal hooks
    /// ------------------------
    function _newOrderId(
        address user,
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) internal returns (bytes32) {
        ExchangeBeyondFacetStorage.Layout storage ds = ExchangeBeyondFacetStorage.layout();
        return keccak256(abi.encodePacked(block.chainid, user, tokenIn, tokenOut, amountIn, ds.orderNonce++));
    }

    /// ------------------------
    /// Views (no gating needed)
    /// ------------------------
    function isExchangeBeyondFacetInitialized() external view returns (bool) {
        return ExchangeBeyondFacetStorage.layout().initialized;
    }
}
```

## 🛡️ SECURITY CHECKLIST

When generating facets, AI must verify:

- [ ] **No duplicate storage fields** in Layout struct
- [ ] **All state-changing functions have `onlyDispatcher`** modifier
- [ ] **Consistent use of `onlyInitialized`** modifier (not inline checks)
- [ ] **ASCII-only comments** (no emoji/unicode)
- [ ] **Imports are actually used** (via `using` statements or direct references)
- [ ] **Proper modifier stack**: `onlyDispatcher onlyInitialized whenNotPaused nonReentrant`
- [ ] **Custom errors** instead of string reverts (gas efficient)
- [ ] **Storage library pattern** with assembly slot access
- [ ] **Unique storage slots** using keccak256 namespacing
- [ ] **SafeERC20** for token operations

## 🎯 WHY THIS MATTERS

This pattern ensures:
1. **Compilation success** (no duplicate fields)
2. **Security by default** (dispatcher-only state changes)
3. **Consistency** (standardized modifier usage)
4. **Linter compatibility** (ASCII-only, used imports)
5. **Gas efficiency** (custom errors, optimized storage)
6. **Production readiness** (complete security stack)

## 📝 AI LEARNING NOTES

The AI system should internalize this pattern and apply it to ALL generated facets. This is the difference between:
- ❌ **Demo/prototype facets** that don't compile or have security issues
- ✅ **Production-ready facets** that can be deployed safely

Every AI-generated facet must pass this checklist before being considered complete.
