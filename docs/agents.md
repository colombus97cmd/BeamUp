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
5. Activer l'agent des tournois **seulement quand le mode tournoi du jeu sera prêt** (voir « Reste à faire »).

## Garde-fous légaux et RGPD codés en dur

- Tournois : inscription gratuite et ouverte à tous, aucun achat requis ; lots uniquement ceux déclarés dans `/pilotage` (offerts par des partenaires) ; mentions légales ajoutées par le code à chaque annonce ; une annonce par semaine au maximum ; dates, places et cadence bornées.
- Contacts : consentement explicite, finalité unique (news et tournois), désinscription en un clic dans chaque mail, effacement sur demande, coordonnées des simples inscrits à un tournoi effacées après 90 jours.
- Promotion : jamais de NFT présenté comme placement ni de promesse de revenus ; démarchage limité aux organisations et pages professionnelles publiques, envoyé par un humain.
- Modération : rien n'est effacé (les commentaires sont sur la blockchain), seulement masqué sur BeamUp avec la raison ; signalement possible par tous ; dernier mot aux signataires.

## Coûts à prévoir

- Claude : modération en effort `low` (quelques centimes par jour au volume actuel), agent des tournois une fois par semaine, agent promotionnel une fois par semaine avec au plus 8 recherches web (10 $ les 1 000 recherches, plus les jetons).
- Resend : gratuit jusqu'à 3 000 mails par mois.
- Vercel : l'agent promotionnel peut durer plusieurs minutes (`maxDuration = 300`), ce qui demande le « Fluid compute » activé (par défaut sur les nouveaux projets).

## Reste à faire

- **Mode tournoi dans le jeu** : salles privées par appariement, saisie et contrôle des résultats, appariements suisses par ronde. Tant qu'il n'existe pas, l'agent peut annoncer un tournoi mais rien ne permet de le jouer : laisser l'agent des tournois arrêté.
- Comptes officiels BeamUp sur les réseaux sociaux (l'agent rédige des posts X, Instagram, TikTok, LinkedIn et Facebook, publiés à la main).
