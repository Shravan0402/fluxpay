import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

// 0G Testnet configuration
const OG_TESTNET = {
  chainId: 16601,
  name: "0G-Galileo-Testnet",
  currency: {
    name: "OG",
    symbol: "OG",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://rpc-galileo.0g.ai"],
    },
    public: {
      http: ["https://rpc-galileo.0g.ai"],
    },
  },
  blockExplorers: {
    default: {
      name: "0G Chainscan",
      url: "https://chainscan-galileo.0g.ai",
    },
  },
  testnet: true,
};
import "dotenv/config";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    polygonAmoy: {
      url: "https://polygon-amoy.drpc.org",
      accounts: ["0x7cf73cff18de223ccfc1188c034f639768a90fd628393d0538fdb54d62b64695"],
      chainId: 80002,
    },
    ogTestnet: {
      url: "https://evmrpc-testnet.0g.ai",
      accounts: ["0x7cf73cff18de223ccfc1188c034f639768a90fd628393d0538fdb54d62b64695"],
      chainId: 16602,
    },
    hardhat: {
      chainId: 1337,
    },
  },
  etherscan: {
    apiKey: {
      polygonAmoy: process.env.POLYGONSCAN_API_KEY || "",
      ogTestnet: process.env.OGSCAN_API_KEY || "",
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

export default config;
