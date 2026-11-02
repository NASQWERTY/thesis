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
    // Tests use the built-in simulated network ("default"), which only mines on transactions:
    // that keeps their clock deterministic. `localhost` (built in) points to `npm run node`.

    // The node for local demos (`npm run node`) also mines an empty block every second, like a
    // real chain. Otherwise an idle node keeps an old "latest" block, and reads (phaseOf) see an
    // old time while the next transaction gets the current one.
    demoNode: {
      type: "edr-simulated",
      chainType: "l1",
      mining: { auto: true, interval: 1000 },
    },
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
