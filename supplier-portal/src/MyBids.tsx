import { formatEther } from "ethers";

export interface MyBid {
  bidId: bigint;
  issueId: bigint;
  amount: bigint;
  documentCid: string;
  phase: string;
}

export function MyBids({ bids, gateway }: { bids: MyBid[]; gateway: string | null }) {
  if (bids.length === 0) return <p className="muted">Todavía no presentó ofertas.</p>;
  return (
    <table>
      <thead>
        <tr>
          <th>Oferta</th>
          <th>Cuestión</th>
          <th>Monto</th>
          <th>Estado de la cuestión</th>
          <th>Documento</th>
        </tr>
      </thead>
      <tbody>
        {bids.map((b) => (
          <tr key={b.bidId.toString()}>
            <td>#{b.bidId.toString()}</td>
            <td>#{b.issueId.toString()}</td>
            <td>{formatEther(b.amount)} ETH</td>
            <td>{b.phase}</td>
            <td>
              {gateway ? (
                <a href={`https://${gateway}/ipfs/${b.documentCid}`} target="_blank" rel="noreferrer">
                  Ver
                </a>
              ) : (
                <span className="mono">{b.documentCid.slice(0, 12)}…</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
