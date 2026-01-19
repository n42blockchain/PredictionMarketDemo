import { expect } from "chai";
import hre from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

const { ethers } = hre;

describe("Prediction Market System", function () {
  let token;
  let factory;
  let market;
  let owner;
  let user1;
  let user2;

  const INITIAL_LIQUIDITY = ethers.parseEther("1000");
  const MARKET_DURATION = 7 * 24 * 60 * 60; // 7 days

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy token
    const Token = await ethers.getContractFactory("PredictionToken");
    token = await Token.deploy();

    // Deploy factory
    const Factory = await ethers.getContractFactory("MarketFactory");
    factory = await Factory.deploy(await token.getAddress());

    // Distribute tokens to users for testing
    await token.transfer(user1.address, ethers.parseEther("10000"));
    await token.transfer(user2.address, ethers.parseEther("10000"));
  });

  describe("PredictionToken", function () {
    it("Should have correct name and symbol", async function () {
      expect(await token.name()).to.equal("Prediction Token");
      expect(await token.symbol()).to.equal("PRED");
    });

    it("Should mint initial supply to deployer", async function () {
      const balance = await token.balanceOf(owner.address);
      expect(balance).to.be.gt(0);
    });

    it("Should allow users to claim from faucet", async function () {
      const balanceBefore = await token.balanceOf(user1.address);
      await token.connect(user1).claimFromFaucet();
      const balanceAfter = await token.balanceOf(user1.address);

      expect(balanceAfter - balanceBefore).to.equal(ethers.parseEther("100"));
    });

    it("Should enforce faucet cooldown", async function () {
      await token.connect(user1).claimFromFaucet();

      await expect(
        token.connect(user1).claimFromFaucet()
      ).to.be.revertedWith("Faucet cooldown not elapsed");
    });
  });

  describe("MarketFactory", function () {
    it("Should create a new market", async function () {
      const tx = await factory.createMarket(
        "Will BTC reach $100k by end of 2026?",
        MARKET_DURATION
      );

      const receipt = await tx.wait();
      const event = receipt.logs.find(
        (log) => log.fragment && log.fragment.name === "MarketCreated"
      );

      expect(event).to.not.be.undefined;

      const marketCount = await factory.getMarketCount();
      expect(marketCount).to.equal(1);

      // Initialize the market
      const marketAddress = event.args[0];
      const market = await ethers.getContractAt("PredictionMarket", marketAddress);

      await token.approve(marketAddress, INITIAL_LIQUIDITY * 2n);
      await market.initialize(INITIAL_LIQUIDITY);

      const initialized = await market.initialized();
      expect(initialized).to.equal(true);
    });

    it("Should reject market with short duration", async function () {
      await expect(
        factory.createMarket(
          "Short duration test",
          60 // 1 minute
        )
      ).to.be.revertedWith("Duration too short");
    });

    it("Should track markets by creator", async function () {
      await factory.createMarket("Market 1", MARKET_DURATION);
      await factory.createMarket("Market 2", MARKET_DURATION);

      const creatorMarkets = await factory.getMarketsByCreator(owner.address);
      expect(creatorMarkets.length).to.equal(2);
    });
  });

  describe("PredictionMarket", function () {
    beforeEach(async function () {
      // Create a market
      const tx = await factory.createMarket(
        "Will ETH reach $10k?",
        MARKET_DURATION
      );

      const receipt = await tx.wait();
      const event = receipt.logs.find(
        (log) => log.fragment && log.fragment.name === "MarketCreated"
      );

      const marketAddress = event.args[0];
      market = await ethers.getContractAt("PredictionMarket", marketAddress);

      // Initialize market
      await token.approve(marketAddress, INITIAL_LIQUIDITY * 2n);
      await market.initialize(INITIAL_LIQUIDITY);
    });

    it("Should have correct initial state", async function () {
      const info = await market.getMarketInfo();

      expect(info._question).to.equal("Will ETH reach $10k?");
      expect(info._yesPool).to.equal(INITIAL_LIQUIDITY);
      expect(info._noPool).to.equal(INITIAL_LIQUIDITY);
      expect(info._resolved).to.equal(false);
    });

    it("Should have 50/50 initial prices", async function () {
      const yesPrice = await market.getPrice(true);
      const noPrice = await market.getPrice(false);

      // Prices should be equal (0.5 each, scaled by 1e18)
      expect(yesPrice).to.equal(ethers.parseEther("0.5"));
      expect(noPrice).to.equal(ethers.parseEther("0.5"));
    });

    it("Should allow users to buy Yes shares", async function () {
      const buyAmount = ethers.parseEther("100");

      await token.connect(user1).approve(await market.getAddress(), buyAmount);

      const sharesBefore = await market.yesShares(user1.address);
      await market.connect(user1).buyShares(buyAmount, true, 0);
      const sharesAfter = await market.yesShares(user1.address);

      expect(sharesAfter).to.be.gt(sharesBefore);
    });

    it("Should update prices after purchase", async function () {
      const buyAmount = ethers.parseEther("500");

      await token.connect(user1).approve(await market.getAddress(), buyAmount);
      await market.connect(user1).buyShares(buyAmount, true, 0);

      const yesPrice = await market.getPrice(true);
      const noPrice = await market.getPrice(false);

      // After buying Yes, Yes price should increase
      expect(yesPrice).to.be.gt(ethers.parseEther("0.5"));
      expect(noPrice).to.be.lt(ethers.parseEther("0.5"));

      // Prices should still sum to 1
      const sum = yesPrice + noPrice;
      expect(sum).to.be.closeTo(ethers.parseEther("1"), ethers.parseEther("0.001"));
    });

    it("Should allow users to sell shares", async function () {
      const buyAmount = ethers.parseEther("100");

      // Buy shares first
      await token.connect(user1).approve(await market.getAddress(), buyAmount);
      await market.connect(user1).buyShares(buyAmount, true, 0);

      const sharesBefore = await market.yesShares(user1.address);

      // Sell half of the shares
      const sellAmount = sharesBefore / 2n;
      await market.connect(user1).sellShares(sellAmount, true, 0);

      const sharesAfter = await market.yesShares(user1.address);
      expect(sharesAfter).to.equal(sharesBefore - sellAmount);
    });

    it("Should prevent buying after market ends", async function () {
      // Fast forward past end time
      await time.increase(MARKET_DURATION + 1);

      const buyAmount = ethers.parseEther("100");
      await token.connect(user1).approve(await market.getAddress(), buyAmount);

      await expect(
        market.connect(user1).buyShares(buyAmount, true, 0)
      ).to.be.revertedWith("Market has ended");
    });

    it("Should allow resolver to resolve market", async function () {
      // Fast forward past end time
      await time.increase(MARKET_DURATION + 1);

      await market.resolveMarket(true); // Yes wins

      const info = await market.getMarketInfo();
      expect(info._resolved).to.equal(true);
      expect(info._outcome).to.equal(true);
    });

    it("Should prevent resolving before end time", async function () {
      await expect(market.resolveMarket(true)).to.be.revertedWith(
        "Market has not ended yet"
      );
    });

    it("Should allow winners to claim winnings", async function () {
      const buyAmount = ethers.parseEther("100");

      // User buys Yes shares
      await token.connect(user1).approve(await market.getAddress(), buyAmount);
      await market.connect(user1).buyShares(buyAmount, true, 0);

      const shares = await market.yesShares(user1.address);

      // Fast forward and resolve with Yes winning
      await time.increase(MARKET_DURATION + 1);
      await market.resolveMarket(true);

      const balanceBefore = await token.balanceOf(user1.address);
      await market.connect(user1).claimWinnings();
      const balanceAfter = await token.balanceOf(user1.address);

      // User should receive 1 token per winning share
      expect(balanceAfter - balanceBefore).to.equal(shares);
    });

    it("Should prevent losers from claiming", async function () {
      const buyAmount = ethers.parseEther("100");

      // User buys No shares
      await token.connect(user1).approve(await market.getAddress(), buyAmount);
      await market.connect(user1).buyShares(buyAmount, false, 0);

      // Fast forward and resolve with Yes winning (No loses)
      await time.increase(MARKET_DURATION + 1);
      await market.resolveMarket(true);

      await expect(market.connect(user1).claimWinnings()).to.be.revertedWith(
        "No winning shares to claim"
      );
    });

    it("Should enforce slippage protection", async function () {
      const buyAmount = ethers.parseEther("100");
      const minShares = ethers.parseEther("1000000"); // Unrealistically high

      await token.connect(user1).approve(await market.getAddress(), buyAmount);

      await expect(
        market.connect(user1).buyShares(buyAmount, true, minShares)
      ).to.be.revertedWith("Slippage limit exceeded");
    });

    it("Should accumulate fees", async function () {
      const buyAmount = ethers.parseEther("100");

      await token.connect(user1).approve(await market.getAddress(), buyAmount);
      await market.connect(user1).buyShares(buyAmount, true, 0);

      const fees = await market.accumulatedFees();
      expect(fees).to.be.gt(0);
    });
  });

  describe("Full Market Lifecycle", function () {
    it("Should complete a full market cycle", async function () {
      // 1. Create market
      const tx = await factory.createMarket(
        "Integration test market",
        MARKET_DURATION
      );

      const receipt = await tx.wait();
      const event = receipt.logs.find(
        (log) => log.fragment && log.fragment.name === "MarketCreated"
      );

      const marketAddress = event.args[0];
      market = await ethers.getContractAt("PredictionMarket", marketAddress);

      // Initialize market
      await token.approve(marketAddress, INITIAL_LIQUIDITY * 2n);
      await market.initialize(INITIAL_LIQUIDITY);

      // 2. Users trade
      const buyAmount = ethers.parseEther("200");

      await token.connect(user1).approve(await market.getAddress(), buyAmount);
      await market.connect(user1).buyShares(buyAmount, true, 0); // User1 buys Yes

      await token.connect(user2).approve(await market.getAddress(), buyAmount);
      await market.connect(user2).buyShares(buyAmount, false, 0); // User2 buys No

      // 3. Fast forward time
      await time.increase(MARKET_DURATION + 1);

      // 4. Resolve market
      await market.resolveMarket(true); // Yes wins

      // 5. Winner claims
      const balanceBefore = await token.balanceOf(user1.address);
      await market.connect(user1).claimWinnings();
      const balanceAfter = await token.balanceOf(user1.address);

      expect(balanceAfter).to.be.gt(balanceBefore);

      // 6. Loser cannot claim
      await expect(market.connect(user2).claimWinnings()).to.be.revertedWith(
        "No winning shares to claim"
      );
    });
  });
});
