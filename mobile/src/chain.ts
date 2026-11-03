import { Contract, JsonRpcProvider, Wallet, type Interface } from "ethers";
import type { Deployment, Network } from "./config";

export function connect(network: Network, rpcUrl: string, deployment: Deployment, privateKey: string) {
  // cacheTimeout -1: the default 250 ms request cache can hand a stale nonce to back-to-back txs.
  const provider = new JsonRpcProvider(rpcUrl, network.chainId, { staticNetwork: true, cacheTimeout: -1 });
  const wallet = new Wallet(privateKey, provider);
  const gov = new Contract(deployment.address, deployment.abi as never, wallet);
  return { provider, wallet, gov };
}

export type Connection = ReturnType<typeof connect>;

// Custom errors of CommunityGovernance → message for the member.
const CONTRACT_ERRORS: Record<string, string> = {
  NotRegistered: "Tu cuenta no está en el padrón.",
  AddressIsSupplier: "La cuenta está registrada como proveedor.",
  NotEligible: "Tu cuenta está deshabilitada (moroso).",
  ActiveIssueExists: "Ya tenés una cuestión abierta. Podés plantear otra cuando se cierre.",
  InsufficientFunds: "El techo supera el saldo libre de la tesorería.",
  ZeroCeiling: "El techo tiene que ser mayor a cero.",
  EmptyCid: "Falta la descripción en IPFS.",
  NotInVotingPhase: "La cuestión no está en período de votación.",
  NotEligibleAtSnapshot: "No estabas habilitado cuando se creó la cuestión: no podés votarla.",
  AlreadyVoted: "Ya votaste en esta cuestión. La boleta no se puede cambiar.",
  InvalidRanking: "La boleta tiene que ordenar todas las ofertas y «Rechazar todas», sin repetir.",
  IssueNotFound: "La cuestión no existe.",
};

/** ethers leaves reverts raised during gas estimation undecoded; decode them with the ABI. */
export function describeError(err: unknown, contractInterface: Interface): string {
  const e = err as { revert?: { name: string } | null; data?: string; code?: string; shortMessage?: string };
  const name = e.revert?.name ?? (e.data ? contractInterface.parseError(e.data)?.name : undefined);
  if (name) return CONTRACT_ERRORS[name] ?? `El contrato rechazó la operación (${name}).`;
  if (e.code === "INSUFFICIENT_FUNDS") return "No tenés saldo suficiente para pagar la operación.";
  if (e.code === "NETWORK_ERROR" || e.code === "TIMEOUT") return "No se pudo conectar con la red.";
  return e.shortMessage ?? String(err);
}

export const short = (address: string) => `${address.slice(0, 6)}…${address.slice(-4)}`;
