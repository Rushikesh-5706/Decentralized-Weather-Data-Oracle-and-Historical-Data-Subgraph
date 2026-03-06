// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@chainlink/contracts/src/v0.8/interfaces/LinkTokenInterface.sol";

contract MockLinkToken is LinkTokenInterface {
    mapping(address => uint256) public balances;
    mapping(address => mapping(address => uint256)) public allowances;
    uint256 public totalSupply = 1000000 * 10**18;

    constructor() {
        balances[msg.sender] = totalSupply;
    }

    function allowance(address owner, address spender) external view override returns (uint256) { return allowances[owner][spender]; }
    function approve(address spender, uint256 value) external override returns (bool) { allowances[msg.sender][spender] = value; return true; }
    function balanceOf(address owner) external view override returns (uint256) { return balances[owner]; }
    function decimals() external pure override returns (uint8) { return 18; }
    function decreaseApproval(address spender, uint256 addedValue) external override returns (bool) { return true; }
    function increaseApproval(address spender, uint256 subtractedValue) external override { }
    function name() external pure override returns (string memory) { return "Mock Link"; }
    function symbol() external pure override returns (string memory) { return "LINK"; }
    function transfer(address to, uint256 value) external override returns (bool) {
        require(balances[msg.sender] >= value, "Insufficient balance");
        balances[msg.sender] -= value;
        balances[to] += value;
        return true;
    }
    function transferAndCall(address to, uint256 value, bytes calldata data) external override returns (bool) {
        require(balances[msg.sender] >= value, "Insufficient balance");
        balances[msg.sender] -= value;
        balances[to] += value;
        // Mock simple callback if the target has an onTokenTransfer
        (bool success, ) = to.call(abi.encodeWithSignature("onTokenTransfer(address,uint256,bytes)", msg.sender, value, data));
        require(success, "TransferAndCall failed");
        return true;
    }
    function transferFrom(address from, address to, uint256 value) external override returns (bool) { return true; }
}
