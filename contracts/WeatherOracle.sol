// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@chainlink/contracts/src/v0.8/ChainlinkClient.sol";
import "@chainlink/contracts/src/v0.8/interfaces/LinkTokenInterface.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title Decentralized Weather Oracle
/// @notice Fetches real-world weather data via Chainlink Any API from OpenWeatherMap
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
    string private openWeatherApiKey;

    event WeatherRequested(bytes32 indexed requestId, string city, address indexed requester);
    event WeatherReported(bytes32 indexed requestId, string city, int256 temperature, string description, uint256 timestamp);

    /// @notice Initializes the oracle with Chainlink configuration
    /// @param _link LINK token contract address
    /// @param _oracle Chainlink operator contract address
    /// @param _jobId Job ID as bytes32
    /// @param _fee LINK fee per request in wei (0.1 LINK = 100000000000000000)
    constructor(
        address _link,
        address _oracle,
        bytes32 _jobId,
        uint256 _fee
    ) Ownable() {
        setChainlinkToken(_link);
        setChainlinkOracle(_oracle);
        chainlinkToken = _link;
        chainlinkOracle = _oracle;
        jobId = _jobId;
        chainlinkFee = _fee;
    }

    /// @notice Allows contract to receive ETH and LINK
    receive() external payable {}

    /// @notice Sets the OpenWeatherMap API key. Only callable by owner.
    /// @param _apiKey The API key string from openweathermap.org
    function setApiKey(string memory _apiKey) public onlyOwner {
        require(bytes(_apiKey).length > 0, "API key cannot be empty");
        openWeatherApiKey = _apiKey;
    }

    /// @notice Updates Chainlink oracle operator address. Only callable by owner.
    /// @param _oracle New operator contract address
    function setOracle(address _oracle) public onlyOwner {
        require(_oracle != address(0), "Oracle address cannot be zero");
        chainlinkOracle = _oracle;
        setChainlinkOracle(_oracle);
    }

    /// @notice Updates the Chainlink job ID. Only callable by owner.
    /// @param _jobId New job ID as bytes32
    function setJobId(bytes32 _jobId) public onlyOwner {
        jobId = _jobId;
    }

    /// @notice Updates the LINK fee per request. Only callable by owner.
    /// @param _fee New fee in LINK wei
    function setChainlinkFee(uint256 _fee) public onlyOwner {
        chainlinkFee = _fee;
    }

    /// @notice Transfers all LINK held by this contract to the owner.
    function withdrawLink() public onlyOwner {
        LinkTokenInterface link = LinkTokenInterface(chainlinkToken);
        uint256 balance = link.balanceOf(address(this));
        require(link.transfer(owner(), balance), "Unable to transfer LINK");
    }

    /// @notice Initiates a Chainlink request for weather data for the given city.
    /// @param _city City name to query (e.g., "London")
    /// @return requestId Unique Chainlink request identifier
    function requestWeather(string memory _city) public payable returns (bytes32 requestId) {
        require(
            LinkTokenInterface(chainlinkToken).balanceOf(address(this)) >= chainlinkFee,
            "Insufficient LINK: fund this contract with LINK tokens"
        );
        require(bytes(_city).length > 0, "City name cannot be empty");
        require(bytes(openWeatherApiKey).length > 0, "API key not set: call setApiKey first");

        Chainlink.Request memory request = buildChainlinkRequest(
            jobId,
            address(this),
            this.fulfill.selector
        );

        string memory url = string(
            abi.encodePacked(
                "https://api.openweathermap.org/data/2.5/weather?q=",
                _city,
                "&appid=",
                openWeatherApiKey,
                "&units=metric"
            )
        );

        request.add("get", url);
        request.add("path", "main,temp");
        request.addInt("times", 100);

        requestId = sendChainlinkRequestTo(chainlinkOracle, request, chainlinkFee);

        pendingCities[requestId] = _city;
        pendingRequesters[requestId] = msg.sender;

        emit WeatherRequested(requestId, _city, msg.sender);
        return requestId;
    }

    /// @notice Chainlink callback — stores weather report on-chain and emits event.
    /// @param _requestId Original request ID from requestWeather
    /// @param _temperature Temperature in Celsius * 100 (e.g., 2532 = 25.32C)
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

        weatherReports[_requestId] = WeatherReport({
            city: city,
            temperature: _temperature,
            description: description,
            timestamp: block.timestamp,
            requester: requester
        });

        emit WeatherReported(_requestId, city, _temperature, description, block.timestamp);

        delete pendingCities[_requestId];
        delete pendingRequesters[_requestId];
    }

    /// @notice Returns the weather report stored for a given request ID.
    /// @param _requestId The Chainlink request ID to retrieve
    /// @return report The full WeatherReport struct
    function getWeatherReport(bytes32 _requestId) public view returns (WeatherReport memory) {
        return weatherReports[_requestId];
    }
}
