import type { Interface } from "ethers";

/** An expected failure: printed as a plain message, without a stack trace. */
export class UserError extends Error {}

// Custom errors of CommunityGovernance → message for the registrar.
const CONTRACT_ERRORS: Record<string, string> = {
  NotRegistrar: "la cuenta firmante no es el registrador del contrato",
  ZeroAddress: "la dirección no puede ser la dirección cero",
  ZeroWeight: "el peso debe ser mayor que 0",
  AlreadyRegistered: "ya está registrada",
  NotRegistered: "no está en el padrón",
  AddressIsSupplier: "la dirección está registrada como proveedor",
  AddressIsMember: "la dirección es o fue miembro del padrón",
  EligibilityUnchanged: "la habilitación ya tiene ese valor",
  IssueNotFound: "la cuestión no existe",
  IssueNotOpen: "la cuestión ya está cerrada",
  VotingNotOver: "la votación no terminó (y no votó todo el padrón)",
};

/**
 * Turns a failed contract call into a readable reason. When the revert happens while estimating
 * gas, ethers leaves it undecoded (`revert: null`), so the raw data is decoded with the ABI here.
 */
export function describeError(err: unknown, contractInterface: Interface): string {
  const e = err as { revert?: { name: string } | null; data?: string; shortMessage?: string; message?: string };
  const name = e.revert?.name ?? (e.data ? contractInterface.parseError(e.data)?.name : undefined);
  if (name) return CONTRACT_ERRORS[name] ?? `el contrato rechazó la operación (${name})`;
  return e.shortMessage ?? e.message ?? String(err);
}
