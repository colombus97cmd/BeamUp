import type { Metadata } from 'next';
import Navigation from '../../components/Navigation';
import LegalFooter from '../../components/LegalFooter';

export const metadata: Metadata = {
  title: 'Politique de confidentialité | BeamUp',
  description: 'Données collectées par BeamUp, finalités, durées de conservation, prestataires et droits (RGPD).',
};

// Politique de confidentialité (RGPD). Tenir à jour à chaque nouvelle collecte ou nouveau prestataire.
const POLICY_VERSION = '2026-10-12';

const SECTIONS: { title: string; items: string[] }[] = [
  {
    title: 'Responsable du traitement',
    items: ['David Colombo, éditeur de BeamUp — Beam-up.beautifullearthcorp@outlook.fr.'],
  },
  {
    title: 'Ce que nous collectons, et pourquoi',
    items: [
      'Adresse de wallet : votre identité sur BeamUp (publication, achat, pourboire, commentaire, inscription). Elle est publique sur la blockchain. Les signatures que vous donnez servent seulement à prouver que le wallet est à vous ; elles ne déclenchent aucune transaction.',
      'Mail, pseudo Discord et pseudo (news, tournois) : uniquement si vous les donnez, pour vous envoyer les news, vos appariements et les résultats de tournoi. Base légale : votre consentement (news) ou l’exécution de votre inscription (tournoi).',
      'Commentaires : publiés sur la blockchain, donc publics et permanents. Un commentaire masqué par la modération reste inscrit sur la blockchain mais n’est plus affiché sur BeamUp.',
      'Déclarations de publication (acceptation des conditions, adhésion à la Sacem) et liens externes de vos œuvres : pour gérer les droits et afficher vos liens.',
      'Statistiques de lecture : compteurs de vues et de lectures complètes par œuvre. Pour éviter les doubles comptes, un identifiant pseudonyme (empreinte de l’adresse IP et du navigateur, non réversible) est conservé 24 heures au plus.',
      'Adresse IP : utilisée quelques minutes, au plus 24 heures, pour limiter les abus (envois répétés, robots).',
      'Parties de tournoi : pseudo, résultats et liste des coups, pour le classement, les litiges et le contrôle du fair-play.',
    ],
  },
  {
    title: 'Modération et agents IA',
    items: [
      'Le texte des commentaires et des pseudos est analysé par un agent de modération (API Claude d’Anthropic) qui conseille avant l’envoi et peut masquer un contenu contraire à la charte. Les décisions importantes sont vérifiables et réversibles par l’équipe. Le code des jeux soumis est relu de la même façon.',
      'Anthropic ne réutilise pas ces données pour entraîner ses modèles dans le cadre de son API commerciale.',
    ],
  },
  {
    title: 'Durées de conservation',
    items: [
      'Inscription à un tournoi sans abonnement aux news : coordonnées effacées 90 jours après l’inscription.',
      'Abonnement aux news : jusqu’à votre désinscription (lien dans chaque mail) ou votre demande d’effacement.',
      'Données de la blockchain (wallet, publications, achats, commentaires) : permanentes par nature ; BeamUp peut seulement cesser de les afficher.',
    ],
  },
  {
    title: 'Cookies et stockage local',
    items: [
      'BeamUp n’utilise ni publicité, ni outil de mesure d’audience, ni cookie de suivi : aucun bandeau de consentement n’est donc nécessaire.',
      'Le seul cookie est celui de session de la page d’administration, réservée à l’équipe (strictement nécessaire).',
      'Votre navigateur conserve localement quelques préférences (bibliothèque, progression de lecture, bandeaux masqués, progression dans les jeux). Elles ne quittent pas votre appareil.',
    ],
  },
  {
    title: 'Prestataires',
    items: [
      'Vercel (hébergement, États-Unis), Upstash (base de données), Pinata (stockage des fichiers des œuvres, y compris les fichiers privés des œuvres premium et des jeux, États-Unis), Resend (envoi des mails, serveurs en Irlande), Anthropic (modération, États-Unis), Discord (salon d’annonces), WalletConnect (connexion des wallets), PeerJS (mise en relation des joueurs ; les parties circulent ensuite directement entre les deux navigateurs, qui voient l’adresse IP l’un de l’autre).',
      'Les transferts hors de l’Union européenne reposent sur les garanties prévues par le RGPD (clauses contractuelles types ou cadre de protection des données UE–États-Unis).',
    ],
  },
  {
    title: 'Vos droits',
    items: [
      'Accès, rectification, effacement, limitation, opposition et portabilité : écrivez à Beam-up.beautifullearthcorp@outlook.fr. Les abonnés aux news peuvent aussi supprimer leurs données directement depuis la page Jeux.',
      'Vous pouvez introduire une réclamation auprès de la CNIL (cnil.fr).',
    ],
  },
];

export default function Confidentialite() {
  return (
    <div className="min-h-screen bg-[#020202] text-white">
      <Navigation />
      <main className="max-w-3xl mx-auto px-4 py-12 md:py-20 space-y-8">
        <section>
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#00f2ff] font-black mb-3">Informations légales</p>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-6">Politique de confidentialité</h1>
          <p className="text-gray-300 text-base leading-relaxed">
            BeamUp collecte le moins de données possible. Version du {new Date(POLICY_VERSION).toLocaleDateString('fr-FR', { dateStyle: 'long' })}.
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
