// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title PredictionMarket
 * @dev Binary prediction market using Constant Product Market Maker (CPMM)
 * @notice This contract implements a simplified version of Polymarket's prediction market
 *
 * Design decisions:
 * - Uses CPMM (x * y = k) for automatic pricing without order books
 * - Yes + No share prices always equal 1 token (probability sum = 100%)
 * - 0.5% trading fee to incentivize liquidity provision
 * - Only market creator can resolve the outcome to prevent manipulation
 * - Time-lock: markets cannot be resolved before end time
 */
contract PredictionMarket is ReentrancyGuard, Pausable {
    // Trading fee in basis points (50 = 0.5%)
    uint256 public constant FEE_RATE = 50;
    uint256 public constant FEE_DENOMINATOR = 10000;

    // Minimum liquidity to prevent division by zero
    uint256 public constant MINIMUM_LIQUIDITY = 1000;

    IERC20 public immutable token;
    string public question;
    uint256 public endTime;
    address public creator;
    address public resolver;

    // Liquidity pools for Yes and No shares
    uint256 public yesPool;
    uint256 public noPool;

    // User balances
    mapping(address => uint256) public yesShares;
    mapping(address => uint256) public noShares;

    // Market state
    bool public resolved;
    bool public outcome; // true = Yes wins, false = No wins
    bool public initialized; // Track if initial liquidity has been added

    // Accumulated fees
    uint256 public accumulatedFees;

    event SharesPurchased(
        address indexed buyer,
        bool indexed isYes,
        uint256 amountIn,
        uint256 sharesOut
    );

    event SharesSold(
        address indexed seller,
        bool indexed isYes,
        uint256 sharesIn,
        uint256 amountOut
    );

    event MarketResolved(bool indexed outcome, uint256 timestamp);

    event WinningsClaimed(
        address indexed user,
        uint256 shares,
        uint256 payout
    );

    event LiquidityAdded(uint256 yesAmount, uint256 noAmount);

    modifier onlyResolver() {
        require(msg.sender == resolver, "Only resolver can call");
        _;
    }

    modifier notResolved() {
        require(!resolved, "Market already resolved");
        _;
    }

    modifier isResolved() {
        require(resolved, "Market not resolved yet");
        _;
    }

    /**
     * @dev Constructor to create a new prediction market
     * @param _token Address of ERC20 token used for trading
     * @param _creator Address of the market creator
     * @param _question The prediction question
     * @param _endTime Unix timestamp when market closes
     */
    constructor(
        address _token,
        address _creator,
        string memory _question,
        uint256 _endTime
    ) {
        require(_endTime > block.timestamp, "End time must be in future");
        require(_creator != address(0), "Invalid creator address");

        token = IERC20(_token);
        question = _question;
        endTime = _endTime;
        creator = _creator;
        resolver = _creator; // Creator is default resolver
    }

    /**
     * @dev Initialize market with initial liquidity (must be called after deployment)
     * @param _initialLiquidity Initial liquidity for both Yes and No pools
     */
    function initialize(uint256 _initialLiquidity) external {
        require(!initialized, "Already initialized");
        require(msg.sender == creator, "Only creator can initialize");
        require(_initialLiquidity >= MINIMUM_LIQUIDITY, "Insufficient initial liquidity");

        initialized = true;

        // Initialize equal liquidity for both outcomes (50/50 probability)
        yesPool = _initialLiquidity;
        noPool = _initialLiquidity;

        // Transfer initial liquidity from creator
        require(
            token.transferFrom(msg.sender, address(this), _initialLiquidity * 2),
            "Failed to transfer initial liquidity"
        );

        emit LiquidityAdded(_initialLiquidity, _initialLiquidity);
    }

    /**
     * @dev Calculate price of Yes or No shares
     * @param isYes True for Yes price, false for No price
     * @return price Price as a ratio (scaled by 1e18 for precision)
     *
     * Design note: In CPMM, price is inversely proportional to pool size
     * - When users buy Yes, yesPool decreases and noPool increases
     * - This should increase Yes price (more demand = higher price)
     * - Therefore: yesPrice = noPool / (yesPool + noPool)
     */
    function getPrice(bool isYes) public view returns (uint256 price) {
        uint256 total = yesPool + noPool;
        if (isYes) {
            // Yes price = noPool / (yesPool + noPool)
            // Buying Yes decreases yesPool, increases noPool, thus increasing this ratio
            price = (noPool * 1e18) / total;
        } else {
            // No price = yesPool / (yesPool + noPool)
            price = (yesPool * 1e18) / total;
        }
    }

    /**
     * @dev Calculate shares received for a given token amount (before fees)
     * @param amountIn Amount of tokens to spend
     * @param isYes True for buying Yes, false for buying No
     * @return sharesOut Amount of shares received after fee
     *
     * Formula (CPMM):
     * - k = yesPool * noPool (constant product)
     * - When buying Yes: yesPool decreases, noPool increases
     * - sharesOut = yesPool - (k / newNoPool)
     */
    function calculateSharesOut(uint256 amountIn, bool isYes)
        public
        view
        returns (uint256 sharesOut)
    {
        require(amountIn > 0, "Amount must be positive");

        // Calculate fee
        uint256 fee = (amountIn * FEE_RATE) / FEE_DENOMINATOR;
        uint256 amountInAfterFee = amountIn - fee;

        // Calculate constant product
        uint256 k = yesPool * noPool;

        if (isYes) {
            // Buying Yes: add to No pool, remove from Yes pool
            uint256 newNoPool = noPool + amountInAfterFee;
            uint256 newYesPool = k / newNoPool;
            sharesOut = yesPool - newYesPool;
        } else {
            // Buying No: add to Yes pool, remove from No pool
            uint256 newYesPool = yesPool + amountInAfterFee;
            uint256 newNoPool = k / newYesPool;
            sharesOut = noPool - newNoPool;
        }
    }

    /**
     * @dev Calculate tokens received for selling shares (before fees)
     * @param sharesIn Amount of shares to sell
     * @param isYes True for selling Yes, false for selling No
     * @return amountOut Amount of tokens received after fee
     */
    function calculateAmountOut(uint256 sharesIn, bool isYes)
        public
        view
        returns (uint256 amountOut)
    {
        require(sharesIn > 0, "Shares must be positive");

        // Calculate constant product
        uint256 k = yesPool * noPool;

        if (isYes) {
            // Selling Yes: add to Yes pool, remove from No pool
            uint256 newYesPool = yesPool + sharesIn;
            uint256 newNoPool = k / newYesPool;
            amountOut = noPool - newNoPool;
        } else {
            // Selling No: add to No pool, remove from Yes pool
            uint256 newNoPool = noPool + sharesIn;
            uint256 newYesPool = k / newNoPool;
            amountOut = yesPool - newYesPool;
        }

        // Apply fee
        uint256 fee = (amountOut * FEE_RATE) / FEE_DENOMINATOR;
        amountOut = amountOut - fee;
    }

    /**
     * @dev Buy Yes or No shares
     * @param amountIn Amount of tokens to spend
     * @param isYes True to buy Yes shares, false for No shares
     * @param minSharesOut Minimum shares to receive (slippage protection)
     */
    function buyShares(
        uint256 amountIn,
        bool isYes,
        uint256 minSharesOut
    ) external nonReentrant whenNotPaused notResolved {
        require(initialized, "Market not initialized");
        require(block.timestamp < endTime, "Market has ended");
        require(amountIn > 0, "Amount must be positive");

        uint256 sharesOut = calculateSharesOut(amountIn, isYes);
        require(sharesOut >= minSharesOut, "Slippage limit exceeded");

        // Calculate fee
        uint256 fee = (amountIn * FEE_RATE) / FEE_DENOMINATOR;
        uint256 amountInAfterFee = amountIn - fee;
        accumulatedFees += fee;

        // Update pools
        if (isYes) {
            noPool += amountInAfterFee;
            yesPool -= sharesOut;
            yesShares[msg.sender] += sharesOut;
        } else {
            yesPool += amountInAfterFee;
            noPool -= sharesOut;
            noShares[msg.sender] += sharesOut;
        }

        // Transfer tokens from buyer
        require(
            token.transferFrom(msg.sender, address(this), amountIn),
            "Token transfer failed"
        );

        emit SharesPurchased(msg.sender, isYes, amountIn, sharesOut);
    }

    /**
     * @dev Sell Yes or No shares
     * @param sharesIn Amount of shares to sell
     * @param isYes True to sell Yes shares, false for No shares
     * @param minAmountOut Minimum tokens to receive (slippage protection)
     */
    function sellShares(
        uint256 sharesIn,
        bool isYes,
        uint256 minAmountOut
    ) external nonReentrant whenNotPaused notResolved {
        require(initialized, "Market not initialized");
        require(sharesIn > 0, "Shares must be positive");

        // Check user balance
        if (isYes) {
            require(yesShares[msg.sender] >= sharesIn, "Insufficient Yes shares");
        } else {
            require(noShares[msg.sender] >= sharesIn, "Insufficient No shares");
        }

        uint256 amountOut = calculateAmountOut(sharesIn, isYes);
        require(amountOut >= minAmountOut, "Slippage limit exceeded");

        // Calculate fee (already deducted in calculateAmountOut)
        uint256 amountBeforeFee = isYes
            ? noPool - (yesPool * noPool) / (yesPool + sharesIn)
            : yesPool - (yesPool * noPool) / (noPool + sharesIn);
        uint256 fee = amountBeforeFee - amountOut;
        accumulatedFees += fee;

        // Update pools
        if (isYes) {
            yesPool += sharesIn;
            noPool -= amountBeforeFee;
            yesShares[msg.sender] -= sharesIn;
        } else {
            noPool += sharesIn;
            yesPool -= amountBeforeFee;
            noShares[msg.sender] -= sharesIn;
        }

        // Transfer tokens to seller
        require(token.transfer(msg.sender, amountOut), "Token transfer failed");

        emit SharesSold(msg.sender, isYes, sharesIn, amountOut);
    }

    /**
     * @dev Resolve the market with the final outcome
     * @param _outcome True if Yes wins, false if No wins
     */
    function resolveMarket(bool _outcome)
        external
        onlyResolver
        notResolved
    {
        require(block.timestamp >= endTime, "Market has not ended yet");

        resolved = true;
        outcome = _outcome;

        emit MarketResolved(_outcome, block.timestamp);
    }

    /**
     * @dev Claim winnings after market is resolved
     */
    function claimWinnings() external nonReentrant isResolved {
        uint256 shares = outcome ? yesShares[msg.sender] : noShares[msg.sender];
        require(shares > 0, "No winning shares to claim");

        // Each winning share is worth 1 token
        uint256 payout = shares;

        // Clear user's shares
        if (outcome) {
            yesShares[msg.sender] = 0;
        } else {
            noShares[msg.sender] = 0;
        }

        // Transfer payout
        require(token.transfer(msg.sender, payout), "Payout transfer failed");

        emit WinningsClaimed(msg.sender, shares, payout);
    }

    /**
     * @dev Withdraw accumulated fees (only creator)
     */
    function withdrawFees() external {
        require(msg.sender == creator, "Only creator can withdraw fees");
        uint256 fees = accumulatedFees;
        require(fees > 0, "No fees to withdraw");

        accumulatedFees = 0;
        require(token.transfer(creator, fees), "Fee transfer failed");
    }

    /**
     * @dev Pause trading (emergency use only)
     */
    function pause() external onlyResolver {
        _pause();
    }

    /**
     * @dev Unpause trading
     */
    function unpause() external onlyResolver {
        _unpause();
    }

    /**
     * @dev Get market info
     */
    function getMarketInfo()
        external
        view
        returns (
            string memory _question,
            uint256 _endTime,
            uint256 _yesPool,
            uint256 _noPool,
            uint256 _yesPrice,
            uint256 _noPrice,
            bool _resolved,
            bool _outcome
        )
    {
        return (
            question,
            endTime,
            yesPool,
            noPool,
            getPrice(true),
            getPrice(false),
            resolved,
            outcome
        );
    }

    /**
     * @dev Get user's position
     */
    function getUserPosition(address user)
        external
        view
        returns (uint256 _yesShares, uint256 _noShares)
    {
        return (yesShares[user], noShares[user]);
    }
}
