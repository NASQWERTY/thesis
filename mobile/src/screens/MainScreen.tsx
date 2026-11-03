import { useEffect, useState } from "react";
import { BackHandler, Pressable, Text, View } from "react-native";
import { useChain } from "../useChain";
import { colors, styles } from "../ui";
import { CastBallotScreen } from "./CastBallotScreen";
import { CreateIssueScreen } from "./CreateIssueScreen";
import { DelegationScreen } from "./DelegationScreen";
import { HomeScreen } from "./HomeScreen";
import { IssueDetailScreen } from "./IssueDetailScreen";
import { IssuesScreen } from "./IssuesScreen";

const TABS = [
  { id: "issues", label: "Cuestiones" },
  { id: "delegation", label: "Delegación" },
  { id: "account", label: "Mi cuenta" },
] as const;

type TabId = (typeof TABS)[number]["id"];

/** Screens opened on top of the tabs; "← Volver" or Android's back button closes them. */
type Route = { name: "createIssue" } | { name: "issue"; id: bigint } | { name: "vote"; id: bigint };

/** Signed-in shell: bottom tabs over a shared chain connection. */
export function MainScreen({ privateKey, onLogout }: { privateKey: string; onLogout: () => void }) {
  const chain = useChain(privateKey);
  const [tab, setTab] = useState<TabId>("issues");
  const [route, setRoute] = useState<Route | null>(null);

  // Voting goes back to its issue; everything else, to the tabs.
  const back = () => setRoute(route?.name === "vote" ? { name: "issue", id: route.id } : null);

  useEffect(() => {
    if (!route) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      back();
      return true;
    });
    return () => sub.remove();
  });

  if (route?.name === "createIssue") {
    return <CreateIssueScreen chain={chain} onDone={back} />;
  }
  if (route?.name === "issue") {
    return (
      <IssueDetailScreen
        chain={chain}
        issueId={route.id}
        onBack={back}
        onVote={() => setRoute({ name: "vote", id: route.id })}
      />
    );
  }
  if (route?.name === "vote") {
    return <CastBallotScreen chain={chain} issueId={route.id} onDone={back} />;
  }

  return (
    <View style={styles.screen}>
      <View style={{ flex: 1 }}>
        {tab === "issues" && (
          <IssuesScreen
            chain={chain}
            onCreate={() => setRoute({ name: "createIssue" })}
            onOpen={(id) => setRoute({ name: "issue", id })}
          />
        )}
        {tab === "delegation" && <DelegationScreen chain={chain} />}
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
