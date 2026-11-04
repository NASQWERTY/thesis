import { useCallback, useState } from "react";
import { Alert, Linking, Pressable, ScrollView, Text, View } from "react-native";
import { formatEther, ZeroAddress } from "ethers";
import { describeError, short, type Connection } from "../chain";
import { displayName } from "../directory";
import type { Deployment } from "../config";
import { useGateway } from "../ipfs";
import { loadIssue, Phase, REJECT_ALL, remaining, type BidInfo, type IssueInfo } from "../issues";
import type { Chain } from "../useChain";
import { useChainData } from "../useChainData";
import { BackLink, Button, Card, colors, styles } from "../ui";

interface VoteContext {
  issue: IssueInfo;
  /** The voter's weight at the issue's snapshot: 0 = cannot vote it. */
  weight: bigint;
  /** The voter's delegate at the snapshot (ZeroAddress if none). */
  delegate: string;
  /** Members with weight at the snapshot who had delegated to the voter then. */
  delegators: number;
}

/** Everything is read at the snapshot: that is how the close resolves delegations (spec §5). */
async function loadVoteContext(connection: Connection, deployment: Deployment, id: bigint): Promise<VoteContext> {
  const { gov, wallet } = connection;
  const issue = await loadIssue(connection, deployment, id);
  const s = issue.snapshot;
  const [weight, delegate, count] = await Promise.all([
    gov.weightAt(wallet.address, s),
    gov.delegateAt(wallet.address, s),
    gov.memberCount(),
  ]);
  const members: string[] = await Promise.all(Array.from({ length: Number(count) }, (_, i) => gov.memberList(i)));
  const delegatedToMe = await Promise.all(
    members.map(async (m) => (await gov.delegateAt(m, s)) === wallet.address && (await gov.weightAt(m, s)) > 0n),
  );
  return { issue, weight, delegate, delegators: delegatedToMe.filter(Boolean).length };
}

function blocker({ issue, weight }: VoteContext): string | null {
  if (issue.voted) return "Ya votó en esta cuestión.";
  if (issue.phase !== Phase.Voting) return "La cuestión no está en período de votación.";
  if (weight === 0n) return "Su cuenta no estaba habilitada cuando se creó la cuestión: no puede votarla.";
  return null;
}

function optionLabel(id: bigint, bids: BidInfo[]): string {
  if (id === REJECT_ALL) return "Rechazar todas";
  const bid = bids.find((b) => b.id === id)!;
  return `Oferta #${id} · ${formatEther(bid.amount)} ETH`;
}

