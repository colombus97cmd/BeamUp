import type { Metadata } from 'next';
import Link from 'next/link';
import Navigation from '../../components/Navigation';

export const metadata: Metadata = {
  title: 'Règlement des tournois | BeamUp',
  description: 'Règlement des tournois Chains & Crowns organisés sur BeamUp : inscription gratuite, système suisse, fair-play, lots offerts par des partenaires.',
};

// Règlement accessible gratuitement à tous les participants (pas de dépôt obligatoire depuis la loi du 17 mars 2014).
// Chaque modification est horodatée par l'historique git du dépôt BeamUp ; changer RULES_VERSION à chaque modification.
const RULES_VERSION = '2026-10-12';

const ARTICLES: { title: string; items: string[] }[] = [
  {
    title: 'Article 1 — Organisateur',
    items: [
      'Les tournois sont organisés par BeamUp (projet de David Colombo), sur la page Jeux de BeamUp. Contact : Beam-up.beautifullearthcorp@outlook.fr.',
      'Les dates, la cadence, le nombre de rondes, le nombre de places et les lots éventuels de chaque tournoi sont annoncés sur la page Jeux, sur Discord et par mail aux abonnés des news.',
    ],
  },
  {
    title: 'Article 2 — Participation',
    items: [
      'Les tournois sont réservés aux possesseurs de l\'édition complète de Chains & Crowns ou d\'un pass saison sur BeamUp. L\'achat est vérifié par une signature du wallet utilisé pour l\'achat, sans transaction ni frais.',
      'L\'inscription est gratuite : aucun droit d\'inscription, aucune mise, en euros, en crypto-actifs, en NFT ou en cauris.',
      'Un seul wallet par personne. Un pseudo contraire à la charte de la communauté est refusé.',
      'Les mineurs participent avec l\'autorisation d\'un représentant légal. Pour un tournoi doté de lots, l\'organisateur peut demander cette autorisation par écrit avant de remettre un lot.',
    ],
  },
  {
    title: 'Article 3 — Déroulement',
    items: [
      'Système suisse : à chaque ronde, les joueurs sont appariés selon leurs points, sans rencontrer deux fois le même adversaire lorsque c\'est possible. Les couleurs sont équilibrées.',
      'En cas de nombre impair de joueurs, un joueur est exempté à chaque ronde et reçoit 1 point (jamais deux fois le même joueur lorsque c\'est possible).',
      'Les parties se jouent dans le jeu, avec le lien personnel reçu à l\'inscription, dans une salle privée entre les deux joueurs, avec une pendule par joueur selon la cadence annoncée. Le temps écoulé fait perdre la partie.',
      'Points : victoire 1, nulle ½, défaite 0. Départage : somme des points des adversaires rencontrés (Buchholz), puis tirage au sort.',
      'Le nombre de rondes peut être réduit si les inscrits sont trop peu nombreux.',
    ],
  },
  {
    title: 'Article 4 — Résultats, absences et litiges',
    items: [
      'Le résultat est déclaré automatiquement par le jeu des deux joueurs, avec la liste des coups. Deux déclarations concordantes valident la partie.',
      'Un joueur absent 10 minutes après le début de la ronde peut perdre par forfait, à la demande de son adversaire présent. Un joueur absent à une ronde ne participe pas aux rondes suivantes.',
      'À la fin du délai de la ronde (deux fois la cadence plus 20 minutes), une déclaration unique est retenue ; une partie sans déclaration est réglée selon la présence des joueurs.',
      'En cas de déclarations contradictoires, la partie est comptée nulle à titre provisoire et l\'organisateur tranche, au vu de la liste des coups. Sa décision est définitive.',
      'Une déconnexion pendant la partie vaut abandon.',
    ],
  },
  {
    title: 'Article 5 — Fair-play',
    items: [
      'Interdits pendant les parties : l\'aide d\'un moteur d\'échecs, d\'une autre personne ou de tout logiciel d\'analyse, le partage du lien personnel, l\'utilisation de plusieurs wallets.',
      'L\'organisateur peut contrôler les parties (comparaison des coups avec un moteur, échange avec le joueur) et disqualifier un joueur, sans attribution de lot.',
    ],
  },
  {
    title: 'Article 6 — Lots',
    items: [
      'Les lots éventuels sont offerts par des partenaires, annoncés avant le tournoi et jamais financés par les joueurs. Aucun lot n\'est versé en argent, en crypto-actifs, en NFT revendable ou en cauris.',
      'Le lot est remis après vérification du fair-play et des conditions de participation (article 2). Un lot non réclamé dans les 30 jours suivant le tournoi est perdu.',
    ],
  },
  {
    title: 'Article 7 — Données personnelles',
    items: [
      'Sont collectés : le pseudo, l\'adresse du wallet et un mail ou un pseudo Discord, uniquement pour organiser le tournoi et prévenir les joueurs. Les coordonnées sont effacées 90 jours après l\'inscription, sauf abonnement volontaire aux news.',
      'Les pseudos et le classement sont publics. Votre adversaire voit votre pseudo ; comme dans tout jeu pair-à-pair, votre adresse IP lui est techniquement accessible pendant la partie.',
      'Accès, rectification et effacement : à l\'adresse de l\'article 1.',
    ],
  },
  {
    title: 'Article 8 — Acceptation et modifications',
    items: [
      'L\'inscription vaut acceptation du présent règlement et de la charte de la communauté.',
      'L\'organisateur peut annuler ou reporter un tournoi en cas de force majeure ou de problème technique ; les inscrits sont prévenus par mail et sur Discord. Toute modification du règlement est publiée sur cette page avec sa date.',
    ],
  },
];

export default function ReglementTournois() {
  return (
    <div className="min-h-screen bg-[#020202] text-white">
      <Navigation />
      <main className="max-w-3xl mx-auto px-4 py-12 md:py-20 space-y-8">
        <section>
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#bc13fe] font-black mb-3">Jeux</p>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-6">Règlement des tournois</h1>
          <p className="text-gray-300 text-base leading-relaxed">
            Tournois de Chains &amp; Crowns organisés sur BeamUp. Version du {new Date(RULES_VERSION).toLocaleDateString('fr-FR', { dateStyle: 'long' })}.
            Voir aussi la <Link href="/charte" className="underline hover:text-white">charte de la communauté</Link>.
          </p>
        </section>
        {ARTICLES.map((a) => (
          <section key={a.title} className="bg-white/5 border border-white/10 rounded-2xl p-5 md:p-6">
            <h2 className="font-black uppercase text-sm mb-4">{a.title}</h2>
            <ul className="space-y-2 text-gray-300 text-sm leading-relaxed list-disc pl-5">
              {a.items.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </section>
        ))}
      </main>
    </div>
  );
}
