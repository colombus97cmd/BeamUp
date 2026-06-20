"use client";
import { WagmiProvider, createConfig, http } from "wagmi";
import { bsc, polygon, arbitrum } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConnectKitProvider, getDefaultConfig } from "connectkit";
import { defineChain } from "viem";

// Elastos Smart Chain (ESC) — EVM Compatible, secured by Bitcoin hashpower
export const elastos = defineChain({
  id: 20,
  name: "Elastos Smart Chain",
  nativeCurrency: { name: "Elastos", symbol: "ELA", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://api.elastos.io/esc"] },
  },
  blockExplorers: {
    default: { name: "ESC Explorer", url: "https://esc.elastos.io" },
  },
});

export const elastosTestnet = defineChain({
  id: 21,
  name: "Elastos Smart Chain Testnet",
  nativeCurrency: { name: "Elastos (Test)", symbol: "tELA", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://api-testnet.elastos.io/esc"] },
  },
  blockExplorers: {
    default: { name: "ESC Testnet Explorer", url: "https://esc-testnet.elastos.io" },
  },
  testnet: true,
});

const config = createConfig(
  getDefaultConfig({
    chains: [bsc, elastos, polygon, arbitrum],
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