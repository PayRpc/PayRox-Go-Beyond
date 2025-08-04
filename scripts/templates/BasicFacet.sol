// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/**
 * @title {{FACET_NAME}}
 * @notice {{DESCRIPTION}}
 * @dev Diamond-safe storage pattern for delegatecall compatibility
 * @author PayRox Enhancement Suite
 */
contract {{FACET_NAME}} {
    
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
    
    event FunctionExecuted(string indexed functionName, address indexed caller, uint256 timestamp);
    event DataUpdated(bytes32 indexed key, address indexed updater, uint256 timestamp);
    event StateChanged(uint256 indexed oldState, uint256 indexed newState, address indexed changer);
    
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
    // ERRORS
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
    
    error Unauthorized(address caller);
    error InvalidInput(string parameter);
    error InsufficientPermissions(address caller, string action);
    error StateTransitionFailed(uint256 from, uint256 to);
    
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
    // STORAGE
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
    
    // Diamond-safe storage using unique namespace
    bytes32 private constant _SLOT = keccak256("payrox.facets.{{FACET_NAME}}.v1");

    struct Layout {
        // User interaction tracking
        mapping(address => uint256) userCounts;
        mapping(address => uint256) lastInteraction;
        
        // State management
        uint256 totalExecutions;
        uint256 currentState;
        address lastCaller;
        
        // Configuration
        bool paused;
        mapping(address => bool) authorized;
        
        // Data storage
        mapping(bytes32 => bytes) data;
        mapping(bytes32 => address) dataOwners;
        
        // Feature flags
        mapping(string => bool) features;
    }

    function _layout() private pure returns (Layout storage l) {
        bytes32 slot = _SLOT;
        assembly { l.slot := slot }
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
    // MODIFIERS
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
    
    modifier whenNotPaused() {
        Layout storage l = _layout();
        require(!l.paused, "{{FACET_NAME}}: paused");
        _;
    }
    
    modifier onlyAuthorized() {
        Layout storage l = _layout();
        require(l.authorized[msg.sender], "{{FACET_NAME}}: unauthorized");
        _;
    }
    
    modifier updateInteraction() {
        Layout storage l = _layout();
        l.totalExecutions++;
        l.lastCaller = msg.sender;
        l.userCounts[msg.sender]++;
        l.lastInteraction[msg.sender] = block.timestamp;
        _;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
    // GENERATED FUNCTIONS (PLACEHOLDER)
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
    
    {{FUNCTIONS}}
    
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
    // ADMINISTRATION FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Initialize the facet with basic configuration
     * @param admin Initial admin address
     */
    function initialize(address admin) external {
        Layout storage l = _layout();
        require(!l.authorized[admin], "{{FACET_NAME}}: already initialized");
        
        l.authorized[admin] = true;
        l.currentState = 1; // Active state
        
        emit StateChanged(0, 1, admin);
    }
    
    /**
     * @notice Set authorization for an address
     * @param user Address to authorize/deauthorize
     * @param authorized Authorization status
     */
    function setAuthorized(address user, bool authorized) external onlyAuthorized {
        Layout storage l = _layout();
        l.authorized[user] = authorized;
        
        emit DataUpdated(keccak256(abi.encodePacked("auth", user)), msg.sender, block.timestamp);
    }
    
    /**
     * @notice Pause or unpause the facet
     * @param _paused Pause status
     */
    function setPaused(bool _paused) external onlyAuthorized {
        Layout storage l = _layout();
        l.paused = _paused;
        
        emit StateChanged(l.paused ? 0 : 1, _paused ? 1 : 0, msg.sender);
    }
    
    /**
     * @notice Enable or disable a feature
     * @param feature Feature name
     * @param enabled Feature status
     */
    function setFeature(string calldata feature, bool enabled) external onlyAuthorized {
        Layout storage l = _layout();
        l.features[feature] = enabled;
        
        emit DataUpdated(keccak256(bytes(feature)), msg.sender, block.timestamp);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Get facet information
     * @return name Facet name
     * @return version Facet version
     * @return description Facet description
     */
    function getFacetInfo() external pure returns (
        string memory name, 
        string memory version, 
        string memory description
    ) {
        name = "{{FACET_NAME}}";
        version = "1.0.0";
        description = "{{DESCRIPTION}}";
    }
    
    /**
     * @notice Get user interaction statistics
     * @param user User address
     * @return count Number of interactions
     * @return lastTime Last interaction timestamp
     */
    function getUserStats(address user) external view returns (uint256 count, uint256 lastTime) {
        Layout storage l = _layout();
        count = l.userCounts[user];
        lastTime = l.lastInteraction[user];
    }
    
    /**
     * @notice Get facet state information
     * @return totalExecutions Total number of executions
     * @return currentState Current state
     * @return lastCaller Last caller address
     * @return paused Pause status
     */
    function getStateInfo() external view returns (
        uint256 totalExecutions,
        uint256 currentState,
        address lastCaller,
        bool paused
    ) {
        Layout storage l = _layout();
        totalExecutions = l.totalExecutions;
        currentState = l.currentState;
        lastCaller = l.lastCaller;
        paused = l.paused;
    }
    
    /**
     * @notice Check if an address is authorized
     * @param user Address to check
     * @return authorized Authorization status
     */
    function isAuthorized(address user) external view returns (bool authorized) {
        Layout storage l = _layout();
        authorized = l.authorized[user];
    }
    
    /**
     * @notice Check if a feature is enabled
     * @param feature Feature name
     * @return enabled Feature status
     */
    function isFeatureEnabled(string calldata feature) external view returns (bool enabled) {
        Layout storage l = _layout();
        enabled = l.features[feature];
    }
    
    /**
     * @notice Get stored data
     * @param key Data key
     * @return data Stored data
     * @return owner Data owner
     */
    function getData(bytes32 key) external view returns (bytes memory data, address owner) {
        Layout storage l = _layout();
        data = l.data[key];
        owner = l.dataOwners[key];
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
    // UTILITY FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Store data with ownership tracking
     * @param key Data key
     * @param data Data to store
     */
    function storeData(bytes32 key, bytes calldata data) external whenNotPaused updateInteraction {
        Layout storage l = _layout();
        l.data[key] = data;
        l.dataOwners[key] = msg.sender;
        
        emit DataUpdated(key, msg.sender, block.timestamp);
    }
    
    /**
     * @notice Emergency function to reset state
     * @dev Only callable by authorized users in emergency situations
     */
    function emergencyReset() external onlyAuthorized {
        Layout storage l = _layout();
        uint256 oldState = l.currentState;
        l.currentState = 0; // Emergency state
        l.paused = true;
        
        emit StateChanged(oldState, 0, msg.sender);
    }
    
    /**
     * @notice Batch operation for efficiency
     * @param keys Array of data keys
     * @param values Array of data values
     */
    function batchStoreData(
        bytes32[] calldata keys, 
        bytes[] calldata values
    ) external whenNotPaused updateInteraction {
        require(keys.length == values.length, "{{FACET_NAME}}: length mismatch");
        
        Layout storage l = _layout();
        
        for (uint256 i = 0; i < keys.length; i++) {
            l.data[keys[i]] = values[i];
            l.dataOwners[keys[i]] = msg.sender;
            emit DataUpdated(keys[i], msg.sender, block.timestamp);
        }
    }
}
