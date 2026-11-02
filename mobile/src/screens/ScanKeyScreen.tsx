import { useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Button, styles } from "../ui";

/** Full-screen QR scanner. Reports the first QR read; the caller validates its content. */
export function ScanKeyScreen({ onScanned, onCancel }: { onScanned: (data: string) => void; onCancel: () => void }) {
  const [permission, requestPermission] = useCameraPermissions();
  // onBarcodeScanned fires on every frame while the QR is in view: report it only once.
  const done = useRef(false);

  if (!permission) return <View style={styles.screen} />;

  if (!permission.granted) {
    return (
      <View style={[styles.screen, styles.content, { justifyContent: "center" }]}>
        <Text style={styles.p}>La app necesita la cámara para leer el código QR de tu clave.</Text>
        {permission.canAskAgain ? (
          <Button title="Permitir cámara" onPress={requestPermission} />
        ) : (
          <Text style={styles.error}>El permiso fue denegado. Habilitalo en los ajustes de Android para Expo Go.</Text>
        )}
        <Button title="Cancelar" kind="secondary" onPress={onCancel} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={({ data }) => {
          if (done.current) return;
          done.current = true;
          onScanned(data);
        }}
      />
      <View style={scan.overlay}>
        <Text style={scan.hint}>Apuntá al código QR de tu clave</Text>
        <View style={scan.frame} />
        <Button title="Cancelar" kind="secondary" onPress={onCancel} />
      </View>
    </View>
  );
}

const scan = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "space-between", alignItems: "stretch", padding: 24 },
  hint: { color: "#fff", fontSize: 17, fontWeight: "600", textAlign: "center", marginTop: 24 },
  frame: { alignSelf: "center", width: 240, height: 240, borderWidth: 3, borderColor: "#fff", borderRadius: 16 },
});
