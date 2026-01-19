// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PredictionToken
 * @dev ERC20 token for testing prediction market
 * @notice This token is used as the trading currency in the prediction market
 *
 * Design decisions:
 * - Implements faucet functionality for easy testing
 * - Users can claim test tokens every 24 hours
 * - Owner can mint tokens for initial distribution
 */
contract PredictionToken is ERC20, Ownable {
    // Amount of tokens given per faucet claim (100 tokens)
    uint256 public constant FAUCET_AMOUNT = 100 * 10**18;

    // Time delay between faucet claims (24 hours)
    uint256 public constant FAUCET_COOLDOWN = 1 days;

    // Mapping to track last faucet claim time for each address
    mapping(address => uint256) public lastFaucetClaim;

    event FaucetClaimed(address indexed user, uint256 amount);

    constructor() ERC20("Prediction Token", "PRED") Ownable(msg.sender) {
        // Mint initial supply to deployer for liquidity provision
        _mint(msg.sender, 1_000_000 * 10**18); // 1 million tokens
    }

    /**
     * @dev Allows users to claim test tokens from faucet
     * @notice Can only be called once every 24 hours per address
     */
    function claimFromFaucet() external {
        require(
            block.timestamp >= lastFaucetClaim[msg.sender] + FAUCET_COOLDOWN,
            "Faucet cooldown not elapsed"
        );

        lastFaucetClaim[msg.sender] = block.timestamp;
        _mint(msg.sender, FAUCET_AMOUNT);

        emit FaucetClaimed(msg.sender, FAUCET_AMOUNT);
    }

    /**
     * @dev Allows owner to mint tokens for special purposes
     * @param to Address to receive the tokens
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /**
     * @dev Returns time until next faucet claim is available
     * @param user Address to check
     * @return Time in seconds until next claim (0 if can claim now)
     */
    function timeUntilNextClaim(address user) external view returns (uint256) {
        uint256 nextClaimTime = lastFaucetClaim[user] + FAUCET_COOLDOWN;
        if (block.timestamp >= nextClaimTime) {
            return 0;
        }
        return nextClaimTime - block.timestamp;
    }
}
