import hardhatToolboxMochaEthersPlugin from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import { configVariable, defineConfig } from "hardhat/config";

export default defineConfig({
  plugins: [hardhatToolboxMochaEthersPlugin],
  solidity: {
    version: "0.8.28",
  },
  networks: {
    // Tests and `npx hardhat node` use the built-in simulated network ("default"),
    // so nothing has to be configured for local work.
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
