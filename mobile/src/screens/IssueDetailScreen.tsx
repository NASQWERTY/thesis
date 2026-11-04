import { useCallback, useState } from "react";
import { Alert, Linking, RefreshControl, ScrollView, Text, View } from "react-native";
import { formatEther } from "ethers";
import { describeError, short, type Connection } from "../chain";
import { displayName } from "../directory";
import type { Deployment } from "../config";
import { useGateway } from "../ipfs";
import { Description, PhaseAndTopic } from "../issueViews";
import {
  CLOSE_REASON_TEXT,
  formatTime,
  loadIssue,
  Phase,
  REJECT_ALL,
  remaining,
  Status,
  type BidInfo,
  type IssueInfo,
} from "../issues";
import type { Chain } from "../useChain";
import { useChainData } from "../useChainData";
import { BackLink, Button, Card, colors, Row, styles } from "../ui";

type SendTx = () => Promise<{ hash: string; wait: () => Promise<unknown> }>;

export function IssueDetailScreen({
  chain,
  issueId,
  onBack,
  onVote,
}: {
  chain: Chain;
  issueId: bigint;
  onBack: () => void;
  onVote: () => void;
}) {
  const gateway = useGateway();
  const load = useCallback(
    (connection: Connection, deployment: Deployment) => loadIssue(connection, deployment, issueId),
    [issueId],
  );
  const { data: issue, error, loading, refresh, now } = useChainData(chain, load);
  const me = chain.connection?.wallet.address;
  const chainId = chain.network.chainId;
  // Closing and paying: permissionless transactions any member can send from this screen.
  const [step, setStep] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  function confirm(title: string, message: string, action: string, send: SendTx) {
    Alert.alert(title, message, [
      { text: "Cancelar", style: "cancel" },
      { text: action, onPress: () => run(send) },
    ]);
  }

  async function run(send: SendTx) {
    const { gov } = chain.connection!;
    setSending(true);
    setTxError(null);
    try {
      setStep("Enviando transacción…");
      const tx = await send();
      setStep(`Enviada (${short(tx.hash)}). Esperando confirmación…`);
      await tx.wait();
      setStep(null);
      await refresh();
    } catch (err) {
      setStep(null);
      setTxError(describeError(err, gov.interface));
    } finally {
      setSending(false);
    }
  }

  const closeIssue = () =>
    confirm(
      "Cerrar cuestión",
      "Se cuentan los votos y se decide la cuestión: se adjudica la oferta ganadora o, si no hay adjudicación, se libera la reserva. Cualquier miembro puede cerrarla.",
      "Cerrar",
      () => chain.connection!.gov.closeIssue(issueId),
    );

  const executeTransfer = () =>
    confirm(
      "Ejecutar pago",
      "Se transfiere al proveedor el monto de la oferta adjudicada y vuelve a la tesorería lo que sobra del techo. Cualquier miembro puede ejecutarlo.",
      "Pagar",
      () => chain.connection!.gov.executeTransfer(issueId),
    );

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
    >
      <BackLink onPress={onBack} />
      <Text style={styles.h1}>Cuestión #{String(issueId)}</Text>
      {error && <Text style={styles.error}>{error}</Text>}

      {issue && (
        <>
          <Card title="Descripción">
            <PhaseAndTopic issue={issue} />
            <Description gateway={gateway} cid={issue.descriptionCid} />
          </Card>

          <Card title="Datos">
            {issue.phaseEnd !== null && (
              <Row
                label={issue.phase === Phase.Bidding ? "Ofertas cierran en" : "Votación cierra en"}
                value={remaining(issue.phaseEnd - now)}
              />
            )}
            <Row label="Techo" value={`${formatEther(issue.ceiling)} ETH`} />
            <Row label="Propuesta por" value={issue.proposer === me ? "usted" : displayName(chainId, issue.proposer)} />
            <Row label="Fin de ofertas" value={formatTime(issue.biddingEnd)} />
            <Row label="Fin de votación" value={formatTime(issue.votingEnd)} />
          </Card>

          {issue.phase === Phase.VotingEnded && (
            <Card title="Resultado">
              <Text style={styles.p}>
                La votación terminó. Al cerrar la cuestión se cuentan los votos y se conoce el resultado.
              </Text>
              {txError && <Text style={styles.error}>{txError}</Text>}
              {step && <Text style={styles.p}>{step}</Text>}
              <Button title="Cerrar cuestión" onPress={closeIssue} busy={sending} />
            </Card>
          )}
          {issue.phase === Phase.Closed && (
            <Card title="Resultado">
              <Outcome issue={issue} chainId={chainId} />
              {issue.status === Status.Awarded && (
                <>
                  {txError && <Text style={styles.error}>{txError}</Text>}
                  {step && <Text style={styles.p}>{step}</Text>}
                  <Button title="Ejecutar pago" onPress={executeTransfer} busy={sending} />
                </>
              )}
            </Card>
          )}

          <Card title={`Ofertas (${issue.bids.length})`}>
            {issue.bids.length === 0 && (
              <Text style={styles.p}>
                {issue.phase === Phase.Bidding ? "Todavía no hay ofertas." : "No se presentaron ofertas."}
              </Text>
            )}
            {issue.bids.map((bid) => (
              <BidItem key={String(bid.id)} chainId={chainId} bid={bid} issue={issue} gateway={gateway} />
            ))}
          </Card>

          <Card title="Su voto">
            <Ballot issue={issue} onVote={onVote} />
          </Card>
        </>
      )}
    </ScrollView>
  );
}

