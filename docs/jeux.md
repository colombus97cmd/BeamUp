# Jeux sur BeamUp — format « Jeu vidéo »

Un jeu web (HTML5, Unity WebGL, Godot…) est du code qui s'exécute chez le joueur. BeamUp le protège à trois niveaux :

1. **Vérification automatique** du zip déposé (`src/lib/games/inspect.ts`) : liste blanche d'extensions, contrôle du contenu réel de chaque fichier (un exécutable renommé en `.png` ou `.data` est refusé), refus des exécutables et archives imbriquées, des bombes zip et des chemins piégés (`../`), `index.html` obligatoire. Les motifs suspects (accès au wallet, minage, code caché, scripts externes…) sont signalés.
2. **Agent vérificateur** (`src/lib/games/review.ts`, Claude) : relit le code et donne un avis (sûr / à surveiller / dangereux). Il ne décide pas.
3. **Validation par un signataire du Safe** dans `/pilotage` → onglet **Jeux**. Seul un jeu approuvé peut être joué ; l'approbation peut être retirée à tout moment (effet immédiat).

Puis, à chaque partie, **l'isolement** : le jeu est servi depuis un **domaine séparé** (`GAMES_ORIGIN`), dans une iframe `sandbox`, sans accès aux cookies, au stockage ni à la session de BeamUp, sans popups, sans service worker, sans caméra, micro ni paiement. Le domaine des jeux ne sert aucune page ni API de BeamUp, et BeamUp ne sert jamais le code d'un jeu (`src/middleware.ts`).

## Parcours

| Étape | Qui | Où |
|---|---|---|
| Dépôt du zip (zone d'attente privée) | créateur | `/publish`, format « Jeu vidéo » |
| Inspection, découpage en fichiers privés + manifeste, avis de l'agent | serveur | `/api/games/submit` |
| Publication sur la blockchain (CID du manifeste, catégorie `Jeu`, premium ou non) | créateur | `/publish` (suite automatique) |
| Validation | signataire du Safe | `/pilotage` → Jeux |
| Partie : jeu gratuit → `/api/games/play` ; jeu premium → `/api/media` (achat vérifié sur la blockchain) | joueur | fil BeamUp |
| Fichiers servis à la demande, jeton signé valable 6 h | passerelle | `GAMES_ORIGIN/g/<jeton>/…` |

Pinata ne gère pas les dossiers sur son réseau privé : chaque fichier du jeu est stocké en privé et un manifeste relie chaque chemin à son fichier. Le zip déposé est supprimé après traitement.

## Mise en service

1. **Domaine des jeux** : Vercel → projet BeamUp → Settings → Domains → ajouter un domaine `*.vercel.app` libre, par exemple `beamup-jeux.vercel.app` (les domaines `vercel.app` sont des sites indépendants pour les navigateurs : aucun partage de cookies avec BeamUp).
2. Variables d'environnement :

| Variable | Rôle |
|---|---|
| `GAMES_ORIGIN` | Adresse du domaine des jeux, ex. `https://beamup-jeux.vercel.app` |
| `GAME_TOKEN_SECRET` | 32 caractères aléatoires minimum ; signe les jetons de partie |
| `PINATA_JWT`, `PINATA_GATEWAY` | Déjà utilisés pour les œuvres premium |
| `SITE_URL` | Adresse de BeamUp (seule page autorisée à afficher les jeux) |

3. Redéployer, puis publier Chains & Crowns (ci-dessous).

## Chains & Crowns — édition complète

- **Démo gratuite** : sur le portfolio uniquement (niveau Recrue, plateau Édition 1802, duels en ligne et tournois).
- **Édition complète** : sur BeamUp en œuvre premium (tous les niveaux, tous les plateaux).

Fabriquer le zip (il est écrit hors du portfolio pour ne jamais être mis en ligne gratuitement) :

```
powershell -ExecutionPolicy Bypass -File C:\Users\david\Documents\portfolio-2026\chains-and-crowns\tools\build-edition-complete.ps1
```

Puis `/publish` → « Jeu vidéo » → déposer `Documents\chains-and-crowns-builds\chains-and-crowns-edition-complete-AAAA-MM-JJ.zip` → activer Premium et fixer le prix → publier → valider dans `/pilotage` → Jeux → ajouter le numéro d'œuvre à `GAME_PRODUCTS`.

## Limites connues

- Aucune vérification n'offre une garantie absolue : la protection principale reste l'isolement, la vérification et la validation humaine la complètent.
- Un jeu web s'exécute dans le navigateur du joueur : un joueur technique peut toujours lire le code de l'édition qu'il a achetée.
- L'édition complète se joue dans BeamUp (le jeton de partie expire) : elle n'est pas installable hors ligne comme la démo.
- Les fichiers sont diffusés à travers une fonction Vercel (`maxDuration = 300`) : prévoir la consommation de bande passante pour les gros jeux Unity.
