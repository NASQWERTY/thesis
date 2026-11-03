import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { encodeBytes32String, formatEther, parseEther } from "ethers";
import { connectionError, describeError, short } from "../chain";
import { uploadText } from "../ipfs";
import { capitalize, descriptionText, TOPICS } from "../issues";
import type { Chain } from "../useChain";
import { BackLink, Button, Card, colors, Row, styles } from "../ui";

const TITLE_MAX = 100;

interface Status {
  isSupplier: boolean;
  registered: boolean;
  eligible: boolean;
  activeIssue: bigint;
  available: bigint;
}

/** Why the member cannot raise an issue now, or null. The contract checks the same (HU-003). */
function blocker(s: Status): string | null {
  if (s.isSupplier) return "Tu cuenta está registrada como proveedor: no puede plantear cuestiones.";
  if (!s.registered) return "Tu cuenta no está en el padrón.";
  if (!s.eligible) return "Tu cuenta está deshabilitada (moroso): no podés plantear cuestiones.";
  if (s.activeIssue !== 0n) return `Ya tenés abierta la cuestión #${s.activeIssue}. Podés plantear otra cuando se cierre.`;
  if (s.available === 0n) return "La tesorería no tiene saldo libre.";
  return null;
}

function parseCeiling(text: string): bigint | null {
  try {
    const value = parseEther(text.trim().replace(",", "."));
    return value > 0n ? value : null;
  } catch {
    return null;
  }
}

export function CreateIssueScreen({ chain, onDone }: { chain: Chain; onDone: () => void }) {
  const { connection } = chain;
  const [status, setStatus] = useState<Status | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [ceilingText, setCeilingText] = useState("");
  const [topic, setTopic] = useState<string>(TOPICS[0]);
  const [step, setStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    if (!connection) return;
    const { gov, wallet } = connection;
    try {
      const [isSupplier, member, activeIssue, available] = await Promise.all([
        gov.isSupplier(wallet.address),
        gov.members(wallet.address),
        gov.activeIssueOf(wallet.address),
        gov.availableBalance(),
      ]);
      setStatus({ isSupplier, registered: member.registered, eligible: member.eligible, activeIssue, available });
      setLoadError(null);
    } catch {
      setLoadError(connectionError(chain.network));
    }
  }, [connection, chain.network]);

  useEffect(() => {
    load();
  }, [load]);

  const ceiling = parseCeiling(ceilingText);
  const blocked = status ? blocker(status) : null;

  function validate(): string | null {
    if (!title.trim()) return "Escribí un título.";
    if (!body.trim()) return "Escribí una descripción.";
    if (ceiling === null) return "Indicá el techo en ETH, p. ej. 0.5";
    if (status && ceiling > status.available) {
      return `El techo supera el saldo libre de la tesorería (${formatEther(status.available)} ETH).`;
    }
    return null;
  }

  function confirm() {
    const invalid = validate();
    setError(invalid);
    if (invalid) return;
    Alert.alert(
      "Plantear cuestión",
      `Se reservan ${formatEther(ceiling!)} ETH de la tesorería mientras la cuestión esté abierta.`,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Plantear", onPress: submit },
      ],
    );
  }

  async function submit() {
    if (!connection) return;
    setSending(true);
    setError(null);
    try {
      setStep("Subiendo la descripción a IPFS…");
      const cid = await uploadText("descripcion.txt", descriptionText(title, body));

      setStep("Enviando transacción…");
      const { gov } = connection;
      const tx = await gov.createIssue(cid, encodeBytes32String(topic), ceiling!);
      setStep(`Enviada (${short(tx.hash)}). Esperando confirmación…`);
      const receipt = await tx.wait();

      let issueId: bigint | undefined;
      for (const log of receipt.logs) {
        const parsed = gov.interface.parseLog(log);
        if (parsed?.name === "IssueCreated") issueId = parsed.args.issueId;
      }
      setStep(null);
      Alert.alert("Cuestión creada", `La cuestión #${issueId} quedó abierta a ofertas de los proveedores.`, [
        { text: "OK", onPress: onDone },
      ]);
    } catch (err) {
      setStep(null);
      // Upload errors are already in Spanish; transaction errors are decoded with the ABI.
      setError(err instanceof Error && !("code" in err) ? err.message : describeError(err, connection.gov.interface));
      load();
    } finally {
      setSending(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <BackLink onPress={onDone} />
      <Text style={styles.h1}>Plantear cuestión</Text>
      {loadError && <Text style={styles.error}>{loadError}</Text>}
      {blocked && <Text style={styles.error}>{blocked}</Text>}

      {status && !blocked && (
        <>
          <Card title="Qué se necesita">
            <TextInput
              style={styles.input}
              placeholder="Título (p. ej. Pintura del hall del edificio 1)"
              value={title}
              onChangeText={setTitle}
              maxLength={TITLE_MAX}
            />
            <TextInput
              style={[styles.input, { minHeight: 120, textAlignVertical: "top" }]}
              placeholder="Descripción: qué hay que hacer, dónde, plazos, condiciones…"
              value={body}
              onChangeText={setBody}
              multiline
            />
          </Card>

          <Card title="Rubro">
            <View style={styles.chips}>
              {TOPICS.map((t) => (
                <Pressable key={t} onPress={() => setTopic(t)} style={[styles.chip, t === topic && styles.chipActive]}>
                  <Text style={{ color: t === topic ? "#fff" : colors.text, fontWeight: "600" }}>{capitalize(t)}</Text>
                </Pressable>
              ))}
            </View>
          </Card>

          <Card title="Techo presupuestario">
            <TextInput
              style={styles.input}
              placeholder="Monto máximo en ETH"
              value={ceilingText}
              onChangeText={setCeilingText}
              keyboardType="decimal-pad"
            />
            <Row label="Saldo libre de la tesorería" value={`${formatEther(status.available)} ETH`} />
            <Text style={styles.p}>
              El techo se reserva de la tesorería al plantear la cuestión. Los proveedores no pueden ofertar por encima.
            </Text>
          </Card>

          {error && <Text style={styles.error}>{error}</Text>}
          {step && <Text style={styles.p}>{step}</Text>}
          <Button title="Plantear cuestión" onPress={confirm} busy={sending} />
        </>
      )}
    </ScrollView>
  );
}
