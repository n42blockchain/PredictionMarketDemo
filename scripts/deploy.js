import hre from "hardhat";
import fs from "fs";
import path from "path";

const { ethers } = hre;

async function main() {
  console.log("Starting deployment to N42 Test Network...\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "N\n");

  // Deploy PredictionToken
  console.log("Deploying PredictionToken...");
  const Token = await ethers.getContractFactory("PredictionToken");
  const token = await Token.deploy();
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log("PredictionToken deployed to:", tokenAddress);
  console.log("Total supply:", ethers.formatEther(await token.totalSupply()), "PRED\n");

  // Deploy MarketFactory
  console.log("Deploying MarketFactory...");
  const Factory = await ethers.getContractFactory("MarketFactory");
  const factory = await Factory.deploy(tokenAddress);
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log("MarketFactory deployed to:", factoryAddress);
  console.log("Token used by factory:", await factory.token(), "\n");

  // Create a sample market
  console.log("Creating sample market...");
  const question = "Will BTC reach $100k by end of 2026?";
  const duration = 30 * 24 * 60 * 60; // 30 days
  const initialLiquidity = ethers.parseEther("1000"); // 1000 PRED

  const createTx = await factory.createMarket(question, duration);
  const createReceipt = await createTx.wait();

  // Find MarketCreated event
  const event = createReceipt.logs.find(
    (log) => {
      try {
        const parsed = factory.interface.parseLog({
          topics: log.topics,
          data: log.data,
        });
        return parsed && parsed.name === "MarketCreated";
      } catch {
        return false;
      }
    }
  );

  if (event) {
    const parsed = factory.interface.parseLog({
      topics: event.topics,
      data: event.data,
    });
    const marketAddress = parsed.args[0];
    console.log("Sample market created at:", marketAddress);
    console.log("Question:", question);

    // Initialize the market
    console.log("\nInitializing sample market...");
    await token.approve(marketAddress, initialLiquidity * 2n);
    const market = await ethers.getContractAt("PredictionMarket", marketAddress);
    await market.initialize(initialLiquidity);
    console.log("Market initialized with", ethers.formatEther(initialLiquidity), "PRED liquidity\n");
  }

  // Save deployment addresses
  const deployment = {
    network: "n42",
    chainId: 1142,
    token: tokenAddress,
    factory: factoryAddress,
    sampleMarket: event
      ? factory.interface.parseLog({
          topics: event.topics,
          data: event.data,
        }).args[0]
      : null,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
  };

  const deploymentPath = path.join(process.cwd(), "deployment.json");
  fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
  console.log("Deployment info saved to deployment.json\n");

  console.log("=".repeat(60));
  console.log("DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log("Network:", "N42 Test Network");
  console.log("Chain ID:", "1142");
  console.log("Token Address:", tokenAddress);
  console.log("Factory Address:", factoryAddress);
  if (deployment.sampleMarket) {
    console.log("Sample Market:", deployment.sampleMarket);
  }
  console.log("=".repeat(60));

  console.log("\nNext steps:");
  console.log("1. Claim test tokens from faucet: https://n42.ai/faucet");
  console.log("2. Claim PRED tokens: await token.claimFromFaucet()");
  console.log("3. View on explorer: https://testnet.n42.world/address/" + tokenAddress);
  console.log("\nDeployment complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
