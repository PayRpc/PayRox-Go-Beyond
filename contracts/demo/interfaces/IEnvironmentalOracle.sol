// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/**
 * @title IEnvironmentalOracle
 * @dev Interface for environmental impact data oracle
 */
interface IEnvironmentalOracle {
    /**
     * @dev Get environmental impact score for a region
     * @param regionId The region identifier
     * @return impactScore The environmental impact score (0-100)
     */
    function getEnvironmentalImpact(uint256 regionId) external view returns (uint256 impactScore);
    
    /**
     * @dev Get carbon offset rate for staking rewards
     * @param amount The staking amount
     * @return offsetRate The carbon offset rate as basis points
     */
    function getCarbonOffsetRate(uint256 amount) external view returns (uint256 offsetRate);
    
    /**
     * @dev Verify environmental certification
     * @param certificationHash The hash of the certification
     * @return isValid Whether the certification is valid
     */
    function verifyCertification(bytes32 certificationHash) external view returns (bool isValid);
}
