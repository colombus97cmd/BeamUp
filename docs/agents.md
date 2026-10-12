# Agents BeamUp — mise en service

Trois agents tournent sur Vercel (routes `/api/agents/*`, déclenchées par Vercel Cron, voir `vercel.json`) et utilisent Claude (`claude-opus-5-5`) via le SDK Anthropic. Ils sont pilotés depuis **`/pilotage`**, page réservée aux signataires du Safe `0x5DBE…6a1e` (2 signataires, seuil 1, sur les quatre réseaux).

| Agent | Quand | Ce qu'il fait seul | Ce qui attend un signataire |
|---|---|---|---|
| Tournois | lundi 13 h UTC (9 h en Guadeloupe) | analyse l'audience, crée et annonce un tournoi gratuit (Discord + mail), rappel la veille, archivage | annulation, lots des partenaires |
| Promotion | mardi 12 h UTC | recherche web (créateurs et événements, Antilles d'abord), rédige posts, newsletter, messages de démarchage, décisions | tout, sauf les posts Discord si « publication automatique » est cochée. Le démarchage s'envoie toujours à la main. |
| Modération | chaque jour 10 h UTC | balaie les nouveaux commentaires, masque ceux contraires à la charte (`/charte`) | rétablir ou masquer un commentaire |

Les trois agents sont **arrêtés par défaut**. On les active dans `/pilotage` → Vue d'ensemble.

## Variables d'environnement (Vercel → Settings → Environment Variables)

| Variable | Rôle |
|---|---|
| `ANTHROPIC_API_KEY` | Clé de l'API Claude (console.anthropic.com) |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | Upstash Redis (déjà utilisé pour les vues) |
| `CRON_SECRET` | Secret long et aléatoire ; Vercel l'envoie aux tâches planifiées |
| `ADMIN_SESSION_SECRET` | 32 caractères aléatoires minimum ; signe les sessions de `/pilotage` |
| `ADMIN_SECRET` | Facultatif : accès aux routes d'administration par script (`x-admin-secret`) |
| `UNSUBSCRIBE_SECRET` | Secret aléatoire ; signe les liens de désinscription |
| `RESEND_API_KEY`, `NEWS_FROM_EMAIL` | Envoi des mails (Resend, domaine vérifié), ex. `BeamUp <news@beamup.beautifull-earthcorp.tech>` |
| `ADMIN_EMAIL` | Reçoit les rapports des agents et les signalements |
| `DISCORD_WEBHOOK_URL` | Webhook du salon d'annonces (Discord → Paramètres du salon → Intégrations) |
| `NEXT_PUBLIC_DISCORD_INVITE_URL` | Lien d'invitation affiché sur `/jeux` |
| `GAME_PRODUCTS` | Œuvres premium du jeu, `réseau:œuvre:type`, ex. `56:42:jeu,56:43:pass-saison-1` |
| `SITE_URL` | Facultatif, par défaut `https://beamup.beautifull-earthcorp.tech` |

Générer un secret : `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

## Ordre de mise en service

1. Publier Chains & Crowns comme œuvre premium sur BeamUp (et un pass saison si voulu), noter les numéros d'œuvre, remplir `GAME_PRODUCTS`.
2. Créer les variables ci-dessus, redéployer.
3. Se connecter à `/pilotage` avec un wallet signataire du Safe, vérifier que la configuration est au vert.
4. Activer l'agent modérateur, puis lancer l'agent promotionnel une fois à la main et relire ses propositions.
5. Agent des tournois : le mode tournoi du jeu est prêt (voir « Déroulement d'un tournoi ») ; l'activer quand l'audience le permet, ou créer un tournoi à la main dans `/pilotage` → Tournois.

## Garde-fous légaux et RGPD codés en dur

- Tournois : inscription gratuite (aucun droit d'inscription), réservée aux possesseurs de l'édition complète ou d'un pass saison (achat vérifié par signature du wallet) ; lots uniquement ceux déclarés dans `/pilotage` (offerts par des partenaires) ; mentions légales ajoutées par le code à chaque annonce ; une annonce par semaine au maximum ; dates, places et cadence bornées.
- Contacts : consentement explicite, finalité unique (news et tournois), désinscription en un clic dans chaque mail, effacement sur demande, coordonnées des simples inscrits à un tournoi effacées après 90 jours.
- Promotion : jamais de NFT présenté comme placement ni de promesse de revenus ; démarchage limité aux organisations et pages professionnelles publiques, envoyé par un humain.
- Modération : rien n'est effacé (les commentaires sont sur la blockchain), seulement masqué sur BeamUp avec la raison ; signalement possible par tous ; dernier mot aux signataires.

## Coûts à prévoir

- Claude : modération en effort `low` (quelques centimes par jour au volume actuel), agent des tournois une fois par semaine, agent promotionnel une fois par semaine avec au plus 8 recherches web (10 $ les 1 000 recherches, plus les jetons).
- Resend : gratuit jusqu'à 3 000 mails par mois.
- Vercel : l'agent promotionnel peut durer plusieurs minutes (`maxDuration = 300`), ce qui demande le « Fluid compute » activé (par défaut sur les nouveaux projets).

## Déroulement d'un tournoi

Code : `src/lib/tournamentPlay.ts` (moteur), `src/app/api/tournaments/play` (API du jeu), `js/tournament.js` dans le jeu (portfolio).

1. **Inscription** sur `/jeux#tournoi` : gratuite, réservée aux possesseurs de l'édition complète (le joueur connecte le wallet de l'achat et signe un message, sans transaction ni frais ; un wallet = un joueur). Il reçoit son **lien personnel** (affiché, et envoyé par mail) vers la version web du jeu : `…/chains-and-crowns/index.html?tournoi=<jeton>`. Sans ce lien, la démo n'a pas accès aux tournois.
2. **Début** : à l'heure prévue, la première consultation (un joueur, la page Jeux ou `/pilotage`) apparie les inscrits en système suisse. Aucune tâche planifiée n'est nécessaire.
3. **Ronde** : chaque joueur ouvre son lien ; le jeu signale sa présence, affiche son adversaire et sa couleur, puis « Jouer ma partie » ouvre une salle pair-à-pair privée (identifiant secret connu des deux joueurs seulement), avec une pendule par joueur (cadence du tournoi).
4. **Résultat** : déclaré automatiquement par le jeu des deux joueurs, avec la liste des coups. Concordance → validé ; désaccord → **litige** (nulle provisoire, mail à l'administrateur, à trancher dans `/pilotage` → Tournois → « Arbitrer »).
5. **Forfait** : 10 minutes après le début de la ronde, un joueur présent dont l'adversaire n'est pas venu peut réclamer la victoire.
6. **Fin de ronde** : toutes les tables réglées, ou délai dépassé (2 × cadence + 20 min). Au délai, une déclaration unique est retenue ; un joueur absent perd par forfait et est retiré des rondes suivantes.
7. **Fin** : classement (points, puis départage Buchholz), annonce Discord, mail aux joueurs, mail à l'administrateur avec les gagnants et les lots à remettre. L'agent archive le tournoi le lundi suivant (ou bouton « Archiver »).

Nombre de joueurs impair : un joueur exempté par ronde (1 point, jamais deux fois le même). Le nombre de rondes est réduit si les inscrits sont trop peu nombreux pour éviter les revanches.

## Reste à faire

- Comptes officiels BeamUp sur les réseaux sociaux (l'agent rédige des posts X, Instagram, TikTok, LinkedIn et Facebook, publiés à la main).
