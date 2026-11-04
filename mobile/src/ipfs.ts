import { useEffect, useState } from "react";
import { UPLOADER_URL } from "./config";

/** Pinata gateway host, served by the uploader; null when the uploader is not reachable. */
export async function fetchGateway(): Promise<string | null> {
  try {
    const response = await fetch(`${UPLOADER_URL}/config`);
    return ((await response.json()) as { gateway: string | null }).gateway;
  } catch {
    return null;
  }
}

/**
 * Uploads a text file through the uploader and returns its CID. The multipart body is built by
 * hand: React Native's FormData only sends files from a `uri`, not Blobs made from a string.
 */
export async function uploadText(fileName: string, text: string): Promise<string> {
  const boundary = `----gobernanza${Date.now()}`;
  const body =
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n` +
    "Content-Type: text/plain; charset=utf-8\r\n\r\n" +
    `${text}\r\n` +
    `--${boundary}--\r\n`;

  let response: Response;
  try {
    response = await fetch(`${UPLOADER_URL}/upload`, {
      method: "POST",
      headers: { "Content-Type": `multipart/form-data; boundary=${boundary}` },
      body,
    });
  } catch {
    throw new Error("No se pudo contactar al servicio de subida de archivos. Intente de nuevo más tarde.");
  }
  const json = (await response.json().catch(() => ({}))) as { cid?: string; error?: string };
  if (!response.ok || !json.cid) throw new Error(`El servicio de subida rechazó el archivo: ${json.error ?? response.status}`);
  return json.cid;
}

export function useGateway() {
  const [gateway, setGateway] = useState<string | null>(null);
  useEffect(() => {
    fetchGateway().then(setGateway);
  }, []);
  return gateway;
}

/** Text content of a file on IPFS; null when it is not text or not reachable, undefined while loading. */
export function useIpfsText(gateway: string | null, cid: string) {
  const [text, setText] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    if (!gateway) return setText(null);
    let cancelled = false;
    fetch(`https://${gateway}/ipfs/${cid}`)
      .then(async (r) => {
        const type = r.headers.get("content-type") ?? "";
        if (!r.ok || !type.startsWith("text/")) return null;
        return r.text();
      })
      .catch(() => null)
      .then((t) => {
        if (!cancelled) setText(t);
      });
    return () => {
      cancelled = true;
    };
  }, [gateway, cid]);
  return text;
}
