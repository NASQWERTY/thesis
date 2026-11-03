import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useChain } from "../useChain";
import { colors, styles } from "../ui";
import { HomeScreen } from "./HomeScreen";
import { IssuesScreen } from "./IssuesScreen";

const TABS = [
  { id: "issues", label: "Cuestiones" },
  { id: "account", label: "Mi cuenta" },
] as const;

type TabId = (typeof TABS)[number]["id"];

/** Signed-in shell: bottom tabs over a shared chain connection. */
export function MainScreen({ privateKey, onLogout }: { privateKey: string; onLogout: () => void }) {
  const chain = useChain(privateKey);
  const [tab, setTab] = useState<TabId>("issues");

  return (
    <View style={styles.screen}>
      <View style={{ flex: 1 }}>
        {tab === "issues" && <IssuesScreen chain={chain} />}
        {tab === "account" && <HomeScreen chain={chain} onLogout={onLogout} />}
      </View>
      <View style={styles.tabBar}>
        {TABS.map((t) => (
          <Pressable key={t.id} onPress={() => setTab(t.id)} style={styles.tabItem}>
            <Text style={[styles.tabLabel, t.id === tab && { color: colors.primary }]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
