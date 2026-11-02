// Consultable history (prototype limit, spec §6): every contract event since the deployment,
// decoded and in order. It is built from events only, like any other client would.
import { EventLog, formatEther, getAddress } from "ethers";
import type { Connection } from "./chain.ts";
import type { MemberRow, SupplierRow } from "./csv.ts";

// Event args are dynamic: their names and types come from the ABI at runtime.
type Args = Record<string, any>;

interface Names {
  member: (address: string) => string;
  supplier: (address: string) => string;
  account: (address: string) => string;
}

const eth = (wei: bigint) => `${formatEther(wei)} ETH`;

/** [title, detail] for each event of spec §6, in Spanish. */
const FORMAT: Record<string, (a: Args, n: Names) => [string, string]> = {
  MemberRegistered: (a, n) => ["Alta de miembro", `${n.member(a.member)} · peso ${a.weight}`],
  MemberRemoved: (a, n) => ["Baja de miembro", n.member(a.member)],
  EligibilityChanged: (a, n) => [a.eligible ? "Miembro habilitado" : "Miembro deshabilitado", n.member(a.member)],
  WeightChanged: (a, n) => ["Cambio de peso", `${n.member(a.member)} · ${a.oldWeight} → ${a.newWeight}`],
  SupplierRegistered: (a, n) => ["Alta de proveedor", n.supplier(a.supplier)],
  TreasuryFunded: (a, n) => ["Aporte a la tesorería", `${eth(a.amount)} aportados por ${n.account(a.from)}`],
  IssueCreated: (a, n) => [`Cuestión #${a.issueId} planteada`, `por ${n.member(a.proposer)} · techo ${eth(a.ceiling)}`],
  BidSubmitted: (a, n) => [`Oferta #${a.bidId} a la cuestión #${a.issueId}`, `${n.supplier(a.supplier)} · ${eth(a.amount)}`],
  DelegationSet: (a, n) => ["Delegación", `${n.member(a.delegator)} delega en ${n.member(a.delegate)}`],
  DelegationRevoked: (a, n) => ["Delegación revocada", n.member(a.delegator)],
  BallotCast: (a, n) => [`Voto en la cuestión #${a.issueId}`, n.member(a.voter)],
  IssueAwarded: (a) => [`Cuestión #${a.issueId} adjudicada`, `oferta #${a.bidId}`],
  IssueClosedWithoutAward: (a) => [`Cuestión #${a.issueId} cerrada sin adjudicar`, "se libera la reserva"],
  TransferExecuted: (a, n) => [
    `Pago de la cuestión #${a.issueId}`,
    `${eth(a.amount)} a ${n.supplier(a.supplier)} · se liberan ${eth(a.released)}`,
  ],
};

export async function history(
  c: Connection,
  members: Map<string, MemberRow>,
  suppliers: Map<string, SupplierRow>,
  issueFilter?: bigint,
) {
  const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
  const registrar = getAddress(c.deployment.registrar);
  const names: Names = {
    member: (a) => (members.has(a) ? `${members.get(a)!.unit} ${members.get(a)!.owner}` : short(a)),
    supplier: (a) => suppliers.get(a)?.name ?? short(a),
    account: (a) => (a === registrar ? "el registrador" : members.has(a) ? names.member(a) : names.supplier(a)),
  };

  // "*" = every event of the contract; ethers decodes each log with the ABI.
  const logs = (await c.gov.queryFilter("*", c.deployment.deployBlock)).filter(
    (log): log is EventLog => log instanceof EventLog,
  );
  const events = logs
    .map((log) => ({ log, args: log.args.toObject() as Args }))
    .filter(({ args }) => issueFilter === undefined || args.issueId === issueFilter);

  const timestamps = new Map<number, number>();
  for (const { log } of events) {
    if (!timestamps.has(log.blockNumber)) {
      timestamps.set(log.blockNumber, (await c.provider.getBlock(log.blockNumber))!.timestamp);
    }
  }
  const date = (ts: number) =>
    new Date(ts * 1000).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "medium" });

  const scope = issueFilter === undefined ? "" : ` de la cuestión #${issueFilter}`;
  console.log(`Historial${scope} · contrato ${c.deployment.address} (${events.length} ${events.length === 1 ? "evento" : "eventos"})\n`);
  for (const { log, args } of events) {
    const [title, detail] = FORMAT[log.eventName]?.(args, names) ?? [log.eventName, JSON.stringify(args, (_, v) => (typeof v === "bigint" ? v.toString() : v))];
    console.log(
      `  ${String(log.blockNumber).padStart(6)}  ${date(timestamps.get(log.blockNumber)!).padEnd(24)}` +
        `${title.padEnd(32)}${detail}  ${short(log.transactionHash)}`,
    );
  }
}
