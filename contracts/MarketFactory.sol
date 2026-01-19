// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "./PredictionMarket.sol";

/**
 * @title MarketFactory
 * @dev Factory contract for creating and managing prediction markets
 * @notice Provides unified interface for market creation and discovery
 *
 * Design decisions:
 * - Factory pattern centralizes market creation and tracking
 * - Maintains a registry of all markets for easy frontend querying
 * - Enforces minimum parameters to prevent spam markets
 * - Emits events for off-chain indexing
 */
contract MarketFactory {
    // Minimum values to prevent spam
    uint256 public constant MINIMUM_DURATION = 1 hours;
    uint256 public constant MINIMUM_LIQUIDITY = 100 * 10**18; // 100 tokens

    // Array of all created markets
    address[] public markets;

    // Mapping from market address to its index
    mapping(address => uint256) public marketIndex;

    // Mapping from creator to their markets
    mapping(address => address[]) public creatorMarkets;

    // Token used across all markets
    address public immutable token;

    event MarketCreated(
        address indexed marketAddress,
        address indexed creator,
        string question,
        uint256 endTime
    );

    /**
     * @dev Constructor
     * @param _token Address of ERC20 token used for all markets
     */
    constructor(address _token) {
        require(_token != address(0), "Invalid token address");
        token = _token;
    }

    /**
     * @dev Create a new prediction market
     * @param question The prediction question
     * @param duration Duration in seconds from now until market closes
     * @return marketAddress Address of the newly created market
     *
     * Requirements:
     * - Duration must be at least MINIMUM_DURATION
     *
     * Note: After creation, call initialize() on the market to add initial liquidity
     */
    function createMarket(
        string memory question,
        uint256 duration
    ) external returns (address marketAddress) {
        require(bytes(question).length > 0, "Question cannot be empty");
        require(duration >= MINIMUM_DURATION, "Duration too short");

        uint256 endTime = block.timestamp + duration;

        // Create new market (pass msg.sender as creator)
        PredictionMarket market = new PredictionMarket(
            token,
            msg.sender,  // creator
            question,
            endTime
        );

        marketAddress = address(market);

        // Add to registry
        marketIndex[marketAddress] = markets.length;
        markets.push(marketAddress);
        creatorMarkets[msg.sender].push(marketAddress);

        emit MarketCreated(
            marketAddress,
            msg.sender,
            question,
            endTime
        );
    }


    /**
     * @dev Get total number of markets
     */
    function getMarketCount() external view returns (uint256) {
        return markets.length;
    }

    /**
     * @dev Get all markets
     * @return Array of market addresses
     */
    function getAllMarkets() external view returns (address[] memory) {
        return markets;
    }

    /**
     * @dev Get markets created by a specific address
     * @param creator Address of the creator
     * @return Array of market addresses created by the address
     */
    function getMarketsByCreator(address creator)
        external
        view
        returns (address[] memory)
    {
        return creatorMarkets[creator];
    }

    /**
     * @dev Get paginated list of markets
     * @param offset Starting index
     * @param limit Maximum number of markets to return
     * @return results Array of market addresses
     * @return total Total number of markets
     */
    function getMarketsPaginated(uint256 offset, uint256 limit)
        external
        view
        returns (address[] memory results, uint256 total)
    {
        total = markets.length;

        if (offset >= total) {
            return (new address[](0), total);
        }

        uint256 end = offset + limit;
        if (end > total) {
            end = total;
        }

        uint256 size = end - offset;
        results = new address[](size);

        for (uint256 i = 0; i < size; i++) {
            results[i] = markets[offset + i];
        }

        return (results, total);
    }

    /**
     * @dev Get active markets (not yet ended)
     * @return activeMarkets Array of active market addresses
     *
     * Note: This function may be gas-intensive for large number of markets
     * Consider using off-chain indexing for production use
     */
    function getActiveMarkets() external view returns (address[] memory activeMarkets) {
        uint256 count = 0;

        // Count active markets
        for (uint256 i = 0; i < markets.length; i++) {
            PredictionMarket market = PredictionMarket(markets[i]);
            if (block.timestamp < market.endTime() && !market.resolved()) {
                count++;
            }
        }

        // Populate array
        activeMarkets = new address[](count);
        uint256 index = 0;

        for (uint256 i = 0; i < markets.length; i++) {
            PredictionMarket market = PredictionMarket(markets[i]);
            if (block.timestamp < market.endTime() && !market.resolved()) {
                activeMarkets[index] = markets[i];
                index++;
            }
        }

        return activeMarkets;
    }

    /**
     * @dev Get resolved markets
     * @return resolvedMarkets Array of resolved market addresses
     */
    function getResolvedMarkets() external view returns (address[] memory resolvedMarkets) {
        uint256 count = 0;

        // Count resolved markets
        for (uint256 i = 0; i < markets.length; i++) {
            PredictionMarket market = PredictionMarket(markets[i]);
            if (market.resolved()) {
                count++;
            }
        }

        // Populate array
        resolvedMarkets = new address[](count);
        uint256 index = 0;

        for (uint256 i = 0; i < markets.length; i++) {
            PredictionMarket market = PredictionMarket(markets[i]);
            if (market.resolved()) {
                resolvedMarkets[index] = markets[i];
                index++;
            }
        }

        return resolvedMarkets;
    }

    /**
     * @dev Check if an address is a valid market created by this factory
     * @param marketAddress Address to check
     * @return True if valid market, false otherwise
     */
    function isMarket(address marketAddress) external view returns (bool) {
        if (markets.length == 0) return false;
        uint256 index = marketIndex[marketAddress];
        return index < markets.length && markets[index] == marketAddress;
    }
}
