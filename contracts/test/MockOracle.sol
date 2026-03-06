// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract MockOracle {
    event OracleRequest(
        bytes32 indexed specId,
        address requester,
        bytes32 requestId,
        uint256 payment,
        address callbackAddr,
        bytes4 callbackFunctionId,
        uint256 cancelExpiration,
        uint256 dataVersion,
        bytes data
    );

    address public owner;
    
    constructor() {
        owner = msg.sender;
    }

    function oracleRequest(
        address sender,
        uint256 payment,
        bytes32 specId,
        address callbackAddress,
        bytes4 callbackFunctionId,
        uint256 nonce,
        uint256 dataVersion,
        bytes calldata data
    ) external {
        bytes32 requestId = keccak256(abi.encodePacked(sender, nonce));
        emit OracleRequest(specId, sender, requestId, payment, callbackAddress, callbackFunctionId, block.timestamp + 5 minutes, dataVersion, data);
    }
    
    function onTokenTransfer(address, uint256, bytes calldata) external { }

    function fulfillOracleRequest(
        bytes32 requestId,
        uint256 payment,
        address callbackAddress,
        bytes4 callbackFunctionId,
        uint256 expiration,
        bytes32 data
    ) external returns (bool) {
        (bool success, ) = callbackAddress.call(abi.encodeWithSelector(callbackFunctionId, requestId, data));
        return success;
    }
    
    // Helper to return int256
    function fulfillOracleRequestInt256(
        bytes32 requestId,
        address callbackAddress,
        bytes4 callbackFunctionId,
        int256 data
    ) external returns (bool) {
        (bool success, bytes memory retData) = callbackAddress.call(abi.encodeWithSelector(callbackFunctionId, requestId, data));
        if (!success) {
            assembly {
                revert(add(retData, 32), mload(retData))
            }
        }
        return true;
    }
}
