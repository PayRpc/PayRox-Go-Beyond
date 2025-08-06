// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Template: Facet.Core@2.0.0
// Hash: a9b76ab3494936c7
// Generated: 2025-08-06T22:37:53.607Z

import "../utils/LibDiamond.sol";

/// ---------- Standard Errors (gas-efficient) ----------
error NotInitialized();
error AlreadyInitialized();
error Paused();
error Unauthorized();
error InvalidParam();
error Reentrancy();

/// ---------- Storage (namespaced, collision-safe) ----------
bytes32 constant VAULT_SLOT = keccak256("payrox.facet.vault.v1");

struct VaultFacetLayout {
    // Custom storage fields (filled by generator)
    // Custom storage fields will be added here
    
    // Standard lifecycle & security (always present)
    bool initialized;
    bool paused;
    address operator;
    uint8 version;
    uint256 _reentrancy; // 1=unlocked, 2=locked
}

function _s() pure returns (VaultFacetLayout storage l) {
    bytes32 slot = VAULT_SLOT;
    assembly { l.slot := slot }
}

/**
 * @title VaultFacet
 * @notice Minimal facet archetype with initialization, pause, and reentrancy protection
 * @dev Facet-safe: namespaced storage, custom reentrancy, dispatcher gating
 * @custom:archetype core
 * @custom:version 2.0.0
 */
contract VaultFacet {
    
    /// ---------- Events ----------
    event VaultFacetInitialized(address indexed operator, uint256 timestamp);
    event PauseStatusChanged(bool paused);
    // Custom events will be added here

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
        VaultFacetLayout storage l = _s();
        if (l._reentrancy == 2) revert Reentrancy();
        l._reentrancy = 2;
        _;
        l._reentrancy = 1;
    }

    /// ---------- Initialization (no constructor pattern) ----------
    function initializeVaultFacet(
        address operator_
        
    ) external onlyDispatcher {
        if (operator_ == address(0)) revert Unauthorized();
        
        VaultFacetLayout storage l = _s();
        if (l.initialized) revert AlreadyInitialized();

        l.initialized = true;
        l.operator = operator_;
        l.version = 1;
        l.paused = false;
        l._reentrancy = 1;
        
        // Custom initialization logic here

        emit VaultFacetInitialized(operator_, block.timestamp);
    }

    /// ---------- Admin Functions (operator-gated via dispatcher) ----------
    function setPaused(bool paused_) external onlyDispatcher onlyOperator whenInitialized {
        _s().paused = paused_;
        emit PauseStatusChanged(paused_);
    }

    // Custom admin functions will be added here

    /// ---------- Core Business Logic (filled by generator) ----------
    // Custom core functions will be added here

    /// ---------- View Functions ----------
    function isVaultFacetInitialized() external view returns (bool) {
        return _s().initialized;
    }
    
    function getVaultFacetVersion() external view returns (uint8) {
        return _s().version;
    }
    
    function isVaultFacetPaused() external view returns (bool) {
        return _s().paused;
    }

    // Custom view functions will be added here

    /// ---------- Manifest Integration (REQUIRED) ----------
    function getFacetInfo()
        external
        pure
        returns (string memory name, string memory version, bytes4[] memory selectors)
    {
        name = "Vault";
        version = "2.0.0";

        // Exact selector count (no zeros, prevents manifest failures)
        selectors = new bytes4[](5);
        uint256 i = 0;
        
        // Standard selectors (always present)
        selectors[i++] = this.initializeVaultFacet.selector;
        selectors[i++] = this.setPaused.selector;
        selectors[i++] = this.isVaultFacetInitialized.selector;
        selectors[i++] = this.getVaultFacetVersion.selector;
        selectors[i++] = this.isVaultFacetPaused.selector;
        
        
    }
}
