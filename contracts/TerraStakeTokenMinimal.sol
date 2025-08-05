// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";

contract TerraStakeToken is ERC20Upgradeable {
    function initialize() external initializer {
        __ERC20_init("TerraStake", "TERRA");
    }
    
    // AI: Minimal implementation for compilation
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}