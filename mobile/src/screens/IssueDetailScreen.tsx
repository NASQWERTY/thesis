import { useCallback } from "react";
import { Linking, RefreshControl, ScrollView, Text, View } from "react-native";
import { formatEther } from "ethers";
import { short, type Connection } from "../chain";
import type { Deployment } from "../config";
import { useGateway } from "../ipfs";
import { Description, PhaseAndTopic } from "../issueViews";
import { formatTime, loadIssue, Phase, REJECT_ALL, remaining, Status, type BidInfo, type IssueInfo } from "../issues";
import type { Chain } from "../useChain";
import { useChainData } from "../useChainData";
import { BackLink, Button, Card, colors, Row, styles } from "../ui";

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
            <Row label="Propuesta por" value={issue.proposer === me ? "vos" : short(issue.proposer)} />
            <Row label="Fin de ofertas" value={formatTime(issue.biddingEnd)} />
            <Row label="Fin de votación" value={formatTime(issue.votingEnd)} />
          </Card>

          <Card title={`Ofertas (${issue.bids.length})`}>
            {issue.bids.length === 0 && (
              <Text style={styles.p}>
                {issue.phase === Phase.Bidding ? "Todavía no hay ofertas." : "No se presentaron ofertas."}
              </Text>
            )}
            {issue.bids.map((bid) => (
              <BidItem key={String(bid.id)} bid={bid} issue={issue} gateway={gateway} />
            ))}
          </Card>

          <Card title="Tu voto">
            <Ballot issue={issue} onVote={onVote} />
          </Card>
        </>
      )}
    </ScrollView>
  );
}

function BidItem({ bid, issue, gateway }: { bid: BidInfo; issue: IssueInfo; gateway: string | null }) {
  const awarded =
    (issue.status === Status.Awarded || issue.status === Status.Executed) && bid.id === issue.winningBidId;
  return (
    <View style={styles.bid}>
      <View style={styles.row}>
        <Text style={styles.issueTitle}>Oferta #{String(bid.id)}</Text>
        {awarded && <Text style={[styles.value, { color: colors.ok }]}>Adjudicada</Text>}
      </View>
      <Row label="Monto" value={`${formatEther(bid.amount)} ETH`} />
      <Row label="Proveedor" value={short(bid.supplier)} />
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
        <Text style={styles.p}>Tu orden de preferencia:</Text>
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
      return <Text style={styles.p}>No votaste en esta cuestión.</Text>;
  }
}