function Outcome({ issue, chainId }: { issue: IssueInfo; chainId: number }) {
  const winner = issue.bids.find((b) => b.id === issue.winningBidId);
  if (issue.status === Status.ClosedWithoutAward) {
    return (
      <>
        <Text style={[styles.issueTitle, { color: colors.muted }]}>Cerrada sin adjudicar</Text>
        <Text style={styles.p}>
          Motivo: {CLOSE_REASON_TEXT[issue.closeReason]}. Se liberaron {formatEther(issue.ceiling)} ETH de la
          tesorería.
        </Text>
      </>
    );
  }
  return (
    <>
      <Text style={[styles.issueTitle, { color: colors.ok }]}>
        {issue.status === Status.Executed ? "Adjudicada y pagada" : "Adjudicada"}
      </Text>
      {winner && (
        <>
          <Row label="Oferta" value={`#${winner.id}`} />
          <Row label="Proveedor" value={displayName(chainId, winner.supplier)} />
          <Row label="Monto" value={`${formatEther(winner.amount)} ETH`} />
        </>
      )}
      {winner && issue.status === Status.Awarded && (
        <Text style={styles.p}>
          El pago al proveedor está pendiente. Al ejecutarlo vuelven a la tesorería{" "}
          {formatEther(issue.ceiling - winner.amount)} ETH del techo.
        </Text>
      )}
      {winner && issue.status === Status.Executed && (
        <Text style={styles.p}>
          Se pagaron {formatEther(winner.amount)} ETH al proveedor y volvieron a la tesorería{" "}
          {formatEther(issue.ceiling - winner.amount)} ETH del techo.
        </Text>
      )}
    </>
  );
}

function BidItem({
  chainId,
  bid,
  issue,
  gateway,
}: {
  chainId: number;
  bid: BidInfo;
  issue: IssueInfo;
  gateway: string | null;
}) {
  const awarded =
    (issue.status === Status.Awarded || issue.status === Status.Executed) && bid.id === issue.winningBidId;
  return (
    <View style={styles.bid}>
      <View style={styles.row}>
        <Text style={styles.issueTitle}>Oferta #{String(bid.id)}</Text>
        {awarded && <Text style={[styles.value, { color: colors.ok }]}>Adjudicada</Text>}
      </View>
      <Row label="Monto" value={`${formatEther(bid.amount)} ETH`} />
      <Row label="Proveedor" value={displayName(chainId, bid.supplier)} />
      {gateway ? (
        <Button
          title="Ver propuesta"
          kind="secondary"
          onPress={() => Linking.openURL(`https://${gateway}/ipfs/${bid.documentCid}`)}
        />
      ) : (
        <Text style={styles.p} selectable>
          Documento en IPFS: {bid.documentCid}
        </Text>
      )}
    </View>
  );
}

function Ballot({ issue, onVote }: { issue: IssueInfo; onVote: () => void }) {
  if (issue.voted) {
    return (
      <>
        <Text style={styles.p}>Su orden de preferencia:</Text>
        {issue.ranking.map((id, i) => (
          <Text key={String(id)} style={[styles.value, { textAlign: "left" }]}>
            {i + 1}. {id === REJECT_ALL ? "Rechazar todas" : `Oferta #${id}`}
          </Text>
        ))}
      </>
    );
  }
  switch (issue.phase) {
    case Phase.Bidding:
      return <Text style={styles.p}>La votación empieza cuando cierren las ofertas.</Text>;
    case Phase.Voting:
      return <Button title="Votar" onPress={onVote} />;
    default:
      return <Text style={styles.p}>No votó en esta cuestión.</Text>;
  }
}