export function CastBallotScreen({ chain, issueId, onDone }: { chain: Chain; issueId: bigint; onDone: () => void }) {
  const gateway = useGateway();
  const load = useCallback(
    (connection: Connection, deployment: Deployment) => loadVoteContext(connection, deployment, issueId),
    [issueId],
  );
  const { data: ctx, error: loadError, now } = useChainData(chain, load);
  const chainId = chain.network.chainId;
  // Options in the order the member taps them, most preferred first.
  const [picked, setPicked] = useState<bigint[]>([]);
  const [step, setStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  if (!ctx) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <BackLink onPress={onDone} />
        <Text style={styles.p}>{loadError ?? "Cargando…"}</Text>
      </ScrollView>
    );
  }

  const { issue } = ctx;
  const options = [...issue.bids.map((b) => b.id), REJECT_ALL];
  const left = options.filter((id) => !picked.includes(id));
  // The last option left needs no tap: its place is already decided.
  const ranking = left.length === 1 ? [...picked, left[0]] : picked;
  const complete = ranking.length === options.length;
  const blocked = blocker(ctx);

  function toggle(id: bigint) {
    setError(null);
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  }

  function confirm() {
    Alert.alert(
      "Confirmar voto",
      `${ranking.map((id, i) => `${i + 1}. ${optionLabel(id, issue.bids)}`).join("\n")}\n\nLa boleta no se puede cambiar después.`,
      [
        { text: "Revisar", style: "cancel" },
        { text: "Votar", onPress: submit },
      ],
    );
  }

  async function submit() {
    const { gov } = chain.connection!;
    setSending(true);
    setError(null);
    try {
      setStep("Enviando transacción…");
      const tx = await gov.castBallot(issueId, ranking);
      setStep(`Enviada (${short(tx.hash)}). Esperando confirmación…`);
      await tx.wait();
      setStep(null);
      Alert.alert("Voto registrado", `Su boleta en la cuestión #${issueId} quedó registrada.`, [
        { text: "OK", onPress: onDone },
      ]);
    } catch (err) {
      setStep(null);
      setError(describeError(err, gov.interface));
    } finally {
      setSending(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <BackLink onPress={onDone} />
      <Text style={styles.h1}>Votar cuestión #{String(issueId)}</Text>
      {loadError && <Text style={styles.error}>{loadError}</Text>}
      {blocked ? (
        <Text style={styles.error}>{blocked}</Text>
      ) : (
        <>
          {issue.phaseEnd !== null && (
            <Text style={styles.p}>La votación cierra en {remaining(issue.phaseEnd - now)}.</Text>
          )}
          {ctx.delegate !== ZeroAddress && (
            <Text style={[styles.p, { color: colors.warn }]}>
              Cuando se creó esta cuestión, su voto estaba delegado en {displayName(chainId, ctx.delegate)}. Si
              vota, su boleta reemplaza a la de su delegado en esta cuestión.
            </Text>
          )}
          {ctx.delegators > 0 && (
            <Text style={styles.p}>
              {ctx.delegators === 1 ? "Un miembro le delegó" : `${ctx.delegators} miembros le delegaron`} su voto: su
              boleta también suma ese peso, salvo el de quien vote directamente.
            </Text>
          )}

          <Card title="Su orden de preferencia">
            {ranking.length === 0 ? (
              <Text style={styles.p}>Toque las opciones de abajo, empezando por la que prefiere.</Text>
            ) : (
              ranking.map((id, i) => {
                const auto = !picked.includes(id);
                return (
                  <View key={String(id)} style={styles.rankItem}>
                    <Text style={styles.rankNumber}>{i + 1}</Text>
                    <Text style={[styles.value, { flex: 1, textAlign: "left" }]}>{optionLabel(id, issue.bids)}</Text>
                    {auto ? (
                      <Text style={styles.label}>última</Text>
                    ) : (
                      <Pressable
                        onPress={() => toggle(id)}
                        hitSlop={8}
                        style={({ pressed }) => [styles.removeButton, pressed && { opacity: 0.6 }]}
                      >
                        <Text style={styles.removeButtonText}>✕ Quitar</Text>
                      </Pressable>
                    )}
                  </View>
                );
              })
            )}
            {picked.length > 0 && <Button title="Empezar de nuevo" kind="secondary" onPress={() => setPicked([])} />}
          </Card>

          {!complete && (
            <Card title={ranking.length === 0 ? "Opciones" : "Elija la siguiente"}>
              {left.map((id) => (
                <Option
                  key={String(id)}
                  chainId={chainId}
                  id={id}
                  bids={issue.bids}
                  gateway={gateway}
                  onPress={() => toggle(id)}
                />
              ))}
            </Card>
          )}

          {error && <Text style={styles.error}>{error}</Text>}
          {step && <Text style={styles.p}>{step}</Text>}
          <Button title="Votar" onPress={confirm} busy={sending} disabled={!complete} />
        </>
      )}
    </ScrollView>
  );
}

function Option({
  chainId,
  id,
  bids,
  gateway,
  onPress,
}: {
  chainId: number;
  id: bigint;
  bids: BidInfo[];
  gateway: string | null;
  onPress: () => void;
}) {
  const bid = bids.find((b) => b.id === id);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.option, pressed && { opacity: 0.6 }]}>
      <Text style={styles.issueTitle}>{optionLabel(id, bids)}</Text>
      {bid ? (
        <View style={styles.row}>
          <Text style={styles.label}>{displayName(chainId, bid.supplier)}</Text>
          {gateway && (
            <Text
              style={{ color: colors.primary, fontWeight: "600" }}
              onPress={() => Linking.openURL(`https://${gateway}/ipfs/${bid.documentCid}`)}
            >
              Ver propuesta
            </Text>
          )}
        </View>
      ) : (
        <Text style={styles.label}>Ninguna oferta me conforma.</Text>
      )}
    </Pressable>
  );
}
