// Names of members and suppliers, from the simulator's CSVs (copied by scripts/sync-deployments.mjs).
// Off-chain on purpose (OPEN-5): the contract only knows addresses.
import { short } from "./chain";
import { directory } from "./generated/directory";

export interface DirectoryEntry {
  unit?: string;
  name: string;
  kind: "member" | "supplier";
}

export function lookup(chainId: number, address: string): DirectoryEntry | undefined {
  return directory[chainId]?.[address.toLowerCase()];
}

/** "T1-2B · Bruno Díaz" for a member, the name for a supplier, the short address otherwise. */
export function displayName(chainId: number, address: string): string {
  const entry = lookup(chainId, address);
  if (!entry) return short(address);
  return entry.unit ? `${entry.unit} · ${entry.name}` : entry.name;
}
