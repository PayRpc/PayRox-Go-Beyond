// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

/**
 * @title TradingFacet
 * @notice PayRox facet following native patterns from ExampleFacetA/B
 */
// Errors (gas-efficient)
error NotInitialized();
error AlreadyInitialized();
error ContractPaused();
error ReentrancyDetected();
error InvalidTokenAddress();
// Roles
bytes32 constant PAUSER_ROLE = keccak256("TRADINGFACET_PAUSER_ROLE");
// Minimal order type (expand as needed)
struct Order {
    address user;
    address tokenIn;
    address tokenOut;
    uint256 amountIn;
    uint256 minAmountOut;
    uint256 timestamp;
    bool    filled;
}

library TradingFacetStorage {
    bytes32 internal constant STORAGE_SLOT =
        keccak256("payrox.production.facet.storage.tradingfacet.v3");

    struct Layout {
    mapping(bytes32 => Order) orders;
    mapping(address => uint256) tradingFees;
    uint256 totalTradingVolume;
    uint256 tradingFeeRate;
    uint256 orderNonce;

        // lifecycle
    bool initialized;
    uint8 version;

        // security
    uint256 _reentrancyStatus; // 1=unlocked, 2=locked
    bool paused;
    }
    function _layout() private pure returns (Layout storage l) {
        bytes32 slot = STORAGE_SLOT;
        assembly { l.slot := slot }
    }

    function layout() internal pure returns (Layout storage l) {
        bytes32 slot = STORAGE_SLOT;
        assembly { l.slot := slot }
    }
}

contract TradingFacet {
    using SafeERC20 for IERC20;

    bytes32 constant STORAGE_SLOT = keccak256("payrox.facet.trading.v1");
    using SafeERC20 for IERC20;
// Events
    event TradingActionExecuted(address indexed user, uint256 amount, uint256 timestamp);
    event TradingFacetInitialized(address indexed dispatcher, uint256 timestamp);
    event TradingFacetFunctionCalled(bytes4 indexed selector, address indexed caller);
    event PauseStatusChanged(bool paused);
// Modifiers
    modifier onlyDispatcher() {
        
        _;
    }

    modifier onlyPauser() {
        
        _;
    }

    modifier nonReentrant() {
        TradingFacetStorage.Layout storage ds = TradingFacetStorage.layout();
        if (ds._reentrancyStatus == 2) revert ReentrancyDetected();
        ds._reentrancyStatus = 2;
        _;
        ds._reentrancyStatus = 1;
    }

    modifier whenNotPaused() {
        if (TradingFacetStorage.layout().paused) revert ContractPaused();
        _;
    }

    modifier onlyInitialized() {
        if (!TradingFacetStorage.layout().initialized) revert NotInitialized();
        _;
    }
// Initialization (no constructor)
    function initializeTradingFacet() external onlyDispatcher {
        TradingFacetStorage.Layout storage ds = TradingFacetStorage.layout();
        if (ds.initialized) revert AlreadyInitialized();
        ds.initialized = true;
        ds.version = 3;
        ds._reentrancyStatus = 1;
        ds.paused = false;
        emit TradingFacetInitialized(msg.sender, block.timestamp);
    }
// Admin
    function setPaused(bool _paused) external onlyDispatcher onlyPauser {
        TradingFacetStorage.layout().paused = _paused;
        emit PauseStatusChanged(_paused);
    }
// Core (scaffold)
    function placeMarketOrder(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut
    )
        external
        onlyDispatcher
        onlyInitialized
        whenNotPaused
        nonReentrant
    {
        emit TradingFacetFunctionCalled(msg.sig, msg.sender);

        // Minimal sanity uses to avoid "unused variable" warnings and keep safe defaults.
        if (tokenIn == address(0) || tokenOut == address(0)) revert InvalidTokenAddress();
        require(amountIn >= minAmountOut, "TradingFacet: invalid amounts");

        TradingFacetStorage.Layout storage ds = TradingFacetStorage.layout();

        // Example: create an order ID (you can remove if not needed)
        bytes32 id = keccak256(
            abi.encodePacked(block.chainid, msg.sender, tokenIn, tokenOut, amountIn, ds.orderNonce++)
        );
        ds.orders[id] = Order({
            user: msg.sender,
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            amountIn: amountIn,
            minAmountOut: minAmountOut,
            timestamp: block.timestamp,
            filled: false
        });

        // NOTE: implement business logic here (oracle quote, SafeERC20 transfers, etc.)
        // IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        // uint256 amountOut = _quote(tokenIn, tokenOut, amountIn);
        // require(amountOut >= minAmountOut, "slippage");
        // IERC20(tokenOut).safeTransfer(msg.sender, amountOut);
        // ds.totalTradingVolume += amountIn;

        emit TradingActionExecuted(msg.sender, amountIn, block.timestamp);
    }
// Views
    function isTradingFacetInitialized() external view returns (bool) {
        return TradingFacetStorage.layout().initialized;
    }

    function getTradingFacetVersion() external view returns (uint256) {
        return TradingFacetStorage.layout().version;
    }

    function isTradingFacetPaused() external view returns (bool) {
        return TradingFacetStorage.layout().paused;
    }
// ------------------------
// Manifest Integration (REQUIRED for PayRox deployment)
// ------------------------
    function getFacetInfo()
        external
        pure
        returns (string memory name, string memory version, bytes4[] memory selectors)
    {
        name = "Trading";
        version = "1.0.0";

        // CRITICAL: All external function selectors for manifest routing
        selectors = new bytes4[](6);
        selectors[0] = this.initializeTradingFacet.selector;
        selectors[1] = this.setPaused.selector;
        selectors[2] = this.placeMarketOrder.selector;
        selectors[3] = this.isTradingFacetInitialized.selector;
        selectors[4] = this.getTradingFacetVersion.selector;
        selectors[5] = this.isTradingFacetPaused.selector;
    }
}