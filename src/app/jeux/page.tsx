import type { Metadata } from 'next';
import { Gamepad2, Download, Play, Monitor, Smartphone, Coins, Trophy, Award, Palette, ShieldCheck, Swords } from 'lucide-react';
import Navigation from '../../components/Navigation';
import TournamentPanel from '../../components/TournamentPanel';
import LegalFooter from '../../components/LegalFooter';
import GameNewsSignup from '../../components/GameNewsSignup';

export const metadata: Metadata = {
  title: 'Jeux | BeamUp',
  description: 'Les jeux vidéo des créateurs BeamUp, jouables dans le navigateur et installables sur PC et mobile.',
};

const PORTFOLIO = 'https://portfolio-2026-colombod.vercel.app';

// Jeux référencés sur BeamUp. Un jeu = une application web installable (PWA) hébergée par son créateur.
const GAMES = [
  {
    id: 'chains-and-crowns',
    title: 'Chains & Crowns',
    tagline: 'Guadeloupe, mai 1802',
    description:
      "Jeu d'échecs 2D inspiré de la résistance guadeloupéenne de 1802 face au rétablissement de l'esclavage. Menez la Résistance contre l'IA impériale, ou affrontez un autre joueur en duel en ligne.",
    poster: `${PORTFOLIO}/assets/affiche_chains_crowns.webp`,
    url: `${PORTFOLIO}/chains-and-crowns/`,
    creator: 'colombus97',
    tags: ['Échecs', 'Solo contre IA', 'Duel en ligne', 'Hors ligne'],
  },
];

const FEATURES = [
  { icon: Coins, title: 'Cauris gratuits', text: "Misez des cauris contre l'IA : votre mise vous revient avec un bonus si vous gagnez. Ils sont offerts au départ et chaque jour." },
  { icon: Trophy, title: 'Classement Elo', text: 'Chaque partie, contre l’IA ou en duel, fait évoluer votre classement.' },
  { icon: Award, title: 'Badges', text: 'Premier sang, Matouba, Duelliste… des titres qui racontent votre campagne.' },
  { icon: Palette, title: 'Plateaux', text: 'Débloquez les plateaux Nuit de Matouba, Soufrière et Océan caraïbe avec vos cauris.' },
];

const INSTALL = [
  { icon: Monitor, title: 'PC (Windows, macOS, Linux)', text: "Ouvrez le jeu dans Chrome ou Edge, puis cliquez sur « Installer le jeu » ou sur l'icône d'installation de la barre d'adresse." },
  { icon: Smartphone, title: 'Android', text: "Ouvrez le jeu dans Chrome, puis touchez « Installer le jeu » ou Menu › « Ajouter à l'écran d'accueil »." },
  { icon: Smartphone, title: 'iPhone et iPad', text: "Ouvrez le jeu dans Safari, touchez Partager puis « Sur l'écran d'accueil »." },
];

export default function Jeux() {
  return (
    <div className="min-h-screen bg-[#020202] text-white">
      <Navigation />

      <main className="max-w-5xl mx-auto px-4 py-12 md:py-20 space-y-16">
        <section>
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#00f2ff] font-black mb-3 flex items-center gap-2">
            <Gamepad2 className="w-4 h-4" /> Jeux vidéo
          </p>
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter mb-6">Jouer sur BeamUp</h1>
          <p className="text-gray-300 text-base md:text-lg leading-relaxed max-w-2xl">
            Les jeux des créateurs BeamUp se lancent dans le navigateur et s&apos;installent comme une application sur PC et sur mobile, sans passer par un store.
          </p>
        </section>

        {GAMES.map((g) => (
          <section key={g.id} className="grid md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-6 md:gap-10 items-center bg-white/5 border border-white/10 rounded-3xl p-4 md:p-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={g.poster} alt={`Affiche de ${g.title}`} className="w-full rounded-2xl border border-white/10 object-cover" loading="lazy" />
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-[#bc13fe] font-black mb-2">{g.tagline}</p>
              <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-3">{g.title}</h2>
              <p className="text-gray-400 text-sm md:text-base leading-relaxed mb-4">{g.description}</p>
              <div className="flex flex-wrap gap-2 mb-6">
                {g.tags.map((t) => (
                  <span key={t} className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-wider text-gray-300">{t}</span>
                ))}
              </div>
              <div className="flex flex-wrap gap-3">
                <a href={g.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#00f2ff] to-[#bc13fe] text-black font-black uppercase tracking-widest text-xs rounded-full hover:scale-105 transition-transform">
                  <Play className="w-4 h-4" /> Jouer gratuitement
                </a>
                <a href="#installer" className="inline-flex items-center gap-2 px-6 py-3 border border-white/20 text-white font-black uppercase tracking-widest text-xs rounded-full hover:bg-white/10 transition-colors">
                  <Download className="w-4 h-4" /> Installer
                </a>
              </div>
              <p className="text-[11px] text-gray-500 mt-4">Créateur : {g.creator}</p>
            </div>
          </section>
        ))}

        <section>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight mb-6">Progression</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="bg-white/5 border border-white/10 rounded-2xl p-5">
                  <Icon className="w-5 h-5 text-[#bc13fe] mb-3" />
                  <h3 className="font-black uppercase text-sm mb-2">{f.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{f.text}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section id="installer" className="scroll-mt-24">
          <h2 className="text-2xl md:text-3xl font-black tracking-tight mb-6">Installer sur PC et mobile</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {INSTALL.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.title} className="bg-white/5 border border-white/10 rounded-2xl p-5">
                  <Icon className="w-5 h-5 text-[#00f2ff] mb-3" />
                  <h3 className="font-black uppercase text-sm mb-2">{s.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{s.text}</p>
                </div>
              );
            })}
          </div>
          <p className="text-gray-500 text-xs mt-4">Une fois installé, le jeu contre l&apos;IA fonctionne aussi hors ligne. Le duel en ligne demande une connexion.</p>
        </section>

        <section className="grid md:grid-cols-2 gap-4">
          <div className="flex items-start gap-3 p-5 rounded-2xl bg-[#00f2ff]/5 border border-[#00f2ff]/20">
            <ShieldCheck className="w-5 h-5 text-[#00f2ff] flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-black uppercase text-sm mb-2">Aucun argent réel</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Aucune partie ne se joue en argent, en crypto ou en NFT. Les cauris sont gratuits : ils ne s&apos;achètent pas, ne s&apos;échangent pas entre joueurs et n&apos;ont aucune valeur monétaire.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-5 rounded-2xl bg-[#bc13fe]/5 border border-[#bc13fe]/20">
            <Swords className="w-5 h-5 text-[#bc13fe] flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-black uppercase text-sm mb-2">Tournois gratuits</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Inclus dans l&apos;édition complète : inscription gratuite, sans droit d&apos;inscription. Les lots éventuels sont offerts par des partenaires, jamais financés par les joueurs.
              </p>
            </div>
          </div>
        </section>

        <section className="grid md:grid-cols-2 gap-4 items-start">
          <TournamentPanel />
          <GameNewsSignup />
        </section>
      </main>
      <LegalFooter />
    </div>
  );
}
