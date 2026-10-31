import hardhatToolboxMochaEthersPlugin from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import { configVariable, defineConfig } from "hardhat/config";

// The repo-level .env (never committed) feeds configVariable() and the deploy script.
try {
  process.loadEnvFile(new URL("../.env", import.meta.url));
} catch {
  // No .env: fine for tests and the local chain.
}

export default defineConfig({
  plugins: [hardhatToolboxMochaEthersPlugin],
  solidity: {
    version: "0.8.28",
  },
  networks: {
    // Tests use the built-in simulated network ("default"); `localhost` (built in) points to
    // the node started with `npm run node`.
    arbitrumSepolia: {
      type: "http",
      chainType: "generic",
      chainId: 421614,
      // Resolved lazily from env vars or the Hardhat keystore, only when this network is used.
      url: configVariable("ARBITRUM_SEPOLIA_RPC_URL"),
      accounts: [configVariable("DEPLOYER_PRIVATE_KEY")],
    },
  },
});
