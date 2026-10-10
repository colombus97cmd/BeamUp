import type { Metadata } from 'next';
import Link from 'next/link';
import { ShieldCheck, ExternalLink, Wallet, Upload, Heart, Construction, Github, Linkedin, Youtube, Palette, Globe, Mail } from 'lucide-react';
import Navigation from '../../components/Navigation';
import { CONTRACT_ADDRESSES, getChainName, getExplorer } from '../../config/contracts';
import { FORMATS } from '../../config/formats';

export const metadata: Metadata = {
  title: 'À propos | BeamUp',
  description: "BeamUp, la DApp où les créateurs multimédia publient leurs œuvres et reçoivent 95 % des soutiens de leurs fans, directement on-chain.",
};

const PORTFOLIO = 'https://portfolio-2026-colombod.vercel.app/';

// Liens provisoires : BeamUp n'a pas encore ses propres comptes. Ce sont ceux du fondateur.
const SOCIALS = [
  { name: 'Portfolio', href: PORTFOLIO, icon: Globe },
  { name: 'GitHub', href: 'https://github.com/colombus97cmd', icon: Github },
  { name: 'LinkedIn', href: 'https://www.linkedin.com/in/david-colombo-2bb172113/', icon: Linkedin },
  { name: 'ArtStation', href: 'https://www.artstation.com/davidcolombo', icon: Palette },
  { name: 'YouTube', href: 'https://www.youtube.com/channel/UCwcCigU5bFZ4voNeGoqgJ3Q', icon: Youtube },
  { name: 'Contact', href: `${PORTFOLIO}contact.html`, icon: Mail },
];


export default function About() {
  return (
    <div className="min-h-screen bg-[#020202] text-white">
      <Navigation />

      <main className="max-w-4xl mx-auto px-4 py-12 md:py-20 space-y-16">
        {/* Intro */}
        <section>
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#00f2ff] font-black mb-3">À propos</p>
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter mb-6">BeamUp</h1>
          <p className="text-gray-300 text-base md:text-lg leading-relaxed max-w-2xl">
            BeamUp est une DApp de diffusion pour les créateurs multimédia : musique, clips, manga, courts métrages, animation et GIF.
            Les œuvres sont stockées sur IPFS et enregistrées on-chain au nom de leur créateur, et les fans les soutiennent directement en crypto.
          </p>
          <div className="flex flex-wrap gap-2 mt-6">
            {FORMATS.map((fmt) => {
              const Icon = fmt.icon;
              return (
                <span key={fmt.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-wider text-gray-300">
                  <Icon className="w-3.5 h-3.5" style={{ color: fmt.hex }} /> {fmt.label}
                </span>
              );
            })}
          </div>
        </section>

        {/* How it works */}
        <section>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight mb-6">Comment ça marche</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { icon: Upload, title: 'Publication', text: "Le créateur dépose son œuvre. Frais de publication : 0,0001 BNB, POL ou ETH." },
              { icon: Heart, title: 'Soutien', text: 'Les fans envoient un pourboire ou achètent une œuvre premium au prix fixé par le créateur.' },
              { icon: Wallet, title: 'Paiement', text: '95 % vont au créateur dans la même transaction. 5 % de commission financent la plateforme.' },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.title} className="bg-white/5 border border-white/10 rounded-2xl p-5">
                  <Icon className="w-5 h-5 text-[#bc13fe] mb-3" />
                  <h3 className="font-black uppercase text-sm mb-2">{s.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{s.text}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Contracts */}
        <section>
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-5 h-5 text-[#00f2ff]" />
            <h2 className="text-2xl md:text-3xl font-black tracking-tight">Contrats vérifiés</h2>
          </div>
          <p className="text-gray-400 text-sm mb-6 max-w-2xl">
            Le code source des contrats est publié et vérifié sur les explorateurs. Le propriétaire du contrat peut modifier les frais et la commission ; le passage à un multisig et un plafond de commission sont prévus dans la prochaine version.
          </p>
          <div className="grid md:grid-cols-2 gap-3">
            {Object.entries(CONTRACT_ADDRESSES).map(([chainId, addr]) => {
              const ex = { name: getChainName(Number(chainId)), url: `${getExplorer(Number(chainId))}/address/` };
              return (
                <a
                  key={chainId}
                  href={`${ex.url}${addr}#code`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-3 bg-white/5 border border-white/10 hover:border-[#00f2ff]/40 rounded-2xl p-5 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-widest text-gray-500 font-black mb-1">{ex.name}</p>
                    <p className="font-mono text-xs text-gray-300 truncate">{addr}</p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-[#00f2ff] flex-shrink-0" />
                </a>
              );
            })}
          </div>
        </section>

        {/* Team & socials */}
        <section>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight mb-4">L&apos;équipe</h2>
          <p className="text-gray-300 text-sm md:text-base leading-relaxed max-w-2xl mb-6">
            BeamUp est conçu et développé par <a href={PORTFOLIO} target="_blank" rel="noopener noreferrer" className="text-[#00f2ff] hover:underline">David Colombo (colombus97)</a>, créateur multimédia.
          </p>

          <div className="flex items-start gap-3 p-4 rounded-2xl bg-yellow-400/10 border border-yellow-400/30 mb-6 max-w-2xl">
            <Construction className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-100/90 leading-relaxed">
              <span className="font-black text-yellow-400 uppercase tracking-wider">Liens provisoires.</span>{' '}
              BeamUp n&apos;a pas encore ses propres réseaux sociaux. En attendant, ce sont ceux du fondateur ; ils seront remplacés par les comptes officiels de BeamUp.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {SOCIALS.map((s) => {
              const Icon = s.icon;
              return (
                <a
                  key={s.name}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 bg-white/5 border border-white/10 hover:border-[#bc13fe]/50 hover:bg-white/10 rounded-2xl p-4 transition-colors"
                >
                  <Icon className="w-5 h-5 text-[#bc13fe]" />
                  <span className="text-sm font-bold">{s.name}</span>
                </a>
              );
            })}
          </div>
        </section>

        <section className="text-center pt-4">
          <Link href="/publish" className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#00f2ff] to-[#bc13fe] text-black font-black uppercase tracking-widest text-xs rounded-full hover:scale-105 transition-transform">
            <Upload className="w-4 h-4" /> Publier mon œuvre
          </Link>
        </section>
      </main>
    </div>
  );
}
