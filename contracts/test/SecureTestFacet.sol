// SPDX-License-Identifier: MIT  
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {LibDiamond} from "../utils/LibDiamond.sol";
import {GasOptimizationUtils} from "../utils/GasOptimizationUtils.sol";

// Errors (gas-efficient)
error NotInit();
error AlreadyInit(); 
error Paused();
error Reentrancy();
error NotDispatcher();

library SecureTestFacetStorage {
    bytes32 internal constant STORAGE_SLOT = keccak256("payrox.diamond.secure_test_facet.storage");
    
    struct Layout {
        bool initialized;
        bool paused;
        mapping(address => bool) authorized;
        uint256 testValue;
    }
    
    function layout() internal pure returns (Layout storage ds) {
        bytes32 slot = STORAGE_SLOT;
        assembly {
            ds.slot := slot
        }
    }
}

contract SecureTestFacet {
    using SafeERC20 for IERC20;
    
    modifier onlyInitialized() {
        if (!SecureTestFacetStorage.layout().initialized) revert NotInit();
        _;
    }
    
    modifier onlyDispatcher() {
        if (msg.sender != address(this)) revert NotDispatcher();
        _;
    }
    
    modifier whenNotPaused() {
        if (SecureTestFacetStorage.layout().paused) revert Paused();
        _;
    }
    
    modifier nonReentrant() {
        SecureTestFacetStorage.Layout storage ds = SecureTestFacetStorage.layout();
        if (ds.testValue == 1) revert Reentrancy();
        ds.testValue = 1;
        _;
        ds.testValue = 0;
    }
    
    // Test function with all security modifiers (per Fix #1)
    function testFunction(uint256 amount) external onlyInitialized onlyDispatcher whenNotPaused nonReentrant {
        SecureTestFacetStorage.layout().testValue = amount;
    }
    
    // Admin function with all security modifiers (per Fix #1) 
    function adminFunction(address target) external onlyInitialized onlyDispatcher whenNotPaused nonReentrant {
        LibDiamond.enforceManifestCall();
        SecureTestFacetStorage.layout().authorized[target] = true;
    }
    
    // View function with minimal modifiers (per Fix #1)
    function viewFunction() external view onlyInitialized returns (uint256) {
        return SecureTestFacetStorage.layout().testValue;
    }
    
    // Initialize function (per Fix #6 - scoped properly)
    function initializeSecureTestFacet() external onlyDispatcher {
        SecureTestFacetStorage.Layout storage ds = SecureTestFacetStorage.layout();
        if (ds.initialized) revert AlreadyInit();
        ds.initialized = true;
        ds.paused = false;
    }
}
