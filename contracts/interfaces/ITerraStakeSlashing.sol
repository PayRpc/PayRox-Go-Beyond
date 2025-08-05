// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.28;

/**
 * @title ITerraStakeSlashing
 * @notice Interface for slashing functionality
 */
interface ITerraStakeSlashing {
    function slashValidator(address validator, uint256 amount) external returns (bool);
    function getSlashingHistory(address validator) external view returns (uint256[] memory amounts, uint256[] memory timestamps);
    function isSlashed(address validator) external view returns (bool);
    function getTotalSlashed() external view returns (uint256);
}
