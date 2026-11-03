// Publishes the source of the deployed CommunityGovernance, reading the address and the
// constructor parameters from shared/deployments/<chainId>.json, as written by deploy.ts.
//
//   npm run verify:sepolia
//
// Sourcify first: open, needs no API key, and is the verification the delivery relies on.
// Then Etherscan (Arbiscan), best effort: it needs ETHERSCAN_API_KEY and, on 2026-11-03, rejected
// the submission with "Invalid API Key (#err3)" although the same key worked for reads.
import { readFile } from "node:fs/promises";
import hre from "hardhat";
import { verifyContract } from "@nomicfoundation/hardhat-verify/verify";

const { ethers } = await hre.network.getOrCreate();
const { chainId } = await ethers.provider.getNetwork();

const file = new URL(`../../shared/deployments/${chainId}.json`, import.meta.url);
const deployment = JSON.parse(await readFile(file, "utf8"));
const { quorumPercent, biddingPeriod, votingPeriod } = deployment.params;
const args = { address: deployment.address, constructorArgs: [quorumPercent, biddingPeriod, votingPeriod] };

console.log(`Verifying ${deployment.address} on chainId ${chainId}…`);
await verifyContract({ ...args, provider: "sourcify" }, hre);

try {
  await verifyContract({ ...args, provider: "etherscan" }, hre);
} catch (err) {
  console.warn(`Etherscan verification skipped: ${(err as Error).message}`);
}
