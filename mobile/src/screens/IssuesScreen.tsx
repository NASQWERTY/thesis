import { Pressable, RefreshControl, ScrollView, Text } from "react-native";
import { formatEther } from "ethers";
import { notAvailable } from "../chain";
import { displayName } from "../directory";
import { useGateway } from "../ipfs";
import { Description, PhaseAndTopic } from "../issueViews";
import { loadIssues, remaining, type IssueInfo } from "../issues";
import type { Chain } from "../useChain";
import { useChainData } from "../useChainData";
import { Button, Card, colors, Row, styles } from "../ui";

export function IssuesScreen({
  chain,
  onCreate,
  onOpen,
}: {
  chain: Chain;
  onCreate: () => void;
  onOpen: (id: bigint) => void;
}) {
  const gateway = useGateway();
  const { data: issues, error, loading, refresh, now } = useChainData(chain, loadIssues);
  const me = chain.connection?.wallet.address;
  const chainId = chain.network.chainId;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
    >
      <Text style={styles.h1}>Cuestiones</Text>
      {!chain.deployment && <Text style={styles.error}>{notAvailable(chain.network)}</Text>}
      {chain.deployment && <Button title="Plantear cuestión" onPress={onCreate} />}
      {error && <Text style={styles.error}>{error}</Text>}
      {issues?.length === 0 && <Text style={styles.p}>Todavía no se planteó ninguna cuestión.</Text>}
      {issues?.map((issue) => (
        <Pressable key={String(issue.id)} onPress={() => onOpen(issue.id)}>
          {({ pressed }) => (
            <IssueItem chainId={chainId} issue={issue} gateway={gateway} now={now} me={me} pressed={pressed} />
          )}
        </Pressable>
      ))}
    </ScrollView>
  );
}

function IssueItem({
  chainId,
  issue,
  gateway,
  now,
  me,
  pressed,
}: {
  chainId: number;
  issue: IssueInfo;
  gateway: string | null;
  now: number;
  me: string | undefined;
  pressed: boolean;
}) {
  return (
    <Card title={`Cuestión #${issue.id}`} style={pressed ? { opacity: 0.7 } : undefined}>
      <PhaseAndTopic issue={issue} />
      <Description gateway={gateway} cid={issue.descriptionCid} preview />
      {issue.phaseEnd !== null && <Row label="Termina en" value={remaining(issue.phaseEnd - now)} />}
      <Row label="Techo" value={`${formatEther(issue.ceiling)} ETH`} />
      <Row label="Ofertas" value={String(issue.bids.length)} />
      <Row label="Propuesta por" value={issue.proposer === me ? "usted" : displayName(chainId, issue.proposer)} />
      {issue.voted && <Row label="Su boleta" value="Emitida" color={colors.ok} />}
    </Card>
  );
}
