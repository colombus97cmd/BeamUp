"use client";
import { WagmiProvider, createConfig } from "wagmi";
import { rpcTransport } from "../lib/rpc";
import { bsc, polygon, mainnet, arbitrum } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConnectKitProvider, getDefaultConfig } from "connectkit";

// Réseaux où le contrat BeamUpV3 est déployé (voir src/config/contracts.ts).
const config = createConfig(
  getDefaultConfig({
    chains: [bsc, polygon, mainnet, arbitrum],
    transports: {
      [bsc.id]: rpcTransport(bsc.id),
      [polygon.id]: rpcTransport(polygon.id),
      [mainnet.id]: rpcTransport(mainnet.id),
      [arbitrum.id]: rpcTransport(arbitrum.id),
    },
    walletConnectProjectId: "acb01311868dd0860714b6287755fb3c", // Project ID pour le QR Code (Binance Web3, etc.)
    appName: "Beam Up",
    // Le connecteur « Family » (Aave) forçait le réseau Ethereum pour les visiteurs non connectés.
    enableFamily: false,
  })
);

const queryClient = new QueryClient();

export const Web3Provider = ({ children }: { children: React.ReactNode }) => {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider>{children}</ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};
