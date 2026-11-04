import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { formatEther } from "ethers";
import { notAvailable, type Connection } from "../chain";
import { COMMUNITY_NAME, type Deployment } from "../config";
import { displayName } from "../directory";
import { useGateway } from "../ipfs";
import { IssueTitle, PhasePill } from "../issueViews";
import { loadIssues, Phase, remaining, Status, type IssueInfo } from "../issues";
import type { Chain } from "../useChain";
import { useChainData } from "../useChainData";
import { Button, colors, styles } from "../ui";

interface ListData {
  issues: IssueInfo[];
  registered: boolean;
  eligible: boolean;
  /** Treasury minus the funds reserved by open issues. */
  free: bigint;
}

async function loadList(connection: Connection, deployment: Deployment): Promise<ListData> {
  const { gov, provider, wallet } = connection;
  const [issues, member, treasury, reserved] = await Promise.all([
    loadIssues(connection, deployment),
    gov.members(wallet.address),
    provider.getBalance(deployment.address),
    gov.reservedBalance(),
  ]);
  return { issues, registered: member.registered, eligible: member.eligible, free: treasury - reserved };
}

function memberStatus(data: ListData | null): string | null {
  if (!data) return null;
  if (!data.registered) return "no registrado en el padrón";
  return data.eligible ? "miembro habilitado" : "miembro no habilitado";
}

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
  const { data, error, loading, refresh, now } = useChainData(chain, loadList);
  const me = chain.connection?.wallet.address;
  const chainId = chain.network.chainId;
  const issues = data?.issues;
  const subtitle = [me && displayName(chainId, me), memberStatus(data)].filter(Boolean).join(" · ");

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{COMMUNITY_NAME}</Text>
        {subtitle !== "" && <Text style={styles.headerSubtitle}>{subtitle}</Text>}
      </View>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[styles.content, { gap: 10 }]}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
      >
        <View style={[styles.row, { alignItems: "baseline" }]}>
          <Text style={styles.h1}>Cuestiones</Text>
          {data && <Text style={styles.small}>Saldo libre {formatEther(data.free)} ETH</Text>}
        </View>
        {!chain.deployment && <Text style={styles.error}>{notAvailable(chain.network)}</Text>}
        {error && <Text style={styles.error}>{error}</Text>}
        {issues?.length === 0 && <Text style={styles.p}>Todavía no se planteó ninguna cuestión.</Text>}
        {issues?.map((issue) => (
          <Pressable key={String(issue.id)} onPress={() => onOpen(issue.id)}>
            {({ pressed }) => <IssueItem issue={issue} gateway={gateway} now={now} pressed={pressed} />}
          </Pressable>
        ))}
        {chain.deployment && <Button title="+ Plantear una cuestión" onPress={onCreate} />}
      </ScrollView>
    </View>
  );
}

/** Bottom-left line of an item: what happens next, or how the issue ended. */
function statusLine(issue: IssueInfo, now: number): string {
  switch (issue.phase) {
    case Phase.Bidding:
      return `Ofertas hasta dentro de ${remaining(issue.phaseEnd! - now)}`;
    case Phase.Voting:
      return `Cierra en ${remaining(issue.phaseEnd! - now)}`;
    case Phase.VotingEnded:
      return "Cualquier miembro puede cerrarla";
    default:
      if (issue.status === Status.Awarded) return "Pago pendiente";
      if (issue.status === Status.Executed) return "Pago ejecutado";
      return "Reserva liberada";
  }
}

function IssueItem({
  issue,
  gateway,
  now,
  pressed,
}: {
  issue: IssueInfo;
  gateway: string | null;
  now: number;
  pressed: boolean;
}) {
  const bids = issue.bids.length;
  return (
    <View style={[styles.listItem, pressed && { opacity: 0.7 }]}>
      <View style={[styles.row, { alignItems: "center" }]}>
        <IssueTitle gateway={gateway} issue={issue} />
        <Text style={styles.small}>#{String(issue.id)}</Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <PhasePill issue={issue} />
        {issue.voted && <Text style={[styles.small, { color: colors.ok, fontWeight: "700" }]}>✓ Votó</Text>}
      </View>
      <Text style={[styles.value, { textAlign: "left" }]}>Techo {formatEther(issue.ceiling)} ETH</Text>
      <View style={styles.row}>
        <Text style={styles.small}>{statusLine(issue, now)}</Text>
        <Text style={styles.small}>{bids === 1 ? "1 oferta" : `${bids} ofertas`}</Text>
      </View>
    </View>
  );
}
