import "@nomicfoundation/hardhat-toolbox";
import "dotenv/config";

/** @type import('hardhat/config').HardhatUserConfig */
export default {
  solidity: {
    version: "0.8.27",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    n42: {
      url: "https://testrpc.n42.world",
      chainId: 1142,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: "auto",
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  etherscan: {
    apiKey: {
      n42: "placeholder", // N42 may not require API key
    },
    customChains: [
      {
        network: "n42",
        chainId: 1142,
        urls: {
          apiURL: "https://testnet.n42.world/api",
          browserURL: "https://testnet.n42.world",
        },
      },
    ],
  },
};
