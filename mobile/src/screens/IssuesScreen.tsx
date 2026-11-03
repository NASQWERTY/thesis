import { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { formatEther } from "ethers";
import { short } from "../chain";
import { useGateway, useIpfsText } from "../ipfs";
import { loadIssues, phaseLabel, remaining, type IssueSummary } from "../issues";
import type { Chain } from "../useChain";
import { Card, colors, Row, styles } from "../ui";

export function IssuesScreen({ chain }: { chain: Chain }) {
  const { connection, deployment, rpcUrl } = chain;
  const gateway = useGateway();
  const [issues, setIssues] = useState<IssueSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Chain time can differ from the phone's (the local chain can be moved forward), so the
  // countdowns run on chain time: offset measured at each refresh.
  const [clockOffset, setClockOffset] = useState(0);
  const [now, setNow] = useState(Date.now() / 1000);

  const refresh = useCallback(async () => {
    if (!connection || !deployment) return;
    setLoading(true);
    try {
      const [list, block] = await Promise.all([loadIssues(connection, deployment), connection.provider.getBlock("latest")]);
      setIssues(list);
      setClockOffset(block!.timestamp - Date.now() / 1000);
      setError(null);
    } catch {
      setError(`No se pudo leer el contrato en ${rpcUrl}. ¿Está corriendo el nodo?`);
    } finally {
      setLoading(false);
    }
  }, [connection, deployment, rpcUrl]);

  useEffect(() => {
    setIssues(null);
    refresh();
    const timer = setInterval(refresh, 15000);
    return () => clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now() / 1000), 1000);
    return () => clearInterval(timer);
  }, []);

  const me = connection?.wallet.address;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
    >
      <Text style={styles.h1}>Cuestiones</Text>
      {!deployment && <Text style={styles.error}>No hay un contrato desplegado para esta red.</Text>}
      {error && <Text style={styles.error}>{error}</Text>}
      {issues?.length === 0 && <Text style={styles.p}>Todavía no se planteó ninguna cuestión.</Text>}
      {issues?.map((issue) => (
        <IssueItem key={String(issue.id)}issue={issue} gateway={gateway} now={now + clockOffset} me={me} />
      ))}
    </ScrollView>
  );
}

function IssueItem({
  issue,
  gateway,
  now,
  me,
}: {
  issue: IssueSummary;
  gateway: string | null;
  now: number;
  me: string | undefined;
}) {
  const description = useIpfsText(gateway, issue.descriptionCid);
  const phase = phaseLabel(issue.phase, issue.status);

  return (
    <Card title={`Cuestión #${issue.id}`}>
      <View style={styles.row}>
        <Text style={[styles.value, { color: phase.color, textAlign: "left" }]}>{phase.text}</Text>
        <Text style={styles.tag}>{issue.topic}</Text>
      </View>
      <Text style={styles.p} numberOfLines={3}>
        {description === undefined ? "Cargando descripción…" : description ?? "Descripción no disponible."}
      </Text>
      {issue.phaseEnd !== null && <Row label="Termina en" value={remaining(issue.phaseEnd - now)} />}
      <Row label="Techo" value={`${formatEther(issue.ceiling)} ETH`} />
      <Row label="Ofertas" value={String(issue.bidCount)} />
      <Row label="Propuesta por" value={issue.proposer === me ? "vos" : short(issue.proposer)} />
      {issue.voted && <Row label="Tu boleta" value="Emitida" color={colors.ok} />}
    </Card>
  );
}
