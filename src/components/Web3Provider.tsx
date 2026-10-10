"use client";
import { WagmiProvider, createConfig } from "wagmi";
import { bsc, polygon, mainnet } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConnectKitProvider, getDefaultConfig } from "connectkit";

// Seuls les réseaux où le contrat BeamUpV2 est réellement déployé (voir src/config/contracts.ts).
// Elastos et Arbitrum ont été retirés : aucune adresse de contrat n'y existe, les fonds envoyés seraient perdus.
const config = createConfig(
  getDefaultConfig({
    chains: [bsc, polygon, mainnet],
    walletConnectProjectId: "acb01311868dd0860714b6287755fb3c", // Project ID pour le QR Code (Binance Web3, etc.)
    appName: "Beam Up",
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
