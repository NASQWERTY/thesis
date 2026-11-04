import Constants from "expo-constants";

export interface Deployment {
  address: string;
  chainId: number;
  deployBlock: number;
  params: { quorumPercent: number; biddingPeriod: number; votingPeriod: number };
  abi: unknown[];
}

export type NetworkId = "local" | "sepolia";

export interface Network {
  id: NetworkId;
  label: string;
  chainId: number;
  defaultRpcUrl: () => string;
}

/**
 * The phone loads the app from the PC's Metro server (hostUri = "<PC IP>:8081"), so the local
 * chain started with `npm run node` is at the same IP on port 8545. Falls back to the Android
 * emulator's alias for the host machine.
 */
function pcHost(): string {
  return Constants.expoConfig?.hostUri?.split(":")[0] ?? "10.0.2.2";
}

function localRpcUrl(): string {
  return `http://${pcHost()}:8545`;
}

/** Upload service (`uploader/`), run on the same PC for both networks: it holds the Pinata JWT. */
export const UPLOADER_URL = `http://${pcHost()}:8787`;

export const NETWORKS: Record<NetworkId, Network> = {
  local: { id: "local", label: "Local", chainId: 31337, defaultRpcUrl: localRpcUrl },
  sepolia: {
    id: "sepolia",
    label: "Arbitrum Sepolia",
    chainId: 421614,
    defaultRpcUrl: () => "https://sepolia-rollup.arbitrum.io/rpc",
  },
};

/** Community shown in the app header. Fixed: the contract does not store a name. */
export const COMMUNITY_NAME = "Jardines del Sur";
