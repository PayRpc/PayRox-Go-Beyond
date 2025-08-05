// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title TerraStakeCoreFacet
 * @dev Core management facet for TerraStake system - handles admin, roles, and emergency functions
 * @author PayRox Go Beyond Team
 */
contract TerraStakeCoreFacet is 
    Initializable,
    AccessControlUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable
{
    // ============ Diamond-Safe Storage ============
    bytes32 private constant _SLOT = keccak256("payrox.facets.terrastake.core.v1");

    struct Layout {
        // Emergency and security
        mapping(address => uint256) emergencyWithdrawRequests;
        uint256 emergencyWithdrawDelay;
        bool initialized;
    }

    function _layout() private pure returns (Layout storage l) {
        bytes32 slot = _SLOT;
        assembly { l.slot := slot }
    }

    // ============ Role Definitions ============
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");
    bytes32 public constant FRACTIONALIZATION_ROLE = keccak256("FRACTIONALIZATION_ROLE");

    // ============ Events ============
    event EmergencyWithdrawRequested(address indexed user, uint256 timestamp);
    event SecurityAlert(uint256 indexed alertType, address indexed actor, bytes32 indexed context, uint256 severity);

    // ============ Custom Errors ============
    error TerraStakeCore__Unauthorized(address caller, bytes32 role);
    error TerraStakeCore__EmergencyWithdrawNotReady(address user, uint256 readyTime);
    error TerraStakeCore__AlreadyInitialized();

    // ============ Modifiers ============
    modifier onlyInitialized() {
        require(_layout().initialized, "TerraStakeCore: not initialized");
        _;
    }

    // ============ Initialization ============
    
    /**
     * @dev Initialize the core facet
     * @param _admin Address to grant admin role
     */
    function initializeCore(address _admin) external initializer {
        __AccessControl_init();
        __Pausable_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        Layout storage l = _layout();
        if (l.initialized) revert TerraStakeCore__AlreadyInitialized();

        // Grant roles to admin
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(MINTER_ROLE, _admin);
        _grantRole(UPGRADER_ROLE, _admin);
        _grantRole(ORACLE_ROLE, _admin);
        _grantRole(EMERGENCY_ROLE, _admin);
        _grantRole(FRACTIONALIZATION_ROLE, _admin);

        // Set emergency withdraw delay to 24 hours
        l.emergencyWithdrawDelay = 24 hours;
        l.initialized = true;
    }

    // ============ Emergency Functions ============
    
    /**
     * @dev Request emergency withdrawal (with delay for security)
     */
    function requestEmergencyWithdraw() 
        external 
        onlyInitialized
        whenNotPaused
    {
        Layout storage l = _layout();
        l.emergencyWithdrawRequests[msg.sender] = block.timestamp + l.emergencyWithdrawDelay;
        emit EmergencyWithdrawRequested(msg.sender, block.timestamp);
    }
    
    /**
     * @dev Check if emergency withdrawal is ready
     * @param user Address to check
     * @return isReady Whether emergency withdrawal is ready
     * @return readyTime When it will be ready (0 if ready)
     */
    function checkEmergencyWithdrawStatus(address user) 
        external 
        view 
        returns (bool isReady, uint256 readyTime) 
    {
        Layout storage l = _layout();
        readyTime = l.emergencyWithdrawRequests[user];
        isReady = readyTime != 0 && block.timestamp >= readyTime;
    }
    
    /**
     * @dev Clear emergency withdrawal request
     * @param user Address to clear request for
     */
    function clearEmergencyWithdrawRequest(address user) 
        external 
        onlyInitialized
        nonReentrant
    {
        // Can be called by the user themselves or emergency role
        require(
            msg.sender == user || hasRole(EMERGENCY_ROLE, msg.sender),
            "TerraStakeCore: unauthorized"
        );
        
        Layout storage l = _layout();
        delete l.emergencyWithdrawRequests[user];
    }
    
    /**
     * @dev Emergency pause (only emergency role)
     */
    function emergencyPause() external onlyRole(EMERGENCY_ROLE) {
        _pause();
        emit SecurityAlert(2, msg.sender, keccak256("EMERGENCY_PAUSE"), 3);
    }
    
    /**
     * @dev Emergency unpause (only emergency role)
     */
    function emergencyUnpause() external onlyRole(EMERGENCY_ROLE) {
        _unpause();
    }

    // ============ Admin Functions ============
    
    /**
     * @dev Update emergency withdraw delay
     * @param delay New delay in seconds
     */
    function updateEmergencyWithdrawDelay(uint256 delay) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
        onlyInitialized
    {
        require(delay >= 1 hours && delay <= 7 days, "TerraStakeCore: invalid delay");
        Layout storage l = _layout();
        l.emergencyWithdrawDelay = delay;
    }

    /**
     * @dev Get current emergency withdraw delay
     * @return delay Current delay in seconds
     */
    function getEmergencyWithdrawDelay() external view returns (uint256 delay) {
        return _layout().emergencyWithdrawDelay;
    }

    // ============ Upgrade Authorization ============
    
    /**
     * @dev Authorize upgrade (UUPS pattern)
     * @param newImplementation Address of new implementation
     */
    function _authorizeUpgrade(address newImplementation) 
        internal 
        override 
        onlyRole(UPGRADER_ROLE) 
    {
        emit SecurityAlert(3, msg.sender, keccak256(abi.encodePacked(newImplementation)), 1);
    }

    // ============ View Functions ============
    
    /**
     * @dev Check if core facet is initialized
     * @return Whether the facet is initialized
     */
    function isCoreInitialized() external view returns (bool) {
        return _layout().initialized;
    }

    // ============ Interface Support ============
    
    /**
     * @dev See {IERC165-supportsInterface}
     */
    function supportsInterface(bytes4 interfaceId) 
        public 
        view 
        virtual
        override(AccessControlUpgradeable) 
        returns (bool) 
    {
        return super.supportsInterface(interfaceId);
    }

    // ============ Facet Info ============
    
    /**
     * @dev Get facet information for Diamond Loupe compatibility
     * @return name Facet name
     * @return version Facet version
     * @return selectors Function selectors
     */
    function getFacetInfo()
        external
        pure
        returns (string memory name, string memory version, bytes4[] memory selectors)
    {
        name = "TerraStakeCoreFacet";
        version = "1.0.0";

        selectors = new bytes4[](10);
        selectors[0] = this.initializeCore.selector;
        selectors[1] = this.requestEmergencyWithdraw.selector;
        selectors[2] = this.checkEmergencyWithdrawStatus.selector;
        selectors[3] = this.clearEmergencyWithdrawRequest.selector;
        selectors[4] = this.emergencyPause.selector;
        selectors[5] = this.emergencyUnpause.selector;
        selectors[6] = this.updateEmergencyWithdrawDelay.selector;
        selectors[7] = this.getEmergencyWithdrawDelay.selector;
        selectors[8] = this.isCoreInitialized.selector;
        selectors[9] = this.getFacetInfo.selector;
    }
}
