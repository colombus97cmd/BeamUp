import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Web3Provider } from '../components/Web3Provider';
import ServiceWorkerRegistration from '../components/ServiceWorkerRegistration';
import PWAInstallPrompt from '../components/PWAInstallPrompt';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const viewport: Viewport = {
  themeColor: '#00f2ff',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: "BeamUp | Propulsez l'Art Web3",
  description: "Soutenez les Créateurs en Temps Réel. Découvrez des œuvres exclusives et rémunérez vos artistes préférés sans intermédiaire sur la Binance Smart Chain.",
  keywords: ["Web3", "Art", "NFT", "Dapp", "Binance Smart Chain", "Créateurs", "Rémunération"],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'BeamUp',
  },
  openGraph: {
    title: "BeamUp | Propulsez l'Art Web3",
    description: "Soutenez les Créateurs en Temps Réel. Découvrez des œuvres exclusives et rémunérez vos artistes préférés sur la BNB Smart Chain.",
    url: "https://beam-up.vercel.app",
    siteName: "BeamUp",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "BeamUp Web3 Banner",
      },
    ],
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "BeamUp | Propulsez l'Art Web3",
    description: "Soutenez les Créateurs en Temps Réel et accédez à des œuvres exclusives sans intermédiaires.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: [
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='fr'>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ServiceWorkerRegistration />
        <Web3Provider>
          {children}
          <PWAInstallPrompt />
        </Web3Provider>
      </body>
    </html>
  );
}
