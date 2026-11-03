import { useCallback, useEffect, useState } from "react";
import type { Connection } from "./chain";
import type { Deployment } from "./config";
import type { Chain } from "./useChain";

const REFRESH_MS = 15000;

/**
 * Loads data from the contract on mount, every 15 s and on demand. Also keeps `now` on chain
 * time: the chain's clock can differ from the phone's (the local chain can be moved forward), so
 * countdowns use the offset measured at each refresh.
 * @param load must be stable (useCallback), or it reloads on every render.
 */
export function useChainData<T>(chain: Chain, load: (connection: Connection, deployment: Deployment) => Promise<T>) {
  const { connection, deployment, rpcUrl } = chain;
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [clockOffset, setClockOffset] = useState(0);
  const [phoneNow, setPhoneNow] = useState(Date.now() / 1000);

  const refresh = useCallback(async () => {
    if (!connection || !deployment) return;
    setLoading(true);
    try {
      const [result, block] = await Promise.all([load(connection, deployment), connection.provider.getBlock("latest")]);
      setData(result);
      setClockOffset(block!.timestamp - Date.now() / 1000);
      setError(null);
    } catch {
      setError(`No se pudo leer el contrato en ${rpcUrl}. ¿Está corriendo el nodo?`);
    } finally {
      setLoading(false);
    }
  }, [connection, deployment, rpcUrl, load]);

  useEffect(() => {
    setData(null);
    refresh();
    const timer = setInterval(refresh, REFRESH_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    const timer = setInterval(() => setPhoneNow(Date.now() / 1000), 1000);
    return () => clearInterval(timer);
  }, []);

  return { data, error, loading, refresh, now: phoneNow + clockOffset };
}
