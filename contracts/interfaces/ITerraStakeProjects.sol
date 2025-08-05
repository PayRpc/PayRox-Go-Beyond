// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.28;

/**
 * @title ITerraStakeProjects
 * @notice Interface for project management
 */
interface ITerraStakeProjects {
    function projectExists(uint256 projectId) external view returns (bool);
    function incrementStakerCount(uint256 projectId) external;
    function decrementStakerCount(uint256 projectId) external;
    function getProjectCount() external view returns (uint256);
    function createProject(string calldata name, string calldata description) external returns (uint256);
    function getProjectInfo(uint256 projectId) external view returns (string memory name, string memory description, uint256 stakerCount);
}
