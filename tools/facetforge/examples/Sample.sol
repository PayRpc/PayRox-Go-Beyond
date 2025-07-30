// SPDX-License-Identifier: MIT
// Example: Using the enhanced PayRox system
pragma solidity ^0.8.20;

/**
 * Sample contract for testing FacetForge analysis
 * Demonstrates various patterns that the toolset should detect
 */
contract Sample {
    // State variables
    uint256 public totalSupply;
    mapping(address => uint256) public balances;
    mapping(address => mapping(address => uint256)) public allowances;

    // Events
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    // Modifiers
    modifier onlyPositive(uint256 amount) {
        require(amount > 0, "Amount must be positive");
        _;
    }

    modifier validAddress(address addr) {
        require(addr != address(0), "Invalid address");
        _;
    }

    // Constructor
    constructor(uint256 _initialSupply) {
        totalSupply = _initialSupply;
        balances[msg.sender] = _initialSupply;
        emit Transfer(address(0), msg.sender, _initialSupply);
    }

    // Standard ERC20-like functions (should be detected by FacetForge)
    function balanceOf(address account) external view returns (uint256) {
        return balances[account];
    }

    function transfer(address to, uint256 amount)
        external
        validAddress(to)
        onlyPositive(amount)
        returns (bool)
    {
        require(balances[msg.sender] >= amount, "Insufficient balance");

        balances[msg.sender] -= amount;
        balances[to] += amount;

        emit Transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount)
        external
        validAddress(spender)
        returns (bool)
    {
        allowances[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function allowance(address owner, address spender)
        external
        view
        returns (uint256)
    {
        return allowances[owner][spender];
    }

    // Complex function with multiple parameters (high complexity score)
    function complexOperation(
        address[] calldata addresses,
        uint256[] calldata amounts,
        bytes calldata data,
        bool shouldValidate
    ) external returns (bool success, bytes memory result) {
        require(addresses.length == amounts.length, "Array length mismatch");

        for (uint i = 0; i < addresses.length; i++) {
            if (shouldValidate) {
                require(addresses[i] != address(0), "Invalid address in array");
                require(amounts[i] > 0, "Invalid amount in array");
            }

            // Simulate complex operation
            balances[addresses[i]] += amounts[i];
            emit Transfer(address(0), addresses[i], amounts[i]);
        }

        // Process additional data
        if (data.length > 0) {
            result = data;
            success = true;
        }

        return (success, result);
    }

    // Administrative functions (should be flagged as unprotected)
    function mint(address to, uint256 amount) external {
        balances[to] += amount;
        totalSupply += amount;
        emit Transfer(address(0), to, amount);
    }

    function burn(uint256 amount) external {
        require(balances[msg.sender] >= amount, "Insufficient balance to burn");
        balances[msg.sender] -= amount;
        totalSupply -= amount;
        emit Transfer(msg.sender, address(0), amount);
    }

    // Fallback and receive functions (should be detected)
    fallback() external payable {
        // Handle unknown function calls
    }

    receive() external payable {
        // Handle plain Ether transfers
    }

    // Pure and view functions (lower gas estimates)
    function calculateHash(bytes calldata data) external pure returns (bytes32) {
        return keccak256(data);
    }

    function getMetadata() external view returns (string memory, uint256, address) {
        return ("Sample Token", totalSupply, address(this));
    }
}
