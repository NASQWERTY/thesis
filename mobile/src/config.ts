import Constants from "expo-constants";

export interface Deployment {
  address: string;
  chainId: number;
  deployBlock: number;
  params: { quorum: number; biddingPeriod: number; votingPeriod: number };
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
function localRpcUrl(): string {
  const host = Constants.expoConfig?.hostUri?.split(":")[0];
  return `http://${host ?? "10.0.2.2"}:8545`;
}

export const NETWORKS: Record<NetworkId, Network> = {
  local: { id: "local", label: "Local", chainId: 31337, defaultRpcUrl: localRpcUrl },
  sepolia: {
    id: "sepolia",
    label: "Arbitrum Sepolia",
    chainId: 421614,
    defaultRpcUrl: () => "https://sepolia-rollup.arbitrum.io/rpc",
  },
};
