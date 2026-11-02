import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

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

export function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.card}>
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
  kind = "primary",
}: {
  title: string;
  onPress: () => void;
  busy?: boolean;
  kind?: "primary" | "secondary";
}) {
  const primary = kind === "primary";
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      style={({ pressed }) => [
        styles.button,
        primary ? styles.buttonPrimary : styles.buttonSecondary,
        (pressed || busy) && { opacity: 0.6 },
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
});
