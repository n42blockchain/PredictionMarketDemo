import hre from "hardhat";
import fs from "fs";
import path from "path";

const { ethers } = hre;

async function main() {
  // Load deployment info
  const deploymentPath = path.join(process.cwd(), "deployment.json");
  if (!fs.existsSync(deploymentPath)) {
    console.error("deployment.json not found. Please deploy contracts first.");
    process.exit(1);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

  const [creator] = await ethers.getSigners();
  console.log("Creating market with account:", creator.address);

  // Get factory contract
  const factory = await ethers.getContractAt("MarketFactory", deployment.factory);
  const token = await ethers.getContractAt("PredictionToken", deployment.token);

  // Market parameters
  const question = process.argv[2] || "Will ETH reach $10k by end of 2026?";
  const durationDays = parseInt(process.argv[3] || "30");
  const liquidityAmount = process.argv[4] || "1000";

  const duration = durationDays * 24 * 60 * 60;
  const initialLiquidity = ethers.parseEther(liquidityAmount);

  console.log("\nMarket Parameters:");
  console.log("Question:", question);
  console.log("Duration:", durationDays, "days");
  console.log("Initial Liquidity:", liquidityAmount, "PRED");

  // Check balance
  const balance = await token.balanceOf(creator.address);
  console.log("\nCurrent PRED balance:", ethers.formatEther(balance));

  if (balance < initialLiquidity * 2n) {
    console.error("Insufficient PRED tokens. Need:", ethers.formatEther(initialLiquidity * 2n));
    console.log("Claim from faucet: await token.claimFromFaucet()");
    process.exit(1);
  }

  // Create market
  console.log("\nCreating market...");
  const createTx = await factory.createMarket(question, duration);
  const createReceipt = await createTx.wait();

  // Find market address
  const event = createReceipt.logs.find((log) => {
    try {
      const parsed = factory.interface.parseLog({
        topics: log.topics,
        data: log.data,
      });
      return parsed && parsed.name === "MarketCreated";
    } catch {
      return false;
    }
  });

  if (!event) {
    console.error("Failed to find MarketCreated event");
    process.exit(1);
  }

  const parsed = factory.interface.parseLog({
    topics: event.topics,
    data: event.data,
  });
  const marketAddress = parsed.args[0];
  console.log("Market created at:", marketAddress);

  // Initialize market
  console.log("\nInitializing market...");
  await token.approve(marketAddress, initialLiquidity * 2n);
  const market = await ethers.getContractAt("PredictionMarket", marketAddress);
  await market.initialize(initialLiquidity);

  console.log("\n✅ Market created and initialized successfully!");
  console.log("Market Address:", marketAddress);
  console.log("View on explorer: https://testnet.n42.world/address/" + marketAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
