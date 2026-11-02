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
  rpcUrl: string;
  explorer?: string;
}

export const NETWORKS: Record<NetworkId, Network> = {
  local: { id: "local", label: "Red local", chainId: 31337, rpcUrl: "http://127.0.0.1:8545" },
  sepolia: {
    id: "sepolia",
    label: "Arbitrum Sepolia",
    chainId: 421614,
    rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc",
    explorer: "https://sepolia.arbiscan.io",
  },
};

/** Upload service (uploader/): holds the Pinata JWT, returns the CID of each file. */
export const UPLOADER_URL = import.meta.env.VITE_UPLOADER_URL ?? `http://${location.hostname}:8787`;
