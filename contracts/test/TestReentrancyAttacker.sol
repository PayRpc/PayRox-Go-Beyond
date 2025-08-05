// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/**
 * @title TestReentrancyAttacker
 * @notice Test contract to verify reentrancy protection in ManifestDispatcher
 */
contract TestReentrancyAttacker {
    address public target;
    bool public attacked = false;

    constructor() {}

    function setTarget(address _target) external {
        target = _target;
    }

    function attack() external {
        if (!attacked) {
            attacked = true;
            // Attempt reentrancy call back to target
            if (target != address(0)) {
                (bool success,) = target.call(abi.encodeWithSignature("attack()"));
                // This should fail due to reentrancy guard
            }
        }
    }

    // Fallback to receive reentrancy calls
    fallback() external payable {
        if (!attacked && target != address(0)) {
            this.attack();
        }
    }

    receive() external payable {
        if (!attacked && target != address(0)) {
            this.attack();
        }
    }
}
