import { useCallback, useEffect, useMemo, useState } from "react";
import { NETWORKS, type NetworkId } from "./config";
import { deployments } from "./generated/deployments";
import { connect } from "./chain";
import { saveNetwork } from "./keyStore";

/** Selected network, RPC URL and the signing connection, shared by every screen. */
export function useChain(privateKey: string, initialNetwork: NetworkId) {
  const [networkId, setNetworkId] = useState<NetworkId>(initialNetwork);
  const network = NETWORKS[networkId];
  const [rpcUrl, setRpcUrl] = useState(network.defaultRpcUrl());
  const deployment = deployments[network.chainId];

  const connection = useMemo(
    () => (deployment ? connect(network, rpcUrl, deployment, privateKey) : null),
    [network, rpcUrl, deployment, privateKey],
  );
  useEffect(() => () => connection?.provider.destroy(), [connection]);

  const selectNetwork = useCallback((id: NetworkId) => {
    setNetworkId(id);
    setRpcUrl(NETWORKS[id].defaultRpcUrl());
    saveNetwork(id);
  }, []);

  return { network, rpcUrl, setRpcUrl, deployment, connection, selectNetwork };
}

export type Chain = ReturnType<typeof useChain>;
