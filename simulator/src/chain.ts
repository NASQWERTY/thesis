import { readFile } from "node:fs/promises";
import { Contract, HDNodeWallet, JsonRpcProvider, Mnemonic, Wallet } from "ethers";
import { UserError } from "./errors.ts";

export type NetworkName = "local" | "sepolia";

export interface Deployment {
  address: string;
  chainId: number;
  registrar: string;
  deployBlock: number;
  params: { quorumPercent: number; biddingPeriod: number; votingPeriod: number };
  abi: unknown[];
}

// Public, well-known mnemonic of the Hardhat local chain. Never use it outside it.
const HARDHAT_MNEMONIC = Mnemonic.fromPhrase("test test test test test test test test test test test junk");

export function hardhatAccount(index: number): HDNodeWallet {
  return HDNodeWallet.fromMnemonic(HARDHAT_MNEMONIC, `m/44'/60'/0'/0/${index}`);
}

try {
  process.loadEnvFile(new URL("../../.env", import.meta.url));
} catch {
  // No .env: fine for the local chain.
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new UserError(`Falta ${name} en el .env de la raíz del repo`);
  return value;
}

const NETWORKS = {
  local: {
    chainId: 31337,
    rpcUrl: () => process.env.LOCAL_RPC_URL || "http://127.0.0.1:8545",
    registrarKey: () => hardhatAccount(0).privateKey,
    hint: "¿está corriendo `npm run node` en contracts/?",
  },
  sepolia: {
    chainId: 421614,
    rpcUrl: () => requiredEnv("ARBITRUM_SEPOLIA_RPC_URL"),
    registrarKey: () => requiredEnv("DEPLOYER_PRIVATE_KEY"),
    hint: "revisá ARBITRUM_SEPOLIA_RPC_URL en el .env",
  },
} as const;

export function dataDir(network: NetworkName): URL {
  return new URL(`../data/${network}/`, import.meta.url);
}

export async function connect(network: NetworkName) {
  const cfg = NETWORKS[network];

  let deployment: Deployment;
  try {
    const file = new URL(`../../shared/deployments/${cfg.chainId}.json`, import.meta.url);
    deployment = JSON.parse(await readFile(file, "utf8"));
  } catch {
    throw new UserError(`No hay un deploy para la red ${network}. Corré el deploy en contracts/ primero.`);
  }

  // cacheTimeout -1: ethers caches identical requests for 250 ms by default, which hands a stale
  // nonce to the second of two back-to-back transactions.
  const provider = new JsonRpcProvider(cfg.rpcUrl(), cfg.chainId, { staticNetwork: true, cacheTimeout: -1 });
  let code: string;
  try {
    code = await provider.getCode(deployment.address);
  } catch {
    provider.destroy();
    throw new UserError(`No se pudo conectar a la red ${network}: ${cfg.hint}`);
  }
  if (code === "0x") {
    provider.destroy();
    throw new UserError(
      `No hay contrato en ${deployment.address}. Si reiniciaste el nodo local, volvé a correr \`npm run deploy:local\`.`,
    );
  }

  const registrar = new Wallet(cfg.registrarKey(), provider);
  const gov = new Contract(deployment.address, deployment.abi as never, registrar);
  return { network, provider, registrar, gov, deployment };
}

export type Connection = Awaited<ReturnType<typeof connect>>;
