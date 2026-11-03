import { useState } from "react";
import { ScrollView, Text, TextInput } from "react-native";
import { Wallet } from "ethers";
import { saveKey } from "../keyStore";
import { Button, Card, styles } from "../ui";
import { ScanKeyScreen } from "./ScanKeyScreen";

/** Normalizes and validates a private key; null if it is not a valid one. */
function parseKey(raw: string): string | null {
  const trimmed = raw.trim();
  const privateKey = trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`;
  try {
    new Wallet(privateKey); // throws if the key is not valid
    return privateKey;
  } catch {
    return null;
  }
}

export function ImportKeyScreen({ onImported }: { onImported: (privateKey: string) => void }) {
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);

  async function importKey(raw: string, source: "texto" | "qr") {
    const privateKey = parseKey(raw);
    if (!privateKey) {
      setError(
        source === "qr"
          ? "El código QR no contiene una clave válida."
          : "La clave no es válida: deben ser 64 caracteres hexadecimales.",
      );
      return;
    }
    setBusy(true);
    await saveKey(privateKey);
    onImported(privateKey);
  }

  if (scanning) {
    return (
      <ScanKeyScreen
        onScanned={(data) => {
          setScanning(false);
          importKey(data, "qr");
        }}
        onCancel={() => setScanning(false)}
      />
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.h1}>Gobernanza comunitaria</Text>
      <Text style={styles.p}>
        Importá la clave privada de tu cuenta de miembro. Se guarda cifrada en este dispositivo.
      </Text>
      <Card title="Código QR">
        <Text style={styles.p}>Escaneá el código QR que te entregó el registrador.</Text>
        <Button
          title="Escanear QR"
          onPress={() => {
            setError(null);
            setScanning(true);
          }}
          busy={busy}
        />
      </Card>
      <Card title="O pegá la clave privada">
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={(t) => {
            setInput(t);
            setError(null);
          }}
          placeholder="0x…"
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
        />
        <Button title="Importar" kind="secondary" onPress={() => importKey(input, "texto")} busy={busy} />
      </Card>
      {error && <Text style={styles.error}>{error}</Text>}
      <Text style={styles.p}>
        Prototipo en red de prueba: usá solo las cuentas de demo que te entregó el registrador, nunca una clave
        con fondos reales.
      </Text>
    </ScrollView>
  );
}
