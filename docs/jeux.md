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

## Prix fixes : édition euro et édition dollar

Le prix d'une œuvre est fixé à la publication, dans la monnaie choisie, et ne peut plus changer. Pour un prix stable, on publie le même jeu (même zip, donc même manifeste et une seule validation) en deux éditions :

| Édition | Réseau | Monnaie | Pour qui |
|---|---|---|---|
| Euro | BNB Chain | EURI (Eurite, Banking Circle, autorisé MiCA), `0x9d1A7A3191102e9F900Faa10540837ba84dCBAE7` | Europe et territoires en euro (Antilles, Guyane, Réunion…) |
| Dollar | Arbitrum | USDC natif de Circle (autorisé MiCA), `0xaf88d065e77c8cC2239327C5EDb3A432268e5831` | reste du monde |

Le fil n'affiche qu'une édition par jeu : celle que le visiteur possède, sinon celle de sa monnaie (fuseau horaire de l'appareil). L'USDT n'est pas utilisé : il n'est pas autorisé sous MiCA. Un faux « Eurite » circule sur BNB Chain (`0xc2ad…C47F`) : ne jamais l'utiliser.

### Autoriser les stablecoins (une fois, par un signataire du Safe)

Les contrats BeamUp n'acceptent un jeton qu'après `setAllowedToken`. Les transactions sont prêtes dans `docs/safe/` :

1. app.safe.global → Safe `0x5DBE…6a1e` → choisir le réseau (BNB Chain pour l'EURI, Arbitrum pour l'USDC).
2. Apps → **Transaction Builder** → glisser le fichier `bnb-autoriser-EURI.json` (ou `arbitrum-autoriser-USDC.json`).
3. Vérifier : destinataire = contrat BeamUp du réseau, méthode `setAllowedToken`, jeton = adresse ci-dessus, `allowed` = true. Créer le lot, signer, exécuter (frais de quelques centimes).
4. L'option « Euro (prix fixe) » ou « Dollar (prix fixe) » apparaît alors dans `/publish`.

`polygon-autoriser-USDC.json` est fourni si l'on veut aussi accepter l'USDC sur Polygon.

## Mettre à jour un jeu publié

Le CID enregistré sur la blockchain ne change jamais. Republier le zip créerait donc une autre œuvre, et les achats existants ne s'appliqueraient pas à la nouvelle version. Pour mettre à jour un jeu, il faut passer par `/pilotage` :

1. Ouvrir `/pilotage` → **Jeux** → **Historique**. Sur la carte du jeu approuvé, cliquer **Mettre à jour (nouveau zip)** et choisir le zip. Le wallet signe deux fois : une fois pour l'envoi, une fois pour la soumission. Ces signatures ne déclenchent aucune transaction.
2. La mise à jour passe par la même vérification qu'un nouveau jeu : inspection, puis relecture par l'agent. Elle apparaît ensuite dans **À valider** avec le badge « mise à jour ».
3. Une fois **approuvée**, elle devient la version servie, pour toutes les éditions qui partagent ce manifeste (euro et dollar). Les acheteurs y ont accès immédiatement.
4. Si la mise à jour est **retirée**, la version précédente revient.

Seuls le créateur du jeu et les signataires du Safe peuvent soumettre une mise à jour. La correspondance entre le manifeste original et la version servie est stockée dans Redis : `beam:v1:game:current:<cid original>`.
