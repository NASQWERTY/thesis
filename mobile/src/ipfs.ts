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
