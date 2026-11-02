import { useCallback, useEffect, useState } from "react";
import { decodeBytes32String, formatEther } from "ethers";
import { connectWallet, describeError, fetchGateway, short, type Session } from "./chain";
import { NETWORKS, type NetworkId } from "./config";
import { deployments } from "./generated/deployments";
import { IssueCard, type OpenIssue } from "./IssueCard";
import { MyBids, type MyBid } from "./MyBids";

const PHASE_LABELS = ["Recibiendo ofertas", "En votación", "Votación terminada"];

function topicLabel(topic: string): string {
  try {
    return decodeBytes32String(topic) || "sin tema";
  } catch {
    return "sin tema";
  }
}

const available = (Object.keys(NETWORKS) as NetworkId[]).filter((id) => deployments[NETWORKS[id].chainId]);

export default function App() {
  const [networkId, setNetworkId] = useState<NetworkId>(available[0] ?? "local");
  const network = NETWORKS[networkId];
  const deployment = deployments[network.chainId];

  const [session, setSession] = useState<Session | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isSupplier, setIsSupplier] = useState(false);
  const [balance, setBalance] = useState<bigint>(0n);
  const [issues, setIssues] = useState<OpenIssue[]>([]);
  const [myBids, setMyBids] = useState<MyBid[]>([]);
  const [gateway, setGateway] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Chain time can differ from the computer's (the local chain can be moved forward), so the
  // countdowns run on chain time: offset measured at each refresh.
  const [clockOffset, setClockOffset] = useState(0);
  const [now, setNow] = useState(Date.now() / 1000);

  useEffect(() => {
    fetchGateway().then(setGateway);
    const timer = setInterval(() => setNow(Date.now() / 1000), 1000);
    return () => clearInterval(timer);
  }, []);

  async function connect() {
    if (!deployment) return;
    setConnecting(true);
    setError(null);
    try {
      setSession(await connectWallet(network, deployment));
    } catch (err) {
      setError(err instanceof Error && !("code" in err) ? err.message : describeError(err));
    } finally {
      setConnecting(false);
    }
  }

  // MetaMask: switching account reconnects; switching network reloads the page.
  useEffect(() => {
    const eth = window.ethereum;
    if (!eth?.on || !session) return;
    const onAccounts = () => connect();
    const onChain = () => window.location.reload();
    eth.on("accountsChanged", onAccounts);
    eth.on("chainChanged", onChain);
    return () => {
      eth.removeListener?.("accountsChanged", onAccounts);
      eth.removeListener?.("chainChanged", onChain);
    };
  });

  const refresh = useCallback(async () => {
    if (!session || !deployment) return;
    const { reader, provider, account } = session;
    setLoading(true);
    try {
      const [supplier, bal, nextIssueId, block, biddingPeriod] = await Promise.all([
        reader.isSupplier(account),
        provider.getBalance(account),
        reader.nextIssueId(),
        provider.getBlock("latest"),
        reader.BIDDING_PERIOD(),
      ]);
      setIsSupplier(supplier);
      setBalance(bal);
      setClockOffset(block!.timestamp - Date.now() / 1000);

      // Open issues = phase Bidding. Ids are consecutive from 1.
      const open: OpenIssue[] = [];
      for (let id = 1n; id < nextIssueId; id++) {
        if ((await reader.phaseOf(id)) !== 0n) continue;
        const [issue, [bidIds], myBid] = await Promise.all([
          reader.issues(id),
          reader.getBids(id),
          reader.hasBid(id, account),
        ]);
        open.push({
          id,
          proposer: issue.proposer,
          descriptionCid: issue.descriptionCid,
          topic: topicLabel(issue.topic),
          ceiling: issue.ceiling,
          biddingEnd: Number(issue.createdAt) + Number(biddingPeriod),
          bidCount: bidIds.length,
          myBid,
        });
      }
      setIssues(open);

      // My bids, from my BidSubmitted events (supplier is an indexed parameter).
      const events = await reader.queryFilter(reader.filters.BidSubmitted(null, null, account), deployment.deployBlock);
      const mine: MyBid[] = [];
      for (const ev of events) {
        const { issueId, bidId } = (ev as unknown as { args: { issueId: bigint; bidId: bigint } }).args;
        const [bid, phase, issue] = await Promise.all([reader.bids(bidId), reader.phaseOf(issueId), reader.issues(issueId)]);
        mine.push({ bidId, issueId, amount: bid.amount, documentCid: bid.documentCid, phase: phaseLabel(phase, issue, bidId) });
      }
      setMyBids(mine.reverse());
      setError(null);
    } catch {
      setError(`No se pudo leer el contrato en ${network.rpcUrl}. ¿Está corriendo el nodo?`);
    } finally {
      setLoading(false);
    }
  }, [session, deployment, network.rpcUrl]);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 15000);
    return () => clearInterval(timer);
  }, [refresh]);

  return (
    <div className="page">
      <header className="top">
        <div>
          <h1>Portal de proveedores</h1>
          <p className="muted">Gobernanza comunitaria · cuestiones abiertas a ofertas</p>
        </div>
        <div className="account">
          {session ? (
            <>
              <span className="mono">{short(session.account)}</span>
              <span className="muted">{formatEther(balance)} ETH</span>
              <span className="tag">{network.label}</span>
            </>
          ) : (
            <>
              <select value={networkId} onChange={(e) => setNetworkId(e.target.value as NetworkId)}>
                {(Object.keys(NETWORKS) as NetworkId[]).map((id) => (
                  <option key={id} value={id} disabled={!deployments[NETWORKS[id].chainId]}>
                    {NETWORKS[id].label}
                    {deployments[NETWORKS[id].chainId] ? "" : " (sin desplegar)"}
                  </option>
                ))}
              </select>
              <button onClick={connect} disabled={connecting || !deployment}>
                {connecting ? "Conectando…" : "Conectar MetaMask"}
              </button>
            </>
          )}
        </div>
      </header>

      {!deployment && (
        <p className="error">No hay un contrato desplegado en ninguna red. Corré el deploy en contracts/ y reiniciá el portal.</p>
      )}
      {error && <p className="error">{error}</p>}

      {!session ? (
        <section className="intro">
          <p>
            Conectá tu billetera MetaMask con la cuenta de proveedor que te dio de alta el registrador para ver las
            cuestiones abiertas y presentar ofertas.
          </p>
        </section>
      ) : (
        <>
          {!isSupplier && (
            <p className="warning">
              La cuenta {short(session.account)} no está registrada como proveedor: podés ver las cuestiones, pero no
              ofertar. Pedile al registrador que te dé de alta.
            </p>
          )}

          <section>
            <div className="section-head">
              <h2>Cuestiones abiertas a ofertas</h2>
              <button className="secondary" onClick={refresh} disabled={loading}>
                {loading ? "Actualizando…" : "Actualizar"}
              </button>
            </div>
            {issues.length === 0 ? (
              <p className="muted">No hay cuestiones recibiendo ofertas en este momento.</p>
            ) : (
              <div className="grid">
                {issues.map((issue) => (
                  <IssueCard
                    key={issue.id.toString()}
                    issue={issue}
                    now={now + clockOffset}
                    gateway={gateway}
                    session={session}
                    canBid={isSupplier}
                    onBidSubmitted={refresh}
                  />
                ))}
              </div>
            )}
          </section>

          <section>
            <h2>Mis ofertas</h2>
            <MyBids bids={myBids} gateway={gateway} />
          </section>
        </>
      )}

      {!gateway && session && (
        <p className="muted small">
          El servicio de subida (uploader) no responde: no se pueden adjuntar ni ver documentos de IPFS.
        </p>
      )}
    </div>
  );
}

function phaseLabel(phase: bigint, issue: { status: bigint; winningBidId: bigint }, bidId: bigint): string {
  if (phase < 3n) return PHASE_LABELS[Number(phase)];
  const mine = issue.winningBidId === bidId;
  if (issue.status === 1n) return mine ? "Adjudicada a tu oferta" : "Adjudicada a otra oferta";
  if (issue.status === 2n) return mine ? "Pagada a tu cuenta" : "Pagada a otro proveedor";
  return "Cerrada sin adjudicar";
}
