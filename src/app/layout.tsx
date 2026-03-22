import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Web3Provider } from '../components/Web3Provider';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: "BeamUp | Propulsez l'Art Web3",
  description: "Soutenez les Créateurs en Temps Réel. Découvrez des œuvres exclusives et rémunérez vos artistes préférés sans intermédiaire sur la Binance Smart Chain.",
  keywords: ["Web3", "Art", "NFT", "Dapp", "Binance Smart Chain", "Créateurs", "Rémunération"],
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='fr'>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Web3Provider>
          {children}
        </Web3Provider>
      </body>
    </html>
  );
}
