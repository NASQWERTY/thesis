import { useState } from "react";
import { ScrollView, Text, TextInput } from "react-native";
import { Wallet } from "ethers";
import { saveKey } from "../keyStore";
import { Button, Card, styles } from "../ui";

export function ImportKeyScreen({ onImported }: { onImported: (privateKey: string) => void }) {
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function importKey() {
    const raw = input.trim();
    const privateKey = raw.startsWith("0x") ? raw : `0x${raw}`;
    try {
      new Wallet(privateKey); // throws if the key is not valid
    } catch {
      setError("La clave no es válida: deben ser 64 caracteres hexadecimales.");
      return;
    }
    setBusy(true);
    await saveKey(privateKey);
    onImported(privateKey);
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.h1}>Gobernanza comunitaria</Text>
      <Text style={styles.p}>
        Importá la clave privada de tu cuenta de miembro. Se guarda cifrada en este dispositivo.
      </Text>
      <Card title="Clave privada">
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
        {error && <Text style={styles.error}>{error}</Text>}
        <Button title="Importar" onPress={importKey} busy={busy} />
      </Card>
      <Text style={styles.p}>
        Prototipo en red de prueba: usá solo cuentas de demo, nunca una clave con fondos reales. En la red local,
        las claves se obtienen con «npm run sim -- keys» en la carpeta simulator.
      </Text>
    </ScrollView>
  );
}
