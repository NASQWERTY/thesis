import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";

export const colors = {
  bg: "#F4F6F8",
  card: "#FFFFFF",
  text: "#1B1F24",
  muted: "#5F6B7A",
  primary: "#1F6FEB",
  ok: "#1A7F37",
  warn: "#9A6700",
  error: "#CF222E",
  border: "#D8DEE4",
};

export function Card({ title, children, style }: { title: string; children: ReactNode; style?: ViewStyle }) {
  return (
    <View style={[styles.card, style]}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

export function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, color ? { color } : null]} selectable>
        {value}
      </Text>
    </View>
  );
}

export function Button({
  title,
  onPress,
  busy,
  disabled,
  kind = "primary",
}: {
  title: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
  kind?: "primary" | "secondary";
}) {
  const primary = kind === "primary";
  return (
    <Pressable
      onPress={onPress}
      disabled={busy || disabled}
      style={({ pressed }) => [
        styles.button,
        primary ? styles.buttonPrimary : styles.buttonSecondary,
        (pressed || busy) && { opacity: 0.6 },
        disabled && { opacity: 0.35 },
      ]}
    >
      {busy ? (
        <ActivityIndicator color={primary ? "#fff" : colors.primary} />
      ) : (
        <Text style={[styles.buttonText, { color: primary ? "#fff" : colors.primary }]}>{title}</Text>
      )}
    </Pressable>
  );
}

export function BackLink({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={12} style={{ alignSelf: "flex-start" }}>
      <Text style={{ color: colors.primary, fontSize: 16, fontWeight: "600" }}>← Volver</Text>
    </Pressable>
  );
}

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 12 },
  h1: { fontSize: 22, fontWeight: "700", color: colors.text },
  p: { fontSize: 15, color: colors.muted, lineHeight: 21 },
  card: { backgroundColor: colors.card, borderRadius: 12, padding: 16, gap: 8, borderWidth: 1, borderColor: colors.border },
  cardTitle: { fontSize: 13, fontWeight: "700", color: colors.muted, textTransform: "uppercase", letterSpacing: 0.5 },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  label: { fontSize: 15, color: colors.muted },
  value: { fontSize: 15, color: colors.text, fontWeight: "600", flexShrink: 1, textAlign: "right" },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    backgroundColor: colors.card,
    color: colors.text,
  },
  button: { borderRadius: 8, paddingVertical: 12, alignItems: "center", minHeight: 46, justifyContent: "center" },
  buttonPrimary: { backgroundColor: colors.primary },
  buttonSecondary: { backgroundColor: "transparent", borderWidth: 1, borderColor: colors.primary },
  buttonText: { fontSize: 16, fontWeight: "600" },
  error: { color: colors.error, fontSize: 15 },
  segment: { flexDirection: "row", gap: 8 },
  segmentItem: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: colors.border, alignItems: "center" },
  segmentItemActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tag: {
    fontSize: 13,
    color: colors.muted,
    backgroundColor: colors.bg,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    overflow: "hidden",
  },
  option: { gap: 4, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  rankItem: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 6 },
  rankNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    color: "#fff",
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 28,
    overflow: "hidden",
  },
  removeButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.error,
  },
  removeButtonText: { color: colors.error, fontWeight: "600", fontSize: 14 },
  bid: { gap: 6, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border },
  issueTitle: { fontSize: 17, fontWeight: "700", color: colors.text },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  pill: {
    fontSize: 13,
    fontWeight: "700",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
    overflow: "hidden",
    alignSelf: "flex-start",
  },
  header: { backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 14, gap: 2 },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#fff" },
  headerSubtitle: { fontSize: 14, color: "rgba(255,255,255,0.85)" },
  listItem: { backgroundColor: colors.card, borderRadius: 12, padding: 14, gap: 6, borderWidth: 1, borderColor: colors.border },
  small: { fontSize: 13, color: colors.muted },
  tabBar: { flexDirection: "row", borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.card },
  tabItem: { flex: 1, paddingVertical: 14, alignItems: "center" },
  tabLabel: { fontSize: 15, fontWeight: "600", color: colors.muted },
});
