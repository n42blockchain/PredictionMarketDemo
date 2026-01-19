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

  console.log("Querying markets on N42 Test Network...\n");

  // Get factory contract
  const factory = await ethers.getContractAt("MarketFactory", deployment.factory);

  // Get all markets
  const marketCount = await factory.getMarketCount();
  console.log("Total markets:", marketCount.toString());

  if (marketCount === 0n) {
    console.log("No markets found.");
    return;
  }

  const markets = await factory.getAllMarkets();

  console.log("\n" + "=".repeat(80));

  for (let i = 0; i < markets.length; i++) {
    const marketAddress = markets[i];
    const market = await ethers.getContractAt("PredictionMarket", marketAddress);

    const info = await market.getMarketInfo();
    const yesPrice = info._yesPrice;
    const noPrice = info._noPrice;

    console.log(`\nMarket #${i + 1}: ${marketAddress}`);
    console.log("  Question:", info._question);
    console.log("  End Time:", new Date(Number(info._endTime) * 1000).toLocaleString());
    console.log("  Status:", info._resolved ? "Resolved" : "Active");

    if (info._resolved) {
      console.log("  Outcome:", info._outcome ? "YES won" : "NO won");
    } else {
      console.log(
        "  Yes Price:",
        (Number(yesPrice) / 1e18).toFixed(4),
        `(${((Number(yesPrice) / 1e18) * 100).toFixed(2)}%)`
      );
      console.log(
        "  No Price:",
        (Number(noPrice) / 1e18).toFixed(4),
        `(${((Number(noPrice) / 1e18) * 100).toFixed(2)}%)`
      );
      console.log("  Yes Pool:", ethers.formatEther(info._yesPool), "shares");
      console.log("  No Pool:", ethers.formatEther(info._noPool), "shares");
    }

    // Check user position if address provided
    const userAddress = process.argv[2];
    if (userAddress && ethers.isAddress(userAddress)) {
      const position = await market.getUserPosition(userAddress);
      if (position._yesShares > 0n || position._noShares > 0n) {
        console.log("\n  Your Position:");
        console.log("    Yes Shares:", ethers.formatEther(position._yesShares));
        console.log("    No Shares:", ethers.formatEther(position._noShares));
      }
    }

    console.log("  Explorer:", `https://testnet.n42.world/address/${marketAddress}`);
    console.log("-".repeat(80));
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
