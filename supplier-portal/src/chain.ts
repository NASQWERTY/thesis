import {
  BrowserProvider,
  Contract,
  JsonRpcProvider,
  type Eip1193Provider,
  type Interface,
  type JsonRpcSigner,
} from "ethers";
import type { Deployment, Network } from "./config";
import { UPLOADER_URL } from "./config";

declare global {
  interface Window {
    ethereum?: Eip1193Provider & {
      on?: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
    };
  }
}

export interface Session {
  account: string;
  signer: JsonRpcSigner;
  /** Writes: signed by MetaMask. */
  gov: Contract;
  /** Reads: straight to the RPC, so MetaMask's cache never shows stale chain data. */
  reader: Contract;
  provider: JsonRpcProvider;
}

/**
 * Asks MetaMask for an account and puts it on `network`, adding the network if needed.
 * @param account use this one (from `accountsChanged`) instead of MetaMask's first permitted one.
 * @param pickAccount reopen MetaMask's account picker. MetaMask connects each account to the site
 * separately: switching to an account that was never connected does not reach the page.
 */
export async function connectWallet(
  network: Network,
  deployment: Deployment,
  { account, pickAccount }: { account?: string; pickAccount?: boolean } = {},
): Promise<Session> {
  const eth = window.ethereum;
  if (!eth) throw new Error("No se encontró MetaMask. Instale la extensión y recargue la página.");

  if (pickAccount) await eth.request({ method: "wallet_requestPermissions", params: [{ eth_accounts: {} }] });
  await eth.request({ method: "eth_requestAccounts" });
  const chainId = `0x${network.chainId.toString(16)}`;
  try {
    await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId }] });
  } catch (err) {
    // 4902: MetaMask does not know this network yet.
    if ((err as { code?: number }).code !== 4902) throw err;
    await eth.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId,
          chainName: network.label,
          rpcUrls: [network.rpcUrl],
          nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
          blockExplorerUrls: network.explorer ? [network.explorer] : undefined,
        },
      ],
    });
  }

  const signer = await new BrowserProvider(eth).getSigner(account);
  // cacheTimeout -1: no stale responses (same reason as in the simulator and the app).
  const provider = new JsonRpcProvider(network.rpcUrl, network.chainId, { staticNetwork: true, cacheTimeout: -1 });
  return {
    account: await signer.getAddress(),
    signer,
    gov: new Contract(deployment.address, deployment.abi as never, signer),
    reader: new Contract(deployment.address, deployment.abi as never, provider),
    provider,
  };
}

// Custom errors of CommunityGovernance → message for the supplier.
const CONTRACT_ERRORS: Record<string, string> = {
  NotSupplier: "Su cuenta no está registrada como proveedor.",
  NotInBiddingPhase: "La ventana de ofertas de esta cuestión ya cerró.",
  AlreadyBid: "Ya presentó una oferta para esta cuestión.",
  ZeroAmount: "El monto debe ser mayor que 0.",
  AmountAboveCeiling: "El monto supera el techo de la cuestión.",
  EmptyCid: "Falta el documento de la propuesta.",
  IssueNotFound: "La cuestión no existe.",
};

/** ethers leaves reverts raised during gas estimation undecoded; decode them with the ABI. */
export function describeError(err: unknown, contractInterface?: Interface): string {
  const e = err as {
    revert?: { name: string } | null;
    data?: string;
    code?: string | number;
    shortMessage?: string;
    message?: string;
    info?: { error?: { data?: string } };
  };
  if (e.code === "ACTION_REJECTED" || e.code === 4001) return "Se canceló la operación en MetaMask.";
  const data = e.data ?? e.info?.error?.data;
  let name = e.revert?.name;
  if (!name && typeof data === "string") {
    try {
      name = contractInterface?.parseError(data)?.name;
    } catch {
      // not a contract error
    }
  }
  if (name) return CONTRACT_ERRORS[name] ?? `El contrato rechazó la operación (${name}).`;
  if (e.code === "INSUFFICIENT_FUNDS") return "No tiene saldo suficiente para pagar el gas.";
  if (typeof e.message === "string" && e.message.includes("nonce")) {
    return "MetaMask tiene un nonce desactualizado (¿se reinició el nodo local?). En MetaMask: Configuración → Avanzado → Borrar datos de actividad.";
  }
  return e.shortMessage ?? e.message ?? String(err);
}

export const short = (address: string) => `${address.slice(0, 6)}…${address.slice(-4)}`;

/**
 * Fees suggested to MetaMask, read from the RPC: ethers sets the max fee to twice the current base
 * fee plus the tip. MetaMask's own estimate can be so tight that Arbitrum Sepolia rejects it when
 * the base fee rises a little in the next block ("max fee per gas less than block base fee").
 */
export async function feeOverrides(session: Session) {
  const { maxFeePerGas, maxPriorityFeePerGas } = await session.provider.getFeeData();
  return maxFeePerGas !== null && maxPriorityFeePerGas !== null ? { maxFeePerGas, maxPriorityFeePerGas } : {};
}

/** Gateway domain from the uploader, to link IPFS files; null if the uploader is not running. */
export async function fetchGateway(): Promise<string | null> {
  try {
    const response = await fetch(`${UPLOADER_URL}/config`);
    return ((await response.json()) as { gateway: string | null }).gateway;
  } catch {
    return null;
  }
}

export async function uploadFile(file: File): Promise<string> {
  const body = new FormData();
  body.append("file", file, file.name);
  let response: Response;
  try {
    response = await fetch(`${UPLOADER_URL}/upload`, { method: "POST", body });
  } catch {
    throw new Error("No se pudo contactar al servicio de subida de archivos. Intente de nuevo más tarde.");
  }
  const json = (await response.json()) as { cid?: string; error?: string };
  if (!response.ok || !json.cid) throw new Error(json.error ?? `Error al subir el archivo (HTTP ${response.status}).`);
  return json.cid;
}
