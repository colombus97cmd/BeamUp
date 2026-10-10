'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ConnectKitButton } from 'connectkit';
import { ArrowRight, Sparkles, Upload, Heart, Wallet, ShieldCheck, Layers, ExternalLink, Play } from 'lucide-react';
import { FORMATS } from '../config/formats';
import { CONTRACT_ADDRESSES } from '../config/contracts';

const CREATOR_SHARE = 0.95;

const EXPLORERS: Record<number, { name: string; url: string }> = {
  56: { name: 'BNB Chain', url: 'https://bscscan.com/address/' },
  137: { name: 'Polygon', url: 'https://polygonscan.com/address/' },
};

export default function LandingPage() {
  const [fans, setFans] = useState(200);
  const [tip, setTip] = useState(2);
  const monthly = Math.round(fans * tip * CREATOR_SHARE);

  return (
    <div className="relative min-h-[calc(100vh-64px)] bg-[#020202] text-white overflow-x-hidden selection:bg-[#00f2ff] selection:text-black">
      {/* Background Effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] max-w-full h-[400px] bg-[#bc13fe] rounded-full blur-[150px] opacity-10 pointer-events-none" />
      <div className="absolute top-[20%] right-0 w-[400px] max-w-full h-[400px] bg-[#00f2ff] rounded-full blur-[150px] opacity-10 pointer-events-none" />

      {/* HERO */}
      <section className="relative flex flex-col items-center justify-center pt-24 md:pt-32 pb-16 px-4 text-center z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-md">
          <Sparkles className="w-4 h-4 text-[#00f2ff]" />
          <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-gray-300">La scène web3 des créateurs multimédia</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-7xl font-black mb-6 tracking-tighter max-w-4xl mx-auto leading-[1.05]">
          Diffusez votre art. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00f2ff] via-[#bc13fe] to-[#ff2d95]">
            Vos fans vous paient en direct.
          </span>
        </h1>

        <p className="text-gray-400 text-base md:text-xl max-w-2xl mx-auto mb-10 font-medium">
          Musique, clips, manga, courts métrages, animation, GIF : publiez en quelques minutes et recevez 95 % de chaque soutien et de chaque achat, directement dans votre wallet.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Link
            href="/publish"
            className="group relative inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-[#00f2ff] to-[#bc13fe] text-black font-black uppercase tracking-widest text-xs md:text-sm rounded-full transition-transform hover:scale-105 active:scale-95"
          >
            <Upload className="w-4 h-4" /> Publier mon œuvre
          </Link>
          <ConnectKitButton.Custom>
            {({ show }) => (
              <button
                onClick={show}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 border border-white/20 hover:bg-white hover:text-black transition-colors font-black uppercase tracking-widest text-xs md:text-sm rounded-full"
              >
                <Play className="w-4 h-4" /> Explorer les œuvres
              </button>
            )}
          </ConnectKitButton.Custom>
        </div>
      </section>

      {/* FORMATS */}
      <section className="relative z-10 py-12 md:py-16 px-4 md:px-10 max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#00f2ff] font-black mb-3">6 formats, un seul lieu</p>
          <h2 className="text-3xl md:text-4xl font-black tracking-tight">Ce que vous pouvez diffuser</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-5">
          {FORMATS.map((fmt) => {
            const Icon = fmt.icon;
            return (
              <Link
                key={fmt.id}
                href="/publish"
                className="group relative overflow-hidden bg-white/5 border border-white/10 p-5 md:p-7 rounded-3xl backdrop-blur-sm transition-all duration-300 hover:-translate-y-1"
              >
                <div
                  className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-20 group-hover:opacity-50 transition-opacity"
                  style={{ backgroundColor: fmt.hex }}
                />
                <div
                  className="relative w-11 h-11 md:w-12 md:h-12 rounded-2xl flex items-center justify-center mb-4 md:mb-6 border group-hover:scale-110 transition-transform"
                  style={{ borderColor: `${fmt.hex}55`, backgroundColor: `${fmt.hex}1a` }}
                >
                  <Icon className="w-5 h-5 md:w-6 md:h-6" style={{ color: fmt.hex }} />
                </div>
                <h3 className="relative text-base md:text-xl font-black uppercase mb-1 md:mb-2">{fmt.label}</h3>
                <p className="relative text-gray-400 text-xs md:text-sm leading-relaxed">{fmt.tagline}</p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* HOW CREATORS EARN */}
      <section className="relative z-10 py-12 md:py-20 px-4 md:px-10 max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-[#bc13fe] font-black mb-3">Streaming rémunéré</p>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-8">Comment vous êtes payé</h2>
            <ol className="space-y-5">
              {[
                { icon: Upload, title: 'Vous publiez', text: "Votre fichier est stocké sur IPFS et enregistré on-chain à votre nom. Frais de publication : 0,0001 BNB ou POL." },
                { icon: Heart, title: 'Vos fans soutiennent', text: "Pourboire pendant l'écoute ou la lecture, ou achat de vos œuvres premium au prix que vous fixez." },
                { icon: Wallet, title: 'Vous encaissez', text: "95 % arrivent dans votre wallet dans la même transaction. Pas de seuil, pas de délai de paiement." },
              ].map((step, i) => {
                const Icon = step.icon;
                return (
                  <li key={step.title} className="flex gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-[#00f2ff] font-black text-sm">
                      {i + 1}
                    </div>
                    <div>
                      <h3 className="font-black uppercase text-sm mb-1 flex items-center gap-2"><Icon className="w-4 h-4 text-[#bc13fe]" /> {step.title}</h3>
                      <p className="text-gray-400 text-sm leading-relaxed">{step.text}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          {/* Revenue simulator */}
          <div className="bg-white/5 border border-white/10 rounded-[32px] p-6 md:p-8 backdrop-blur-md shadow-2xl">
            <p className="text-[10px] uppercase tracking-[0.3em] text-gray-400 font-black mb-6">Simulez vos revenus</p>

            <label className="block mb-6">
              <div className="flex justify-between text-xs font-bold mb-2">
                <span className="text-gray-300">Fans qui vous soutiennent par mois</span>
                <span className="text-white">{fans}</span>
              </div>
              <input type="range" min={10} max={5000} step={10} value={fans} onChange={(e) => setFans(Number(e.target.value))} className="w-full accent-[#00f2ff]" />
            </label>

            <label className="block mb-8">
              <div className="flex justify-between text-xs font-bold mb-2">
                <span className="text-gray-300">Soutien moyen par fan</span>
                <span className="text-white">{tip} €</span>
              </div>
              <input type="range" min={1} max={20} step={1} value={tip} onChange={(e) => setTip(Number(e.target.value))} className="w-full accent-[#bc13fe]" />
            </label>

            <div className="rounded-2xl bg-gradient-to-br from-[#00f2ff]/10 to-[#bc13fe]/10 border border-white/10 p-5">
              <p className="text-[10px] uppercase tracking-widest text-gray-400 font-black mb-1">Vous recevez chaque mois</p>
              <p className="text-4xl md:text-5xl font-black tracking-tight">{monthly.toLocaleString('fr-FR')} €</p>
              <p className="text-[11px] text-gray-500 mt-2">Commission plateforme de 5 % déjà déduite. Montants en équivalent euros, versés en crypto.</p>
            </div>
          </div>
        </div>
      </section>

      {/* NFT TEASER */}
      <section className="relative z-10 py-12 md:py-16 px-4 md:px-10 max-w-6xl mx-auto">
        <div className="relative overflow-hidden rounded-[32px] border border-[#bc13fe]/30 bg-gradient-to-br from-[#bc13fe]/10 via-transparent to-[#00f2ff]/10 p-6 md:p-12">
          <div className="absolute -bottom-20 -right-20 w-72 h-72 bg-[#bc13fe] rounded-full blur-[120px] opacity-20 pointer-events-none" />
          <div className="relative flex flex-col md:flex-row md:items-center gap-6 md:gap-10">
            <div className="w-14 h-14 rounded-2xl bg-[#bc13fe]/20 border border-[#bc13fe]/40 flex items-center justify-center flex-shrink-0">
              <Layers className="w-7 h-7 text-[#bc13fe]" />
            </div>
            <div className="flex-1">
              <span className="inline-block text-[9px] uppercase tracking-[0.25em] font-black px-2 py-1 rounded-full bg-white/10 text-gray-300 mb-3">En préparation</span>
              <h2 className="text-2xl md:text-3xl font-black tracking-tight mb-3">Vos œuvres en NFT, l&apos;accès en streaming</h2>
              <p className="text-gray-400 text-sm md:text-base leading-relaxed max-w-2xl">
                Chaque œuvre pourra devenir un NFT : le détenir donnera accès à l&apos;écoute ou au visionnage, et chaque revente reversera des royalties au créateur. Cette fonction arrive avec la prochaine version du contrat.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST */}
      <section className="relative z-10 py-12 md:py-16 px-4 md:px-10 max-w-6xl mx-auto">
        <div className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-5 h-5 text-[#00f2ff]" />
              <h2 className="font-black uppercase text-sm tracking-wider">Transparent on-chain</h2>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              Chaque publication, soutien et achat passe par un contrat public. Vérifiez vous-même les transactions.
            </p>
          </div>
          {Object.entries(CONTRACT_ADDRESSES).map(([chainId, addr]) => {
            const ex = EXPLORERS[Number(chainId)];
            if (!ex) return null;
            return (
              <a
                key={chainId}
                href={`${ex.url}${addr}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-3 bg-white/5 border border-white/10 hover:border-[#00f2ff]/40 rounded-2xl p-5 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-widest text-gray-500 font-black mb-1">Contrat {ex.name}</p>
                  <p className="font-mono text-xs text-gray-300 truncate">{addr}</p>
                </div>
                <ExternalLink className="w-4 h-4 text-[#00f2ff] flex-shrink-0" />
              </a>
            );
          })}
        </div>
      </section>

      {/* BOTTOM CTA */}
      <section className="relative z-10 py-20 md:py-24 px-4 text-center flex flex-col items-center">
        <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-4">Votre prochaine œuvre mérite d&apos;être payée.</h2>
        <p className="text-gray-400 mb-8 max-w-xl">Connectez votre wallet, choisissez un format, publiez.</p>
        <Link
          href="/publish"
          className="inline-flex items-center gap-2 px-8 py-4 bg-white text-black font-black uppercase tracking-widest text-xs rounded-full hover:scale-105 transition-transform"
        >
          Commencer <ArrowRight className="w-4 h-4" />
        </Link>
      </section>
    </div>
  );
}
