import type { Metadata } from 'next';
import Link from 'next/link';
import Navigation from '../../components/Navigation';
import LegalFooter from '../../components/LegalFooter';
import { CREATOR_TERMS_VERSION } from '../../lib/workInfo';

export const metadata: Metadata = {
  title: 'Conditions des créateurs | BeamUp',
  description: 'Droits, revenus et responsabilités des créateurs qui publient sur BeamUp.',
};

// Conditions acceptées par chaque créateur à la publication (version enregistrée avec la déclaration de l'œuvre).
const SECTIONS: { title: string; items: string[] }[] = [
  {
    title: 'Vos droits sur vos œuvres',
    items: [
      'Vous restez propriétaire de vos œuvres. BeamUp ne reçoit qu\'une autorisation non exclusive de les héberger et de les diffuser sur la plateforme, selon les réglages que vous choisissez (gratuit ou premium).',
      'Vous garantissez détenir tous les droits nécessaires : composition, enregistrement, images, samples, voix, personnages, polices et code. Une collaboration demande l\'accord de chaque participant.',
      'Vous restez libre de diffuser vos œuvres ailleurs (plateformes de streaming, distributeurs, éditeurs).',
    ],
  },
  {
    title: 'Sacem et sociétés de gestion collective',
    items: [
      'Si vous êtes membre de la Sacem (ou d\'une autre société de gestion collective), c\'est elle qui gère vos droits d\'auteur, y compris sur BeamUp. Indiquez-le à la publication : BeamUp se charge de la démarche auprès d\'elle.',
      'BeamUp ne vous verse que les revenus de vos ventes, pourboires et reventes. Les droits d\'auteur collectés par la Sacem vous sont versés par elle.',
    ],
  },
  {
    title: 'Vos revenus',
    items: [
      'Les achats d\'accès et les pourboires sont payés directement dans votre wallet par le contrat BeamUp, sans intermédiaire ni délai de paiement. Vous percevez 95 % : la commission de la plateforme est fixée dans le contrat, plafonnée, et ne peut changer qu\'après un délai public.',
      'Vous fixez les royalties de revente de vos NFT d\'accès (10 % au maximum).',
      'BeamUp ne détient jamais l\'argent des créateurs. Vous déclarez vous-même vos revenus aux impôts et, le cas échéant, à l\'URSSAF.',
    ],
  },
  {
    title: 'Ce qui est publié sur la blockchain',
    items: [
      'La publication enregistre sur la blockchain votre adresse de wallet, le titre, le format et l\'identifiant du fichier. Ces informations sont publiques et permanentes.',
      'Les fichiers gratuits sont stockés sur IPFS, réseau public : une copie peut subsister même après masquage. Les fichiers premium sont stockés en privé et ne sont servis qu\'aux détenteurs de l\'accès.',
      'Une œuvre peut être masquée sur BeamUp à votre demande ou en cas de contenu illicite.',
    ],
  },
  {
    title: 'Contenus et jeux',
    items: [
      'La charte de la communauté s\'applique aux œuvres comme aux commentaires. Les contenus illicites (incitation à la haine, atteinte aux mineurs, contrefaçon, données personnelles d\'autrui…) sont rendus inaccessibles dès signalement.',
      'Les jeux sont inspectés automatiquement, relus par un agent de vérification et validés par l\'équipe avant d\'être jouables. Ils tournent isolés, sans accès aux wallets des joueurs.',
      'Les mises à jour d\'un jeu suivent la même vérification et conservent les achats existants.',
    ],
  },
  {
    title: 'Promotion et tournois',
    items: [
      'BeamUp peut présenter vos œuvres publiques dans sa promotion (posts, vidéos, newsletter) en vous citant. Vous pouvez le refuser en écrivant à l\'adresse ci-dessous.',
      'Les tournois de jeux sont gratuits, sans mise ni argent réel ; les lots éventuels sont offerts par des partenaires.',
    ],
  },
];

export default function Conditions() {
  return (
    <div className="min-h-screen bg-[#020202] text-white">
      <Navigation />
      <main className="max-w-3xl mx-auto px-4 py-12 md:py-20 space-y-8">
        <section>
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#00f2ff] font-black mb-3">Créateurs</p>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-6">Conditions des créateurs</h1>
          <p className="text-gray-300 text-base leading-relaxed">
            En publiant sur BeamUp, vous acceptez ces conditions ainsi que la <Link href="/charte" className="underline hover:text-white">charte de la communauté</Link>. Version du {new Date(CREATOR_TERMS_VERSION).toLocaleDateString('fr-FR', { dateStyle: 'long' })}.
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
        <p className="text-sm text-gray-400">Questions, retrait d&apos;une œuvre, refus de la promotion : <a className="underline hover:text-white" href="mailto:Beam-up.beautifullearthcorp@outlook.fr">Beam-up.beautifullearthcorp@outlook.fr</a></p>
      </main>
      <LegalFooter />
    </div>
  );
}
