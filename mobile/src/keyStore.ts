// The member's testnet key lives in the device's secure storage (Android Keystore / iOS
// Keychain). Prototype limitation, decided in OPEN-7: the app holds the key itself.
import * as SecureStore from "expo-secure-store";

const KEY = "member.privateKey";

export const loadKey = () => SecureStore.getItemAsync(KEY);
export const saveKey = (privateKey: string) => SecureStore.setItemAsync(KEY, privateKey);
export const clearKey = () => SecureStore.deleteItemAsync(KEY);
