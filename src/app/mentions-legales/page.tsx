import type { Metadata } from 'next';
import Link from 'next/link';
import Navigation from '../../components/Navigation';
import LegalFooter from '../../components/LegalFooter';

export const metadata: Metadata = {
  title: 'Mentions légales | BeamUp',
  description: 'Éditeur, responsable de la publication et hébergeur du site BeamUp.',
};

// Mentions exigées par l'article 6 de la loi n° 2004-575 du 21 juin 2004 (LCEN). Mettre à jour à la création de la société.
const SECTIONS: { title: string; items: string[] }[] = [
  {
    title: 'Éditeur du site',
    items: [
      'BeamUp est édité par David Colombo, en nom propre, fondateur de BeamUp (la société Beautiful Earth Corp est en cours de création).',
      'Adresse : Route de Dolé, Bains des Amours, Guadeloupe (France).',
      'Contact : Beam-up.beautifullearthcorp@outlook.fr',
    ],
  },
  {
    title: 'Responsable de la publication',
    items: ['David Colombo.'],
  },
  {
    title: 'Hébergement',
    items: [
      'Site et serveurs : Vercel Inc., 440 N Barranca Avenue #4133, Covina, CA 91723, États-Unis — vercel.com — privacy@vercel.com.',
      'Base de données : Upstash, Inc. (service Redis), via l’intégration Vercel.',
      'Fichiers des œuvres : Pinata Cloud, Inc. (pinata.cloud, États-Unis), qui conserve les fichiers nécessaires à la lecture des œuvres. Fichiers gratuits : diffusés sur le réseau public IPFS. Fichiers premium et jeux : stockés en privé et servis uniquement aux personnes autorisées, par des liens temporaires.',
      'Contrats et transactions : blockchains publiques BNB Chain, Arbitrum, Polygon et Ethereum. Ces registres sont publics et ne sont contrôlés par aucun hébergeur.',
    ],
  },
  {
    title: 'Propriété intellectuelle',
    items: [
      'Les œuvres publiées sur BeamUp appartiennent à leurs créateurs (voir les conditions des créateurs). La marque, le logo et le code de BeamUp appartiennent à son éditeur, sauf composants libres mentionnés dans le dépôt du projet.',
      'Pour signaler un contenu illicite ou une atteinte à vos droits : bouton « Signaler » sous chaque commentaire, ou le mail ci-dessus en précisant l’œuvre concernée.',
    ],
  },
];

export default function MentionsLegales() {
  return (
    <div className="min-h-screen bg-[#020202] text-white">
      <Navigation />
      <main className="max-w-3xl mx-auto px-4 py-12 md:py-20 space-y-8">
        <section>
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#00f2ff] font-black mb-3">Informations légales</p>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-6">Mentions légales</h1>
          <p className="text-gray-300 text-base leading-relaxed">
            Voir aussi la <Link href="/confidentialite" className="underline hover:text-white">politique de confidentialité</Link>, les <Link href="/conditions" className="underline hover:text-white">conditions des créateurs</Link> et la <Link href="/charte" className="underline hover:text-white">charte de la communauté</Link>.
          </p>
        </section>
        {SECTIONS.map((s) => (
          <section key={s.title} className="bg-white/5 border border-white/10 rounded-2xl p-5 md:p-6">
            <h2 className="font-black uppercase text-sm mb-4">{s.title}</h2>
            <ul className="space-y-2 text-gray-300 text-sm leading-relaxed list-disc pl-5">
              {s.items.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </section>
        ))}
      </main>
      <LegalFooter />
    </div>
  );
}
