import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import { formatEther, parseEther, ZeroAddress } from "ethers";
import { NETWORKS } from "../config";
import { clearKey } from "../keyStore";
import { describeError, short } from "../chain";
import type { Chain } from "../useChain";
import { Button, Card, colors, Row, styles } from "../ui";

const CONTRIBUTION = "0.001";

interface Snapshot {
  blockNumber: number;
  isSupplier: boolean;
  registered: boolean;
  eligible: boolean;
  weight: bigint;
  delegate: string;
  receivedWeight: bigint;
  balance: bigint;
  treasury: bigint;
  reserved: bigint;
}

export function HomeScreen({ chain, onLogout }: { chain: Chain; onLogout: () => void }) {
  const { network, rpcUrl, deployment, connection } = chain;
  const [rpcDraft, setRpcDraft] = useState(rpcUrl);
  useEffect(() => setRpcDraft(rpcUrl), [rpcUrl]);

  const [data, setData] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [txStatus, setTxStatus] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const refresh = useCallback(async () => {
    if (!connection) return;
    setLoading(true);
    setError(null);
    try {
      const { provider, wallet, gov } = connection;
      const [blockNumber, isSupplier, member, balance, treasury, reserved] = await Promise.all([
        provider.getBlockNumber(),
        gov.isSupplier(wallet.address),
        gov.members(wallet.address),
        provider.getBalance(wallet.address),
        provider.getBalance(deployment!.address),
        gov.reservedBalance(),
      ]);
      setData({
        blockNumber,
        isSupplier,
        registered: member.registered,
        eligible: member.eligible,
        weight: member.weight,
        delegate: member.delegate,
        receivedWeight: member.receivedWeight,
        balance,
        treasury,
        reserved,
      });
    } catch {
      setData(null);
      setError(`No se pudo conectar a ${rpcUrl}. ¿Está corriendo el nodo y el celular está en la misma WiFi que la PC?`);
    } finally {
      setLoading(false);
    }
  }, [connection, deployment, rpcUrl]);

  useEffect(() => {
    setData(null);
    setTxStatus(null);
    refresh();
  }, [refresh]);

  async function contribute() {
    if (!connection) return;
    setSending(true);
    setTxStatus("Enviando transacción…");
    try {
      const tx = await connection.wallet.sendTransaction({ to: deployment!.address, value: parseEther(CONTRIBUTION) });
      setTxStatus(`Enviada (${short(tx.hash)}). Esperando confirmación…`);
      const receipt = await tx.wait();
      setTxStatus(`Confirmada en el bloque ${receipt!.blockNumber}.`);
      await refresh();
    } catch (err) {
      setTxStatus(`Error: ${describeError(err, connection.gov.interface)}`);
    } finally {
      setSending(false);
    }
  }

  function logout() {
    Alert.alert("Cerrar sesión", "Se borra la clave de este dispositivo. Vas a tener que importarla de nuevo.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Borrar clave",
        style: "destructive",
        onPress: async () => {
          await clearKey();
          onLogout();
        },
      },
    ]);
  }

  const address = connection?.wallet.address;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
    >
      <Text style={styles.h1}>Mi cuenta</Text>

      <Card title="Red">
        <View style={styles.segment}>
          {Object.values(NETWORKS).map((n) => (
            <Pressable
              key={n.id}
              onPress={() => chain.selectNetwork(n.id)}
              style={[styles.segmentItem, n.id === network.id && styles.segmentItemActive]}
            >
              <Text style={{ color: n.id === network.id ? "#fff" : colors.text, fontWeight: "600" }}>{n.label}</Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          style={styles.input}
          value={rpcDraft}
          onChangeText={setRpcDraft}
          onSubmitEditing={() => chain.setRpcUrl(rpcDraft.trim())}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          returnKeyType="done"
        />
        {deployment ? (
          <Row label="Contrato" value={short(deployment.address)} />
        ) : (
          <Text style={styles.error}>
            No hay un contrato desplegado para esta red. Corré el deploy en contracts/ y reiniciá la app con «npm start».
          </Text>
        )}
        {data && <Row label="Último bloque" value={String(data.blockNumber)} />}
      </Card>

      {error && <Text style={styles.error}>{error}</Text>}

      {address && (
        <Card title="Cuenta">
          <Text style={[styles.value, { textAlign: "left" }]} selectable>
            {address}
          </Text>
          {data && <Row label="Saldo" value={`${formatEther(data.balance)} ETH`} />}
        </Card>
      )}

      {data && (
        <Card title="Padrón">
          <MemberStatus data={data} />
        </Card>
      )}

      {data && (
        <Card title="Tesorería">
          <Row label="Saldo" value={`${formatEther(data.treasury)} ETH`} />
          <Row label="Reservado en cuestiones" value={`${formatEther(data.reserved)} ETH`} />
          <Row label="Libre" value={`${formatEther(data.treasury - data.reserved)} ETH`} />
          <Button title={`Aportar ${CONTRIBUTION} ETH`} onPress={contribute} busy={sending} />
          {txStatus && <Text style={txStatus.startsWith("Error") ? styles.error : styles.p}>{txStatus}</Text>}
        </Card>
      )}

      <Button title="Cerrar sesión" kind="secondary" onPress={logout} />
    </ScrollView>
  );
}

function MemberStatus({ data }: { data: Snapshot }) {
  if (data.isSupplier) return <Row label="Rol" value="Proveedor" />;
  if (!data.registered) return <Row label="Estado" value="No estás en el padrón" color={colors.warn} />;
  return (
    <>
      <Row
        label="Estado"
        value={data.eligible ? "Habilitado" : "Deshabilitado (moroso)"}
        color={data.eligible ? colors.ok : colors.error}
      />
      <Row label="Peso de voto" value={String(data.weight)} />
      <Row label="Delegaste en" value={data.delegate === ZeroAddress ? "—" : short(data.delegate)} />
      <Row label="Peso recibido" value={String(data.receivedWeight)} />
    </>
  );
}
