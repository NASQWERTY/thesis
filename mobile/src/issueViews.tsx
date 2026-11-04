// Pieces shared by the issue list and the issue detail.
import { Text, View } from "react-native";
import { useIpfsText } from "./ipfs";
import { parseDescription, phaseLabel, type IssueInfo } from "./issues";
import { colors, styles } from "./ui";

export function PhaseAndTopic({ issue }: { issue: IssueInfo }) {
  const phase = phaseLabel(issue.phase, issue.status);
  return (
    <View style={styles.row}>
      <Text style={[styles.value, { color: phase.color, textAlign: "left" }]}>{phase.text}</Text>
      <Text style={styles.tag}>{issue.topic}</Text>
    </View>
  );
}

/** Phase as a tinted pill (issue list). */
export function PhasePill({ issue }: { issue: IssueInfo }) {
  const phase = phaseLabel(issue.phase, issue.status);
  return <Text style={[styles.pill, { color: phase.color, backgroundColor: `${phase.color}1A` }]}>{phase.text}</Text>;
}

/** Only the title line of the description, for the compact list; "Cuestión #id" until it loads. */
export function IssueTitle({ gateway, issue }: { gateway: string | null; issue: IssueInfo }) {
  const text = useIpfsText(gateway, issue.descriptionCid);
  const title = text ? parseDescription(text).title : `Cuestión #${issue.id}`;
  return (
    <Text style={[styles.issueTitle, { flex: 1 }]} numberOfLines={1}>
      {title}
    </Text>
  );
}

/** Title and body from the description file on IPFS; `preview` cuts both to two lines. */
export function Description({ gateway, cid, preview }: { gateway: string | null; cid: string; preview?: boolean }) {
  const text = useIpfsText(gateway, cid);
  if (!text) {
    return <Text style={styles.p}>{text === undefined ? "Cargando descripción…" : "Descripción no disponible."}</Text>;
  }
  const { title, body } = parseDescription(text);
  const lines = preview ? 2 : undefined;
  return (
    <>
      <Text style={styles.issueTitle} numberOfLines={lines}>
        {title}
      </Text>
      {body !== "" && (
        <Text style={[styles.p, !preview && { color: colors.text }]} numberOfLines={lines} selectable={!preview}>
          {body}
        </Text>
      )}
    </>
  );
}
