import hre from "hardhat";
import fs from "fs";
import path from "path";

const { ethers } = hre;

async function main() {
  console.log("Testing trade functionality on N42 Test Network...\n");

  // Load deployment info
  const deploymentPath = path.join(process.cwd(), "deployment.json");
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

  const [trader] = await ethers.getSigners();
  console.log("Trader:", trader.address);

  // Get contracts
  const token = await ethers.getContractAt("PredictionToken", deployment.token);
  const market = await ethers.getContractAt("PredictionMarket", deployment.sampleMarket);

  // Check balance
  const balance = await token.balanceOf(trader.address);
  console.log("PRED Balance:", ethers.formatEther(balance), "PRED\n");

  // Get market info before trade
  const infoBefore = await market.getMarketInfo();
  console.log("=== Before Trade ===");
  console.log("Question:", infoBefore._question);
  console.log("Yes Price:", (Number(infoBefore._yesPrice) / 1e18).toFixed(4));
  console.log("No Price:", (Number(infoBefore._noPrice) / 1e18).toFixed(4));
  console.log("Yes Pool:", ethers.formatEther(infoBefore._yesPool));
  console.log("No Pool:", ethers.formatEther(infoBefore._noPool));

  // Buy Yes shares
  const buyAmount = ethers.parseEther("10"); // Buy with 10 PRED
  console.log("\n🔄 Buying Yes shares with", ethers.formatEther(buyAmount), "PRED...");

  // Calculate expected shares
  const expectedShares = await market.calculateSharesOut(buyAmount, true);
  console.log("Expected shares:", ethers.formatEther(expectedShares));

  // Approve and buy
  console.log("Approving tokens...");
  const approveTx = await token.approve(deployment.sampleMarket, buyAmount);
  await approveTx.wait();

  console.log("Executing buy...");
  const buyTx = await market.buyShares(buyAmount, true, 0); // 0 = no slippage protection for demo
  await buyTx.wait();

  console.log("✅ Purchase successful!\n");

  // Get market info after trade
  const infoAfter = await market.getMarketInfo();
  console.log("=== After Trade ===");
  console.log("Yes Price:", (Number(infoAfter._yesPrice) / 1e18).toFixed(4));
  console.log("No Price:", (Number(infoAfter._noPrice) / 1e18).toFixed(4));
  console.log("Yes Pool:", ethers.formatEther(infoAfter._yesPool));
  console.log("No Pool:", ethers.formatEther(infoAfter._noPool));

  // Get user position
  const position = await market.getUserPosition(trader.address);
  console.log("\n💼 Your Position:");
  console.log("Yes Shares:", ethers.formatEther(position._yesShares));
  console.log("No Shares:", ethers.formatEther(position._noShares));

  // Calculate price change
  const priceChange = Number(infoAfter._yesPrice) - Number(infoBefore._yesPrice);
  const percentChange = (priceChange / Number(infoBefore._yesPrice)) * 100;
  console.log("\n📊 Price Change:");
  console.log("Yes Price Δ:", (priceChange / 1e18).toFixed(4), `(${percentChange > 0 ? '+' : ''}${percentChange.toFixed(2)}%)`);

  console.log("\n🎯 Trade Summary:");
  console.log("Spent:", ethers.formatEther(buyAmount), "PRED");
  console.log("Received:", ethers.formatEther(position._yesShares), "Yes shares");
  console.log("Effective price:", (Number(buyAmount) / Number(position._yesShares)).toFixed(4), "PRED per share");

  console.log("\nView transaction on explorer: https://testnet.n42.world/address/" + deployment.sampleMarket);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
