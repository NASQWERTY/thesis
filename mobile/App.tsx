import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { loadKey } from "./src/keyStore";
import { HomeScreen } from "./src/screens/HomeScreen";
import { ImportKeyScreen } from "./src/screens/ImportKeyScreen";
import { colors, styles } from "./src/ui";

export default function App() {
  // undefined = still reading secure storage; null = no key imported yet.
  const [privateKey, setPrivateKey] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    loadKey().then(setPrivateKey);
  }, []);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.screen}>
        <StatusBar style="dark" />
        {privateKey === undefined ? (
          <View style={{ flex: 1, justifyContent: "center" }}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : privateKey === null ? (
          <ImportKeyScreen onImported={setPrivateKey} />
        ) : (
          <HomeScreen privateKey={privateKey} onLogout={() => setPrivateKey(null)} />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
