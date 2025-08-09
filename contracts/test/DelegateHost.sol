// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @dev Minimal router that delegatecalls to a target (mimics dispatcher behavior).
contract DelegateHost {
    address public immutable impl;

    constructor(address _impl) {
        impl = _impl;
    }

    fallback() external payable {
        address i = impl;
        assembly {
            calldatacopy(0, 0, calldatasize())
            let r := delegatecall(gas(), i, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch r
            case 0 { revert(0, returndatasize()) }
            default { return(0, returndatasize()) }
        }
    }

    receive() external payable {}
}
