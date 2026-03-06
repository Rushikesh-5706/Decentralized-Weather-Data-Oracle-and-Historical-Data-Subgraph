// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@chainlink/contracts/src/v0.8/ChainlinkClient.sol";
import "@chainlink/contracts/src/v0.8/interfaces/LinkTokenInterface.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title Decentralized Weather Oracle
/// @notice A smart contract utilizing Chainlink Any API to fetch weather data from OpenWeatherMap
contract WeatherOracle is ChainlinkClient, Ownable {
    using Chainlink for Chainlink.Request;

    struct WeatherReport {
        string city;
        int256 temperature;
        string description;
        uint256 timestamp;
        address requester;
    }

    mapping(bytes32 => WeatherReport) public weatherReports;
    mapping(bytes32 => string) private pendingCities;
    mapping(bytes32 => address) private pendingRequesters;

    uint256 public chainlinkFee;
    address public chainlinkToken;
    address public chainlinkOracle;
    bytes32 public jobId;
    string public openWeatherApiKey;

    event WeatherRequested(bytes32 indexed requestId, string city, address indexed requester);
    event WeatherReported(bytes32 indexed requestId, string city, int256 temperature, string description, uint256 timestamp);

    /// @notice Constructor sets the critical Chainlink parameters
    /// @param _link Address of the LINK token
    /// @param _oracle Address of the Chainlink oracle contract
    /// @param _jobId Job ID as bytes32
    /// @param _fee Fee for the Chainlink request
    constructor(
        address _link,
        address _oracle,
        bytes32 _jobId,
        uint256 _fee
    ) {
        setChainlinkToken(_link);
        setChainlinkOracle(_oracle);
        chainlinkToken = _link;
        chainlinkOracle = _oracle;
        jobId = _jobId;
        chainlinkFee = _fee;
    }

    /// @notice Allow the contract to receive ETH/LINK
    receive() external payable {}

    /// @notice Sets the OpenWeatherMap API key (securely handled during deployment)
    /// @param _apiKey The API key
    function setApiKey(string memory _apiKey) public onlyOwner {
        openWeatherApiKey = _apiKey;
    }

    /// @notice Updates the Chainlink Oracle address
    /// @param _oracle New oracle address
    function setOracle(address _oracle) public onlyOwner {
        chainlinkOracle = _oracle;
        setChainlinkOracle(_oracle);
    }

    /// @notice Updates the Chainlink Job ID
    /// @param _jobId New Job ID
    function setJobId(bytes32 _jobId) public onlyOwner {
        jobId = _jobId;
    }

    /// @notice Updates the Chainlink request fee
    /// @param _fee New requested fee in wei
    function setChainlinkFee(uint256 _fee) public onlyOwner {
        chainlinkFee = _fee;
    }

    /// @notice Withdraws all LINK tokens from the contract to the owner
    function withdrawLink() public onlyOwner {
        LinkTokenInterface link = LinkTokenInterface(chainlinkToken);
        require(link.transfer(msg.sender, link.balanceOf(address(this))), "Unable to transfer LINK");
    }

    /// @notice Requests weather for a given city
    /// @param _city The city name
    /// @return requestId The unique request identifier
    function requestWeather(string memory _city) public payable returns (bytes32 requestId) {
        require(LinkTokenInterface(chainlinkToken).balanceOf(address(this)) >= chainlinkFee, "Insufficient LINK: fund this contract with LINK tokens");
        require(bytes(_city).length > 0, "City name cannot be empty");

        Chainlink.Request memory request = buildChainlinkRequest(
            jobId,
            address(this),
            this.fulfill.selector
        );

        string memory baseUrl = string(abi.encodePacked("https://api.openweathermap.org/data/2.5/weather?q=", _city));
        string memory fullUrl = string(abi.encodePacked(baseUrl, "&appid=", openWeatherApiKey));

        request.add("get", fullUrl);
        request.add("path", "main,temp");
        request.addInt("times", 100);

        requestId = sendChainlinkRequestTo(chainlinkOracle, request, chainlinkFee);
        
        pendingCities[requestId] = _city;
        pendingRequesters[requestId] = msg.sender;
        
        emit WeatherRequested(requestId, _city, msg.sender);
        return requestId;
    }

    /// @notice Fulfills the Chainlink request with the required temperature
    /// @param _requestId The original request ID
    /// @param _temperature The returned temperature
    function fulfill(bytes32 _requestId, int256 _temperature) public recordChainlinkFulfillment(_requestId) {
        string memory city = pendingCities[_requestId];
        address requester = pendingRequesters[_requestId];
        
        require(bytes(city).length > 0, "Request already fulfilled or invalid");

        string memory description;
        if (_temperature < 0) {
            description = "Freezing";
        } else if (_temperature < 1500) {
            description = "Cold";
        } else if (_temperature < 2500) {
            description = "Mild";
        } else if (_temperature < 3500) {
            description = "Warm";
        } else {
            description = "Hot";
        }

        WeatherReport memory report = WeatherReport({
            city: city,
            temperature: _temperature,
            description: description,
            timestamp: block.timestamp,
            requester: requester
        });
        
        weatherReports[_requestId] = report;
        
        emit WeatherReported(_requestId, city, _temperature, description, block.timestamp);

        delete pendingCities[_requestId];
        delete pendingRequesters[_requestId];
    }

    /// @notice Retrieves a specific weather report by its request ID
    /// @param _requestId The ID to retrieve
    /// @return report The populated WeatherReport struct
    function getWeatherReport(bytes32 _requestId) public view returns (WeatherReport memory) {
        return weatherReports[_requestId];
    }
}
