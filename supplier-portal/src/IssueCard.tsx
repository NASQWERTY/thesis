import { useEffect, useState } from "react";
import { formatEther, parseEther } from "ethers";
import { describeError, feeOverrides, short, uploadFile, type Session } from "./chain";

export interface OpenIssue {
  id: bigint;
  proposer: string;
  descriptionCid: string;
  topic: string;
  ceiling: bigint;
  biddingEnd: number; // chain timestamp
  bidCount: number;
  myBid: boolean;
}

function remaining(seconds: number): string {
  if (seconds <= 0) return "cerrada";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return h > 0 ? `${h} h ${m} min` : m > 0 ? `${m} min ${s} s` : `${s} s`;
}

/** First lines of a text description on IPFS; null when it is not text or not reachable. */
function useDescription(gateway: string | null, cid: string) {
  const [text, setText] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    if (!gateway) return setText(null);
    let cancelled = false;
    fetch(`https://${gateway}/ipfs/${cid}`)
      .then(async (r) => {
        const type = r.headers.get("content-type") ?? "";
        if (!r.ok || !type.startsWith("text/")) return null;
        return (await r.text()).slice(0, 400);
      })
      .catch(() => null)
      .then((t) => !cancelled && setText(t));
    return () => {
      cancelled = true;
    };
  }, [gateway, cid]);
  return text;
}

export function IssueCard({
  issue,
  now,
  gateway,
  session,
  canBid,
  onBidSubmitted,
}: {
  issue: OpenIssue;
  now: number;
  gateway: string | null;
  session: Session;
  canBid: boolean;
  onBidSubmitted: () => void;
}) {
  const description = useDescription(gateway, issue.descriptionCid);
  const [open, setOpen] = useState(false);
  const left = issue.biddingEnd - now;

  return (
    <article className="card">
      <header className="card-head">
        <h3>Cuestión #{issue.id.toString()}</h3>
        <span className="tag">{issue.topic}</span>
      </header>

      <p className="description">
        {description === undefined
          ? "Cargando descripción…"
          : description ?? <em>Descripción no disponible como texto.</em>}
      </p>
      {gateway && (
        <a href={`https://${gateway}/ipfs/${issue.descriptionCid}`} target="_blank" rel="noreferrer">
          Ver descripción completa en IPFS
        </a>
      )}

      <dl className="facts">
        <dt>Techo</dt>
        <dd>{formatEther(issue.ceiling)} ETH</dd>
        <dt>Cierre de ofertas</dt>
        <dd>en {remaining(left)}</dd>
        <dt>Ofertas recibidas</dt>
        <dd>{issue.bidCount}</dd>
        <dt>Planteada por</dt>
        <dd className="mono">{short(issue.proposer)}</dd>
      </dl>

      {issue.myBid ? (
        <p className="ok">Ya presentaste tu oferta para esta cuestión.</p>
      ) : !canBid ? null : open ? (
        <BidForm
          issue={issue}
          session={session}
          onCancel={() => setOpen(false)}
          onDone={() => {
            setOpen(false);
            onBidSubmitted();
          }}
        />
      ) : (
        <button onClick={() => setOpen(true)} disabled={left <= 0}>
          Presentar oferta
        </button>
      )}
    </article>
  );
}

function BidForm({
  issue,
  session,
  onCancel,
  onDone,
}: {
  issue: OpenIssue;
  session: Session;
  onCancel: () => void;
  onDone: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    let wei: bigint;
    try {
      wei = parseEther(amount.replace(",", "."));
    } catch {
      return setError("Ingresá un monto válido en ETH, por ejemplo 1.5");
    }
    if (wei <= 0n) return setError("El monto debe ser mayor que 0.");
    if (wei > issue.ceiling) return setError(`El monto supera el techo de ${formatEther(issue.ceiling)} ETH.`);
    if (!file) return setError("Adjuntá el documento de la propuesta.");

    setBusy(true);
    try {
      // Dry run first (any non-empty CID passes the contract check): if the bid would be
      // rejected, nothing is uploaded to IPFS.
      setStatus("Verificando la oferta…");
      await session.gov.submitBid.estimateGas(issue.id, wei, "pendiente");
      setStatus("Subiendo el documento a IPFS…");
      const cid = await uploadFile(file);
      setStatus("Confirmá la transacción en MetaMask…");
      const tx = await session.gov.submitBid(issue.id, wei, cid, await feeOverrides(session));
      setStatus("Esperando confirmación de la red…");
      const receipt = await tx.wait();
      const event = receipt.logs
        .map((log: { topics: string[]; data: string }) => session.gov.interface.parseLog(log))
        .find((parsed: { name: string } | null) => parsed?.name === "BidSubmitted");
      setStatus(`Oferta #${event?.args.bidId ?? "?"} registrada.`);
      onDone();
    } catch (err) {
      setStatus(null);
      setError(err instanceof Error && !("code" in err) ? err.message : describeError(err, session.gov.interface));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="bid-form" onSubmit={submit}>
      <label>
        Monto (ETH), hasta {formatEther(issue.ceiling)}
        <input
          inputMode="decimal"
          placeholder="1.5"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={busy}
        />
      </label>
      <label>
        Propuesta (PDF)
        <input type="file" accept=".pdf,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} disabled={busy} />
      </label>
      {status && <p className="status">{status}</p>}
      {error && <p className="error">{error}</p>}
      <div className="actions">
        <button type="submit" disabled={busy}>
          {busy ? "Enviando…" : "Enviar oferta"}
        </button>
        <button type="button" className="secondary" onClick={onCancel} disabled={busy}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
