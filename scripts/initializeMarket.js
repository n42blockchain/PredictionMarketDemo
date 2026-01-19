import hre from "hardhat";
import fs from "fs";
import path from "path";

const { ethers } = hre;

async function main() {
  console.log("Initializing market on N42 Test Network...\n");

  // Load deployment info
  const deploymentPath = path.join(process.cwd(), "deployment.json");
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

  const [signer] = await ethers.getSigners();
  console.log("Account:", signer.address);

  // Get contracts
  const token = await ethers.getContractAt("PredictionToken", deployment.token);
  const market = await ethers.getContractAt("PredictionMarket", deployment.sampleMarket);

  // Check if already initialized
  const initialized = await market.initialized();
  if (initialized) {
    console.log("✅ Market already initialized");
    const info = await market.getMarketInfo();
    console.log("Yes Pool:", ethers.formatEther(info._yesPool));
    console.log("No Pool:", ethers.formatEther(info._noPool));
    return;
  }

  // Claim PRED tokens
  console.log("Claiming PRED tokens from faucet...");
  try {
    const claimTx = await token.claimFromFaucet();
    await claimTx.wait();
    console.log("✅ Claimed 100 PRED tokens\n");
  } catch (e) {
    console.log("Note:", e.message.includes("cooldown") ? "Need to wait 24h between claims" : e.message);
  }

  // Check balance
  const balance = await token.balanceOf(signer.address);
  console.log("Current PRED Balance:", ethers.formatEther(balance), "PRED");

  const liquidity = ethers.parseEther("50"); // Use 50 PRED
  const required = liquidity * 2n;

  if (balance < required) {
    console.error("\n❌ Insufficient PRED tokens");
    console.log("Required:", ethers.formatEther(required), "PRED");
    console.log("You have:", ethers.formatEther(balance), "PRED");
    console.log("\nOptions:");
    console.log("1. Wait and claim again from faucet (24h cooldown)");
    console.log("2. Deploy with less liquidity");
    process.exit(1);
  }

  // Initialize market
  console.log("\nInitializing market with", ethers.formatEther(liquidity), "PRED liquidity...");

  console.log("Approving tokens...");
  const approveTx = await token.approve(deployment.sampleMarket, required);
  await approveTx.wait();

  console.log("Initializing...");
  const initTx = await market.initialize(liquidity);
  await initTx.wait();

  console.log("\n✅ Market successfully initialized!");

  // Verify
  const info = await market.getMarketInfo();
  console.log("\nMarket Info:");
  console.log("Question:", info._question);
  console.log("Yes Pool:", ethers.formatEther(info._yesPool), "shares");
  console.log("No Pool:", ethers.formatEther(info._noPool), "shares");
  console.log("Yes Price:", (Number(info._yesPrice) / 1e18).toFixed(4));
  console.log("No Price:", (Number(info._noPrice) / 1e18).toFixed(4));
  console.log("\nView on explorer: https://testnet.n42.world/address/" + deployment.sampleMarket);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
