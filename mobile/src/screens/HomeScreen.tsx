import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import { formatEther, parseEther, ZeroAddress } from "ethers";
import { NETWORKS, type NetworkId } from "../config";
import { deployments } from "../generated/deployments";
import { clearKey } from "../keyStore";
import { connect, describeError, short } from "../chain";
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
}

export function HomeScreen({ privateKey, onLogout }: { privateKey: string; onLogout: () => void }) {
  const [networkId, setNetworkId] = useState<NetworkId>("local");
  const network = NETWORKS[networkId];
  const [rpcUrl, setRpcUrl] = useState(network.defaultRpcUrl());
  const [rpcDraft, setRpcDraft] = useState(rpcUrl);
  const deployment = deployments[network.chainId];

  const [data, setData] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [txStatus, setTxStatus] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const connection = useMemo(
    () => (deployment ? connect(network, rpcUrl, deployment, privateKey) : null),
    [network, rpcUrl, deployment, privateKey],
  );
  useEffect(() => () => connection?.provider.destroy(), [connection]);

  const refresh = useCallback(async () => {
    if (!connection) return;
    setLoading(true);
    setError(null);
    try {
      const { provider, wallet, gov } = connection;
      const [blockNumber, isSupplier, member, balance, treasury] = await Promise.all([
        provider.getBlockNumber(),
        gov.isSupplier(wallet.address),
        gov.members(wallet.address),
        provider.getBalance(wallet.address),
        provider.getBalance(deployment!.address),
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

  function selectNetwork(id: NetworkId) {
    const url = NETWORKS[id].defaultRpcUrl();
    setNetworkId(id);
    setRpcUrl(url);
    setRpcDraft(url);
  }

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
              onPress={() => selectNetwork(n.id)}
              style={[styles.segmentItem, n.id === networkId && styles.segmentItemActive]}
            >
              <Text style={{ color: n.id === networkId ? "#fff" : colors.text, fontWeight: "600" }}>{n.label}</Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          style={styles.input}
          value={rpcDraft}
          onChangeText={setRpcDraft}
          onSubmitEditing={() => setRpcUrl(rpcDraft.trim())}
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
