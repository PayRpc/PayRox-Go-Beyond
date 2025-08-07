// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Template: Facet.Core@2.0.0
// Hash: a9b76ab3494936c7
// Generated: 2025-08-06T22:38:41.092Z

import "../utils/LibDiamond.sol";

/// ---------- Standard Errors (gas-efficient) ----------
error NotInitialized();
error AlreadyInitialized();
error Paused();
error Unauthorized();
error InvalidParam();
error Reentrancy();

// Storage (namespaced, collision-safe)
bytes32 constant ADVANCED_TRADING_SLOT = keccak256("payrox.facet.advanced_trading.v1");

struct Order {
    address trader;
    uint256 amount;
    uint256 price;
    bool active;
    uint256 timestamp;
}

struct AdvancedTradingFacetLayout {
    // Custom storage fields (filled by generator)
    mapping(address => uint256) userBalances; // User token balances
    mapping(bytes32 => Order) orders; // Active orders by ID
    uint256 totalVolume; // Total trading volume
    uint256 feeRate; // Trading fee rate (basis points)
    
    // Standard lifecycle & security (always present)
    bool initialized;
    bool paused;
    address operator;
    uint8 version;
    uint256 _reentrancy; // 1=unlocked, 2=locked
}

function _s() pure returns (AdvancedTradingFacetLayout storage l) {
    bytes32 slot = ADVANCED_TRADING_SLOT;
    assembly { l.slot := slot }
}

/**
 * @title AdvancedTradingFacet
 * @notice Advanced trading facet with order management and liquidity
 * @dev Facet-safe: namespaced storage, custom reentrancy, dispatcher gating
 * @custom:archetype core
 * @custom:version 2.0.0
 */
contract AdvancedTradingFacet {
    
    /// ---------- Events ----------
    event AdvancedTradingFacetInitialized(address indexed operator, uint256 timestamp);
    event PauseStatusChanged(bool paused);
    event OrderPlaced(bytes32 indexed orderId, address indexed trader, uint256 amount);
    event OrderFilled(bytes32 indexed orderId, uint256 fillAmount);
    event FeeRateUpdated(uint256 oldRate, uint256 newRate);

    /// ---------- Modifiers (security-first) ----------
    modifier onlyDispatcher() {
        LibDiamond.enforceManifestCall();
        _;
    }
    
    modifier onlyOperator() {
        if (msg.sender != _s().operator) revert Unauthorized();
        _;
    }
    
    modifier whenInitialized() {
        if (!_s().initialized) revert NotInitialized();
        _;
    }
    
    modifier whenNotPaused() {
        if (_s().paused) revert Paused();
        _;
    }
    
    modifier nonReentrant() {
        AdvancedTradingFacetLayout storage l = _s();
        if (l._reentrancy == 2) revert Reentrancy();
        l._reentrancy = 2;
        _;
        l._reentrancy = 1;
    }

    /// ---------- Initialization (no constructor pattern) ----------
    function initializeAdvancedTradingFacet(
        address operator_,
        uint256 initialFeeRate_
    ) external onlyDispatcher {
        if (operator_ == address(0)) revert Unauthorized();
        
        AdvancedTradingFacetLayout storage l = _s();
        if (l.initialized) revert AlreadyInitialized();

        l.initialized = true;
        l.operator = operator_;
        l.version = 1;
        l.paused = false;
        l._reentrancy = 1;
        
        
        l.feeRate = initialFeeRate_;
        if (initialFeeRate_ > 1000) revert InvalidParam(); // Max 10%

        emit AdvancedTradingFacetInitialized(operator_, block.timestamp);
    }

    /// ---------- Admin Functions (operator-gated via dispatcher) ----------
    function setPaused(bool paused_) external onlyDispatcher onlyOperator whenInitialized {
        _s().paused = paused_;
        emit PauseStatusChanged(paused_);
    }

    
    function setFeeRate(uint256 newRate_) external onlyDispatcher onlyOperator whenInitialized {
        
        if (newRate_ > 1000) revert InvalidParam(); // Max 10%
        uint256 oldRate = _s().feeRate;
        _s().feeRate = newRate_;
        emit FeeRateUpdated(oldRate, newRate_);
    }

    /// ---------- Core Business Logic (filled by generator) ----------
    
    function placeOrder(uint256 amount, uint256 price) external onlyDispatcher whenInitialized whenNotPaused nonReentrant {
        
        if (amount == 0 || price == 0) revert InvalidParam();
        bytes32 orderId = keccak256(abi.encodePacked(msg.sender, block.timestamp, amount));
        // Order placement logic here
        emit OrderPlaced(orderId, msg.sender, amount);
    }
    
    function fillOrder(bytes32 orderId, uint256 fillAmount) external onlyDispatcher whenInitialized whenNotPaused nonReentrant {
        
        if (fillAmount == 0) revert InvalidParam();
        // Order filling logic here
        emit OrderFilled(orderId, fillAmount);
    }

    /// ---------- View Functions ----------
    function isAdvancedTradingFacetInitialized() external view returns (bool) {
        return _s().initialized;
    }
    
    function getAdvancedTradingFacetVersion() external view returns (uint8) {
        return _s().version;
    }
    
    function isAdvancedTradingFacetPaused() external view returns (bool) {
        return _s().paused;
    }

    
    function getFeeRate() external view returns (uint256) {
        return _s().feeRate;
    }
    
    function getTotalVolume() external view returns (uint256) {
        return _s().totalVolume;
    }

    /// ---------- Manifest Integration (REQUIRED) ----------
    function getFacetInfo()
        external
        pure
        returns (string memory name, string memory version, bytes4[] memory selectors)
    {
        name = "AdvancedTrading";
        version = "2.0.0";

        // Exact selector count (no zeros, prevents manifest failures)
        selectors = new bytes4[](10);
        uint256 i = 0;
        
        // Standard selectors (always present)
        selectors[i++] = this.initializeAdvancedTradingFacet.selector;
        selectors[i++] = this.setPaused.selector;
        selectors[i++] = this.isAdvancedTradingFacetInitialized.selector;
        selectors[i++] = this.getAdvancedTradingFacetVersion.selector;
        selectors[i++] = this.isAdvancedTradingFacetPaused.selector;
        
        selectors[i++] = this.placeOrder.selector;
        selectors[i++] = this.fillOrder.selector;
    }
}

