import { useState } from "react";
import { Alert, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { ZeroAddress } from "ethers";
import { describeError, short, type Connection } from "../chain";
import { displayName } from "../directory";
import type { Chain } from "../useChain";
import { useChainData } from "../useChainData";
import { Button, Card, colors, Row, styles } from "../ui";

interface MemberState {
  address: string;
  registered: boolean;
  eligible: boolean;
  weight: bigint;
  delegate: string;
  receivedWeight: bigint;
}

interface Candidate {
  member: MemberState;
  /** Why the contract would reject delegating to this member, or null. */
  reason: string | null;
}

interface DelegationState {
  me: MemberState;
  isSupplier: boolean;
  /** Members currently delegating to me. */
  delegators: MemberState[];
  candidates: Candidate[];
}

/** The `members` record of an address, current state. */
async function readMember(gov: Connection["gov"], address: string): Promise<MemberState> {
  const m = await gov.members(address);
  return {
    address,
    registered: m.registered,
    eligible: m.eligible,
    weight: m.weight,
    delegate: m.delegate,
    receivedWeight: m.receivedWeight,
  };
}

/** Delegation applies to issues created from now on, so everything is read at the current state. */
async function loadDelegation(connection: Connection): Promise<DelegationState> {
  const { gov, wallet, provider } = connection;
  const [me, isSupplier, count, block] = await Promise.all([
    readMember(gov, wallet.address),
    gov.isSupplier(wallet.address),
    gov.memberCount(),
    provider.getBlock("latest"),
  ]);
  const total: bigint = await gov.totalWeightAt(block!.timestamp);
  const addresses: string[] = await Promise.all(Array.from({ length: Number(count) }, (_, i) => gov.memberList(i)));
  const members = await Promise.all(addresses.map((a) => readMember(gov, a)));

  const delegators = members.filter((m) => m.delegate === wallet.address);
  const candidates = members
    .filter((m) => m.registered && m.address !== wallet.address)
    .map((d) => {
      // Same rule as delegateTo: own effective weight + received + mine ≤ 1/3 of the total.
      const controlled = (d.eligible ? d.weight : 0n) + d.receivedWeight + me.weight;
      const reason =
        d.delegate !== ZeroAddress
          ? "Ya delegó su voto: no puede recibir delegaciones."
          : controlled * 3n > total
            ? "Superaría el tope: nadie puede controlar más de un tercio del peso total."
            : null;
      return { member: d, reason };
    });
  return { me, isSupplier, delegators, candidates };
}

function blocker({ me, isSupplier }: DelegationState): string | null {
  if (isSupplier) return "Tu cuenta está registrada como proveedor.";
  if (!me.registered) return "Tu cuenta no está en el padrón.";
  if (!me.eligible) return "Tu cuenta está deshabilitada (moroso): no podés delegar.";
  return null;
}

export function DelegationScreen({ chain }: { chain: Chain }) {
  const { data: state, error: loadError, loading, refresh } = useChainData(chain, loadDelegation);
  const [step, setStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const chainId = chain.network.chainId;
  const name = (address: string) => displayName(chainId, address);

  async function send(action: () => Promise<{ hash: string; wait: () => Promise<unknown> }>, done: string) {
    const { gov } = chain.connection!;
    setSending(true);
    setError(null);
    try {
      setStep("Enviando transacción…");
      const tx = await action();
      setStep(`Enviada (${short(tx.hash)}). Esperando confirmación…`);
      await tx.wait();
      setStep(done);
      await refresh();
    } catch (err) {
      setStep(null);
      setError(describeError(err, gov.interface));
    } finally {
      setSending(false);
    }
  }

  function delegate(to: string) {
    Alert.alert(
      "Delegar voto",
      `Vas a delegar tu voto en ${name(to)}.\n\nVale para las cuestiones que se planteen a partir de ahora. En cada una podés votar vos directamente, y tu boleta reemplaza a la de tu delegado.`,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Delegar", onPress: () => send(() => chain.connection!.gov.delegateTo(to), "Delegación registrada.") },
      ],
    );
  }

  function revoke() {
    Alert.alert(
      "Revocar delegación",
      "Recuperás tu voto para las cuestiones que se planteen a partir de ahora. Las ya creadas no cambian.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Revocar",
          style: "destructive",
          onPress: () => send(() => chain.connection!.gov.revokeDelegation(), "Delegación revocada."),
        },
      ],
    );
  }

  const blocked = state ? blocker(state) : null;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
    >
      <Text style={styles.h1}>Delegación</Text>
      <Text style={styles.p}>
        Los cambios valen para las cuestiones que se planteen a partir de ahora: cada cuestión usa el padrón del momento
        en que se creó.
      </Text>
      {loadError && <Text style={styles.error}>{loadError}</Text>}
      {blocked && <Text style={styles.error}>{blocked}</Text>}
      {error && <Text style={styles.error}>{error}</Text>}
      {step && <Text style={styles.p}>{step}</Text>}

      {state && !blocked && (
        <>
          <Card title="Tu voto">
            {state.me.delegate !== ZeroAddress ? (
              <>
                <Row label="Delegado en" value={name(state.me.delegate)} />
                <Button title="Revocar delegación" kind="secondary" onPress={revoke} busy={sending} />
              </>
            ) : state.delegators.length > 0 ? (
              <>
                <Row label="Te delegaron" value={`${state.delegators.length} miembro(s)`} />
                <Row label="Peso recibido" value={String(state.me.receivedWeight)} />
                {state.delegators.map((d) => (
                  <Text key={d.address} style={styles.p}>
                    • {name(d.address)}
                  </Text>
                ))}
                <Text style={styles.p}>Mientras te deleguen el voto no podés delegar el tuyo.</Text>
              </>
            ) : (
              <Row label="Estado" value="Votás vos" />
            )}
          </Card>

          {state.me.delegate === ZeroAddress && state.delegators.length === 0 && (
            <Card title="Elegí un delegado">
              {state.candidates.map(({ member, reason }) => (
                <Pressable
                  key={member.address}
                  disabled={!!reason || sending}
                  onPress={() => delegate(member.address)}
                  style={({ pressed }) => [styles.option, (pressed || !!reason) && { opacity: reason ? 0.5 : 0.6 }]}
                >
                  <Text style={styles.issueTitle}>{name(member.address)}</Text>
                  <View style={styles.row}>
                    <Text style={styles.label}>{short(member.address)}</Text>
                    {member.receivedWeight > 0n && (
                      <Text style={styles.label}>Recibe {String(member.receivedWeight)}</Text>
                    )}
                  </View>
                  {reason && <Text style={styles.label}>{reason}</Text>}
                  {!reason && !member.eligible && (
                    <Text style={[styles.label, { color: colors.warn }]}>
                      Deshabilitado (moroso): mientras lo esté, tu voto delegado no cuenta.
                    </Text>
                  )}
                </Pressable>
              ))}
            </Card>
          )}
        </>
      )}
    </ScrollView>
  );
}
