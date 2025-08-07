// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Dynamic OZ imports using the resolver
import "../utils/OpenZeppelinDynamicAdapter.sol";

// Standard PayRox imports
import "../utils/LibDiamond.sol";

/**
 * @title EnhancedExchangeBeyondFacet
 * @notice Enhanced DEX facet with dynamic OpenZeppelin integration
 * @dev Demonstrates seamless OZ dynamic compatibility in PayRox ecosystem
 */
contract EnhancedExchangeBeyondFacet {
    using OpenZeppelinDynamicAdapter for address;
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // Storage Structure
    // ═══════════════════════════════════════════════════════════════════════════════
    
    struct Order {
        address trader;
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 minAmountOut;
        uint256 deadline;
        bool isActive;
    }
    
    struct ExchangeStorage {
        mapping(bytes32 => Order) orders;
        mapping(address => bool) authorizedTokens;
        mapping(address => uint256) nonces;
        uint256 totalOrders;
        bool emergencyPaused;
        address ozAccessControl;  // Dynamic OZ AccessControl contract
        address ozPausable;       // Dynamic OZ Pausable contract
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // Storage Location
    // ═══════════════════════════════════════════════════════════════════════════════
    
    bytes32 private constant EXCHANGE_STORAGE_POSITION = 
        keccak256("payrox.facets.exchange.beyond.storage");
    
    function exchangeStorage() internal pure returns (ExchangeStorage storage es) {
        bytes32 position = EXCHANGE_STORAGE_POSITION;
        assembly {
            es.slot := position
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // Events
    // ═══════════════════════════════════════════════════════════════════════════════
    
    event OrderCreated(
        bytes32 indexed orderId,
        address indexed trader,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut
    );
    
    event OrderExecuted(
        bytes32 indexed orderId,
        address indexed trader,
        uint256 amountOut,
        uint256 timestamp
    );
    
    event OZIntegrationUpdated(
        address indexed ozContract,
        string contractType,
        uint8 ozVersion
    );
    
    event SecurityStatusChanged(
        address indexed actor,
        string action,
        bool status
    );
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // Custom Errors
    // ═══════════════════════════════════════════════════════════════════════════════
    
    error UnauthorizedAccess(address caller);
    error OrderNotFound(bytes32 orderId);
    error OrderExpired(bytes32 orderId, uint256 deadline);
    error InsufficientOutput(uint256 expected, uint256 actual);
    error SystemPaused();
    error OZIntegrationFailed(address ozContract, string reason);
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // Modifiers with Dynamic OZ Integration
    // ═══════════════════════════════════════════════════════════════════════════════
    
    modifier onlyAuthorized() {
        ExchangeStorage storage es = exchangeStorage();
        
        if (es.ozAccessControl != address(0)) {
            // Use dynamic OZ AccessControl
            bytes32 traderRole = keccak256("TRADER_ROLE");
            bool hasRole = OpenZeppelinDynamicAdapter.checkRoleDynamic(
                es.ozAccessControl,
                traderRole,
                msg.sender
            );
            
            if (!hasRole) {
                revert UnauthorizedAccess(msg.sender);
            }
        } else {
            // Fallback to LibDiamond enforcement
            LibDiamond.enforceManifestCall();
        }
        _;
    }
    
    modifier whenNotPaused() {
        ExchangeStorage storage es = exchangeStorage();
        
        if (es.ozPausable != address(0)) {
            // Use dynamic OZ Pausable
            bool isPaused = OpenZeppelinDynamicAdapter.isPausedDynamic(es.ozPausable);
            if (isPaused) {
                revert SystemPaused();
            }
        } else {
            // Check local emergency pause
            if (es.emergencyPaused) {
                revert SystemPaused();
            }
        }
        _;
    }
    
    modifier whenPaused() {
        ExchangeStorage storage es = exchangeStorage();
        
        if (es.ozPausable != address(0)) {
            bool isPaused = OpenZeppelinDynamicAdapter.isPausedDynamic(es.ozPausable);
            if (!isPaused) {
                revert("ExchangeBeyond: not paused");
            }
        } else {
            if (!es.emergencyPaused) {
                revert("ExchangeBeyond: not paused");
            }
        }
        _;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // Dynamic OZ Configuration
    // ═══════════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Configure OpenZeppelin integration dynamically
     * @param ozAccessControl Address of OZ AccessControl contract (optional)
     * @param ozPausable Address of OZ Pausable contract (optional)
     */
    function configureOZIntegration(
        address ozAccessControl,
        address ozPausable
    ) external onlyAuthorized {
        ExchangeStorage storage es = exchangeStorage();
        
        // Validate OZ contracts if provided
        if (ozAccessControl != address(0)) {
            (bool isCompatible, uint8 version) = OpenZeppelinDynamicAdapter.validateCompatibility(ozAccessControl);
            if (!isCompatible) {
                revert OZIntegrationFailed(ozAccessControl, "AccessControl not compatible");
            }
            
            es.ozAccessControl = ozAccessControl;
            emit OZIntegrationUpdated(ozAccessControl, "AccessControl", version);
        }
        
        if (ozPausable != address(0)) {
            (bool isCompatible, uint8 version) = OpenZeppelinDynamicAdapter.validateCompatibility(ozPausable);
            if (!isCompatible) {
                revert OZIntegrationFailed(ozPausable, "Pausable not compatible");
            }
            
            es.ozPausable = ozPausable;
            emit OZIntegrationUpdated(ozPausable, "Pausable", version);
        }
    }
    
    /**
     * @notice Get current OZ integration status
     * @return accessControl Current AccessControl contract
     * @return pausable Current Pausable contract
     * @return accessVersion OZ version of AccessControl
     * @return pausableVersion OZ version of Pausable
     */
    function getOZIntegration() external view returns (
        address accessControl,
        address pausable,
        uint8 accessVersion,
        uint8 pausableVersion
    ) {
        ExchangeStorage storage es = exchangeStorage();
        
        accessControl = es.ozAccessControl;
        pausable = es.ozPausable;
        
        if (accessControl != address(0)) {
            accessVersion = OpenZeppelinDynamicAdapter.detectOZVersion(accessControl);
        }
        
        if (pausable != address(0)) {
            pausableVersion = OpenZeppelinDynamicAdapter.detectOZVersion(pausable);
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // Core Exchange Functions
    // ═══════════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Create a new limit order with dynamic OZ security
     * @param tokenIn Input token address
     * @param tokenOut Output token address
     * @param amountIn Amount of input token
     * @param minAmountOut Minimum output amount
     * @param deadline Order expiration timestamp
     * @return orderId Generated order ID
     */
    function createOrder(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        uint256 deadline
    ) external onlyAuthorized whenNotPaused returns (bytes32 orderId) {
        require(tokenIn != address(0) && tokenOut != address(0), "ExchangeBeyond: invalid tokens");
        require(amountIn > 0 && minAmountOut > 0, "ExchangeBeyond: invalid amounts");
        require(deadline > block.timestamp, "ExchangeBeyond: invalid deadline");
        
        ExchangeStorage storage es = exchangeStorage();
        
        // Generate unique order ID
        orderId = keccak256(abi.encodePacked(
            msg.sender,
            tokenIn,
            tokenOut,
            amountIn,
            es.nonces[msg.sender]++,
            block.timestamp
        ));
        
        // Create order
        es.orders[orderId] = Order({
            trader: msg.sender,
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            amountIn: amountIn,
            minAmountOut: minAmountOut,
            deadline: deadline,
            isActive: true
        });
        
        es.totalOrders++;
        
        // Transfer input tokens using dynamic SafeERC20
        OpenZeppelinDynamicAdapter.safeTransferFromDynamic(
            tokenIn,
            msg.sender,
            address(this),
            amountIn
        );
        
        emit OrderCreated(orderId, msg.sender, tokenIn, tokenOut, amountIn, minAmountOut);
    }
    
    /**
     * @notice Execute an order with dynamic security checks
     * @param orderId Order to execute
     * @param amountOut Actual output amount
     */
    function executeOrder(
        bytes32 orderId,
        uint256 amountOut
    ) external onlyAuthorized whenNotPaused {
        ExchangeStorage storage es = exchangeStorage();
        Order storage order = es.orders[orderId];
        
        if (!order.isActive) {
            revert OrderNotFound(orderId);
        }
        
        if (block.timestamp > order.deadline) {
            revert OrderExpired(orderId, order.deadline);
        }
        
        if (amountOut < order.minAmountOut) {
            revert InsufficientOutput(order.minAmountOut, amountOut);
        }
        
        // Mark order as executed
        order.isActive = false;
        
        // Transfer output tokens using dynamic SafeERC20
        OpenZeppelinDynamicAdapter.safeTransferDynamic(
            order.tokenOut,
            order.trader,
            amountOut
        );
        
        emit OrderExecuted(orderId, order.trader, amountOut, block.timestamp);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // Security Functions with Dynamic OZ
    // ═══════════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Emergency pause using dynamic OZ or local state
     */
    function emergencyPause() external onlyAuthorized {
        ExchangeStorage storage es = exchangeStorage();
        
        if (es.ozPausable != address(0)) {
            // Use dynamic OZ Pausable
            OpenZeppelinDynamicAdapter.pauseDynamic(es.ozPausable);
        } else {
            // Use local emergency pause
            es.emergencyPaused = true;
        }
        
        emit SecurityStatusChanged(msg.sender, "pause", true);
    }
    
    /**
     * @notice Emergency unpause using dynamic OZ or local state
     */
    function emergencyUnpause() external onlyAuthorized {
        ExchangeStorage storage es = exchangeStorage();
        
        if (es.ozPausable != address(0)) {
            // Use dynamic OZ Pausable
            OpenZeppelinDynamicAdapter.unpauseDynamic(es.ozPausable);
        } else {
            // Use local emergency pause
            es.emergencyPaused = false;
        }
        
        emit SecurityStatusChanged(msg.sender, "unpause", false);
    }
    
    /**
     * @notice Grant trading role using dynamic OZ AccessControl
     * @param account Account to grant role to
     */
    function grantTraderRole(address account) external onlyAuthorized {
        ExchangeStorage storage es = exchangeStorage();
        
        if (es.ozAccessControl != address(0)) {
            bytes32 traderRole = keccak256("TRADER_ROLE");
            OpenZeppelinDynamicAdapter.grantRoleDynamic(
                es.ozAccessControl,
                traderRole,
                account
            );
            
            emit SecurityStatusChanged(account, "grant_trader_role", true);
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // View Functions
    // ═══════════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Get order details
     * @param orderId Order to query
     * @return order Order struct
     */
    function getOrder(bytes32 orderId) external view returns (Order memory order) {
        ExchangeStorage storage es = exchangeStorage();
        return es.orders[orderId];
    }
    
    /**
     * @notice Check if system is paused (dynamic OZ or local)
     * @return isPaused Current pause status
     */
    function isPaused() external view returns (bool isPaused) {
        ExchangeStorage storage es = exchangeStorage();
        
        if (es.ozPausable != address(0)) {
            return OpenZeppelinDynamicAdapter.isPausedDynamic(es.ozPausable);
        } else {
            return es.emergencyPaused;
        }
    }
    
    /**
     * @notice Get exchange statistics
     * @return totalOrders Total orders created
     * @return ozIntegrated Whether OZ integration is active
     */
    function getExchangeStats() external view returns (
        uint256 totalOrders,
        bool ozIntegrated
    ) {
        ExchangeStorage storage es = exchangeStorage();
        totalOrders = es.totalOrders;
        ozIntegrated = (es.ozAccessControl != address(0) || es.ozPausable != address(0));
    }
}
