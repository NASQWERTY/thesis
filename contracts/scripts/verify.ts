// Publishes the source of the deployed CommunityGovernance on the network's block explorer
// (Arbiscan for Arbitrum Sepolia), reading the address and the constructor parameters from
// shared/deployments/<chainId>.json, as written by deploy.ts.
//
//   npm run verify:sepolia   (needs ETHERSCAN_API_KEY in .env)
import { readFile } from "node:fs/promises";
import hre from "hardhat";
import { verifyContract } from "@nomicfoundation/hardhat-verify/verify";

const { ethers } = await hre.network.getOrCreate();
const { chainId } = await ethers.provider.getNetwork();

const file = new URL(`../../shared/deployments/${chainId}.json`, import.meta.url);
const deployment = JSON.parse(await readFile(file, "utf8"));
const { quorumPercent, biddingPeriod, votingPeriod } = deployment.params;

console.log(`Verifying ${deployment.address} on chainId ${chainId}…`);
await verifyContract(
  {
    address: deployment.address,
    constructorArgs: [quorumPercent, biddingPeriod, votingPeriod],
    provider: "etherscan",
  },
  hre,
);
console.log("Verified.");
