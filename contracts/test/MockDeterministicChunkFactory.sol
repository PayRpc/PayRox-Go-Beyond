// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @dev Minimal mock exposing the bits ChunkFactoryFacet touches in tests.
contract MockDeterministicChunkFactory {
    // roles
    bytes32 public constant FEE_ROLE = keccak256("FEE_ROLE");
    mapping(bytes32 => mapping(address => bool)) private _roles;

    // fee/tier state
    mapping(uint8 => uint256) public tierFees;
    mapping(address => uint8) public userTiers;
    bool public feesEnabled;
    uint256 public baseFeeWei;
    uint256 private _deploymentCount;

    // events (optional)
    event TierFeeSet(uint8 indexed tier, uint256 fee);

    // role helpers
    function grantRole(bytes32 role, address who) external {
        _roles[role][who] = true;
    }

    function hasRole(bytes32 role, address who) public view returns (bool) {
        return _roles[role][who];
    }

    // admin functions used by the facet
    function setTierFee(uint8 tier, uint256 fee) external {
        require(hasRole(FEE_ROLE, msg.sender), "not fee");
        tierFees[tier] = fee;
        emit TierFeeSet(tier, fee);
    }

    function withdrawFees() external {}
    function pause() external {}
    function unpause() external {}

    // getters the facet uses
    function deploymentCount() external view returns (uint256) { return _deploymentCount; }
    function setBaseFeeWei(uint256 v) external { baseFeeWei = v; }
    function setFeesEnabled(bool v) external { feesEnabled = v; }
    function setUserTier(address user, uint8 tier) external { userTiers[user] = tier; }

    // misc getters (facet’s helpers)
    function isDeployedContract(address) external pure returns (bool) { return false; }
    function verifySystemIntegrity() external pure returns (bool) { return true; }
    function expectedManifestHash() external pure returns (bytes32) { return bytes32(0); }
    function expectedFactoryBytecodeHash() external pure returns (bytes32) { return bytes32(0); }
    function expectedManifestDispatcher() external pure returns (address) { return address(0); }
}
