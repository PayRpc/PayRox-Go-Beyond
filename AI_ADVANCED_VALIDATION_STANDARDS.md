# AI Advanced Validation Standards - PayRox Manifest-Router Architecture

## 🚨 CRITICAL ARCHITECTURE INVARIANTS

### 0. **COMPILATION BLOCKERS (FIX FIRST)**
```solidity
// ❌ WRONG - Undefined type & illegal visibility
struct Layout {
    mapping(bytes32 => Order) public orders; // Order not defined + public not allowed
}

// ✅ CORRECT - Define types & remove visibility
struct Order {
    address user;
    address tokenIn;
    uint256 amountIn;
    uint256 timestamp;
    bool filled;
}

struct Layout {
    mapping(bytes32 => Order) orders; // No visibility keywords in structs
}
```

### 1. **Dispatcher Gating (REQUIRED)**
Every state-changing function MUST be gated:
```solidity
// Method 1: Modifier
function placeOrder(...) external onlyDispatcher { ... }

// Method 2: In-body enforcement  
function placeOrder(...) external {
    LibDiamond.enforceIsDispatcher();
    // ... logic
}
```

### 2. **Init Hygiene (REQUIRED)**
Initialization functions MUST:
- Set `initialized = true`
- Set `_reentrancy = 1` 
- Emit init event
- Be dispatcher + role gated

```solidity
function initializeTradingFacet() external onlyDispatcher {
    TradingFacetStorage.Layout storage ds = TradingFacetStorage.layout();
    if (ds.initialized) revert AlreadyInitialized();
    
    ds.initialized = true;      // ✅ REQUIRED
    ds._reentrancy = 1;        // ✅ REQUIRED
    
    emit TradingFacetInitialized(msg.sender, block.timestamp); // ✅ REQUIRED
}
```

### 3. **Reentrancy Pattern (REQUIRED)**
Must have storage `_reentrancy` flag AND usage:
```solidity
// In storage layout
uint256 _reentrancy; // 1=unlocked, 2=locked

// Usage pattern
modifier nonReentrant() {
    if (ds._reentrancy == 2) revert ReentrancyDetected();
    ds._reentrancy = 2;
    _;
    ds._reentrancy = 1;
}
```

### 4. **Flexible Order Struct**
Don't be strict about field names:
```solidity
// All valid variations
struct Order {
    bytes32 id;           // or orderId, hash
    address user;         // or trader, owner
    uint256 amount;       // or amountIn, amountOut
    uint256 timestamp;    // or deadline, created
}
```

### 5. **Role-Gated Admin Functions**
Admin functions must check actual usage:
```solidity
function setPaused(bool _paused) external onlyDispatcher onlyPauser {
    // Both dispatcher AND role enforcement required
}
```

## 🛡️ PRODUCTION VALIDATION RULES

1. **State-changing detection**: Ignore `view` and `pure` functions
2. **ASCII enforcement**: Only for `.sol` files, allow emojis in docs
3. **Modifier vs in-body**: Accept either dispatcher gating pattern
4. **Storage namespacing**: Verify unique keccak256 slots
5. **SafeERC20 usage**: Check actual usage, not just imports
