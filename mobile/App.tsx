import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { NETWORKS, type NetworkId } from "./src/config";
import { loadKey, loadNetwork } from "./src/keyStore";
import { ImportKeyScreen } from "./src/screens/ImportKeyScreen";
import { MainScreen } from "./src/screens/MainScreen";
import { colors, styles } from "./src/ui";

/** Last network chosen on this device; the local chain the first time. */
async function storedNetwork(): Promise<NetworkId> {
  const id = await loadNetwork();
  return id && id in NETWORKS ? (id as NetworkId) : "local";
}

export default function App() {
  // undefined = still reading secure storage; null = no key imported yet.
  const [privateKey, setPrivateKey] = useState<string | null | undefined>(undefined);
  const [network, setNetwork] = useState<NetworkId>("local");

  useEffect(() => {
    Promise.all([loadKey(), storedNetwork()]).then(([key, id]) => {
      setNetwork(id);
      setPrivateKey(key);
    });
  }, []);

  // Re-read on every import: the network may have changed during the previous session.
  async function onImported(key: string) {
    setNetwork(await storedNetwork());
    setPrivateKey(key);
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.screen}>
        <StatusBar style="dark" />
        {privateKey === undefined ? (
          <View style={{ flex: 1, justifyContent: "center" }}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : privateKey === null ? (
          <ImportKeyScreen onImported={onImported} />
        ) : (
          <MainScreen privateKey={privateKey} initialNetwork={network} onLogout={() => setPrivateKey(null)} />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
