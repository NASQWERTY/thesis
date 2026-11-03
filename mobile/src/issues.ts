import { decodeBytes32String } from "ethers";
import type { Connection } from "./chain";
import type { Deployment } from "./config";
import { colors } from "./ui";

// Mirror the contract enums (CommunityGovernance.IssuePhase / IssueStatus).
export enum Phase {
  Bidding,
  Voting,
  VotingEnded,
  Closed,
}

export enum Status {
  Open,
  Awarded,
  Executed,
  ClosedWithoutAward,
}

/** Ballot entry that rejects every bid (CommunityGovernance.REJECT_ALL). */
export const REJECT_ALL = 0n;

export interface BidInfo {
  id: bigint;
  supplier: string;
  amount: bigint;
  documentCid: string;
}

export interface IssueInfo {
  id: bigint;
  proposer: string;
  descriptionCid: string;
  topic: string;
  ceiling: bigint;
  phase: Phase;
  status: Status;
  winningBidId: bigint;
  /** Chain timestamps. The registry (weights, delegations) is read at `snapshot`. */
  snapshot: number;
  biddingEnd: number;
  votingEnd: number;
  /** Chain timestamp at which the current phase ends; null once voting has ended. */
  phaseEnd: number | null;
  bids: BidInfo[];
  /** The member's ballot: bid ids and REJECT_ALL, most preferred first; empty if not voted. */
  ranking: bigint[];
  voted: boolean;
}

/** Fixed list offered when raising an issue; stored on-chain as bytes32 (the simulator allows any). */
export const TOPICS = ["general", "mantenimiento", "obras", "limpieza", "seguridad", "servicios"] as const;

export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function topicLabel(topic: string): string {
  try {
    return capitalize(decodeBytes32String(topic)) || "Sin rubro";
  } catch {
    return "Sin rubro";
  }
}

/** Description file stored on IPFS: title on the first line, then a blank line and the body. */
export const descriptionText = (title: string, body: string) => `${title.trim()}\n\n${body.trim()}\n`;

/** Inverse of `descriptionText`. A file without a body (e.g. one line from the simulator) is all title. */
export function parseDescription(text: string): { title: string; body: string } {
  const trimmed = text.trim();
  const newline = trimmed.indexOf("\n");
  if (newline === -1) return { title: trimmed, body: "" };
  return { title: trimmed.slice(0, newline).trim(), body: trimmed.slice(newline + 1).trim() };
}

export function phaseLabel(phase: Phase, status: Status): { text: string; color: string } {
  switch (phase) {
    case Phase.Bidding:
      return { text: "Recibiendo ofertas", color: colors.primary };
    case Phase.Voting:
      return { text: "En votación", color: colors.ok };
    case Phase.VotingEnded:
      return { text: "Votación terminada", color: colors.warn };
    default:
      if (status === Status.Awarded) return { text: "Adjudicada", color: colors.ok };
      if (status === Status.Executed) return { text: "Pagada", color: colors.ok };
      return { text: "Cerrada sin adjudicar", color: colors.muted };
  }
}

/** One issue with its bids and the member's ballot. */
export async function loadIssue({ gov, wallet }: Connection, deployment: Deployment, id: bigint): Promise<IssueInfo> {
  const { biddingPeriod, votingPeriod } = deployment.params;
  const [issue, phase, [bidIds, bidList], ballot] = await Promise.all([
    gov.issues(id),
    gov.phaseOf(id),
    gov.getBids(id),
    gov.getBallot(id, wallet.address),
  ]);
  const biddingEnd = Number(issue.createdAt) + biddingPeriod;
  const votingEnd = biddingEnd + votingPeriod;
  const p = Number(phase) as Phase;
  return {
    id,
    proposer: issue.proposer,
    descriptionCid: issue.descriptionCid,
    topic: topicLabel(issue.topic),
    ceiling: issue.ceiling,
    phase: p,
    status: Number(issue.status) as Status,
    winningBidId: issue.winningBidId,
    snapshot: Number(issue.snapshot),
    biddingEnd,
    votingEnd,
    phaseEnd: p === Phase.Bidding ? biddingEnd : p === Phase.Voting ? votingEnd : null,
    bids: (bidIds as bigint[]).map((bidId, i) => ({
      id: bidId,
      supplier: bidList[i].supplier,
      amount: bidList[i].amount,
      documentCid: bidList[i].documentCid,
    })),
    ranking: [...ballot.ranking],
    voted: ballot.cast,
  };
}

/** Every issue, newest first. Ids are consecutive from 1. */
export async function loadIssues(connection: Connection, deployment: Deployment): Promise<IssueInfo[]> {
  const nextIssueId: bigint = await connection.gov.nextIssueId();
  const ids = Array.from({ length: Number(nextIssueId) - 1 }, (_, i) => nextIssueId - 1n - BigInt(i));
  return Promise.all(ids.map((id) => loadIssue(connection, deployment, id)));
}

/** Chain timestamp → "dd/mm hh:mm" (device time zone). */
export function formatTime(timestamp: number): string {
  const d = new Date(timestamp * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function remaining(seconds: number): string {
  if (seconds <= 0) return "terminando…";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return h > 0 ? `${h} h ${m} min` : m > 0 ? `${m} min ${s} s` : `${s} s`;
}
