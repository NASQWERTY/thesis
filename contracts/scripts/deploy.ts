// Deploys CommunityGovernance and writes shared/deployments/<chainId>.json, the only file the
// clients (simulator, supplier portal, member app) need to reach the contract.
//
//   npm run deploy:local     → local node started with `npm run node`
//   npm run deploy:sepolia   → Arbitrum Sepolia (needs .env)
import { mkdir, writeFile } from "node:fs/promises";
import hre from "hardhat";

const LOCAL_CHAIN_ID = 31337n;

// The quorum percentage was decided (ADR-0023): 50 % on every network unless overridden.
const DEFAULTS: Record<string, string> = { QUORUM_PERCENT: "50" };

// Development values for the local chain only: short periods so a full issue cycle fits in a demo.
// On the testnet the periods must come from .env.
const LOCAL_DEFAULTS: Record<string, string> = {
  BIDDING_PERIOD_SECONDS: "300",
  VOTING_PERIOD_SECONDS: "600",
};

const { ethers, networkName } = await hre.network.getOrCreate();
const { chainId } = await ethers.provider.getNetwork();
const isLocal = chainId === LOCAL_CHAIN_ID;

function param(name: string): bigint {
  const value = process.env[name] || DEFAULTS[name] || (isLocal ? LOCAL_DEFAULTS[name] : undefined);
  if (!value) throw new Error(`Missing ${name} in .env (required outside the local chain)`);
  return BigInt(value);
}

const quorumPercent = param("QUORUM_PERCENT");
const biddingPeriod = param("BIDDING_PERIOD_SECONDS");
const votingPeriod = param("VOTING_PERIOD_SECONDS");

const [deployer] = await ethers.getSigners();
console.log(`Network:   ${networkName} (chainId ${chainId})`);
console.log(`Deployer:  ${deployer.address} (= registrar)`);
console.log(`Params:    quorum=${quorumPercent}% bidding=${biddingPeriod}s voting=${votingPeriod}s`);

const gov = await ethers.deployContract("CommunityGovernance", [quorumPercent, biddingPeriod, votingPeriod]);
await gov.waitForDeployment();
const receipt = await gov.deploymentTransaction()!.wait();
const address = await gov.getAddress();

const { abi } = await hre.artifacts.readArtifact("CommunityGovernance");
const deployment = {
  contractName: "CommunityGovernance",
  network: networkName,
  chainId: Number(chainId),
  address,
  registrar: deployer.address,
  // Clients read the history (events) starting from this block.
  deployBlock: receipt!.blockNumber,
  deployedAt: new Date().toISOString(),
  params: {
    quorumPercent: Number(quorumPercent),
    biddingPeriod: Number(biddingPeriod),
    votingPeriod: Number(votingPeriod),
  },
  abi,
};

const outDir = new URL("../../shared/deployments/", import.meta.url);
await mkdir(outDir, { recursive: true });
const outFile = new URL(`${chainId}.json`, outDir);
await writeFile(outFile, JSON.stringify(deployment, null, 2) + "\n");

console.log(`Contract:  ${address} (block ${receipt!.blockNumber})`);
console.log(`Written:   shared/deployments/${chainId}.json`);
