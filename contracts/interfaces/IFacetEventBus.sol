// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/**
 * @title IFacetEventBus
 * @notice Cross-facet event communication interface
 * @dev Enables standardized event communication between facets
 */
interface IFacetEventBus {
    // Cross-facet event types
    enum EventType {
        DEPLOYMENT,
        STAKING_ACTION,
        TOKEN_MINT,
        INSURANCE_CLAIM,
        VRF_REQUEST,
        PING_RECEIVED,
        SYSTEM_MAINTENANCE
    }
    
    struct CrossFacetEvent {
        EventType eventType;
        address source;
        address target;
        bytes data;
        uint256 timestamp;
        bytes32 eventId;
    }
    
    event CrossFacetEventEmitted(
        EventType indexed eventType,
        address indexed source,
        address indexed target,
        bytes32 eventId,
        uint256 timestamp
    );
    
    function emitCrossFacetEvent(
        EventType eventType,
        address target,
        bytes calldata data
    ) external returns (bytes32 eventId);
    
    function getEvent(bytes32 eventId) external view returns (CrossFacetEvent memory);
}