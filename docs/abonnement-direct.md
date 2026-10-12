# Abonnements versés directement aux créateurs — document de conception

> **Statut** : proposition, rien n'est encore développé. À relire par un juriste (paiements, MiCA, droit de la consommation) et à faire auditer (contrat) avant toute mise en production.
> Rédigé le 12 octobre 2026.

## 1. Principe

L'argent d'un abonné va **directement de son wallet aux wallets des créateurs, dans une seule transaction**. BeamUp ne détient à aucun moment l'argent des créateurs : il n'y a pas de cagnotte, pas de compte intermédiaire, pas de retrait à organiser.

C'est la suite logique du contrat actuel (BeamUpV3), où les achats d'accès et les pourboires sont déjà payés aux créateurs sans intermédiaire.

## 2. Deux formules

| Formule | Pour qui | Destinataires du paiement |
|---|---|---|
| **Soutien mensuel** | un fan qui veut soutenir un artiste précis | le créateur choisi (moins la commission BeamUp) |
| **Pass BeamUp** | un fan qui veut tout le catalogue « inclus dans le pass » | les créateurs **que cet abonné a réellement lus, écoutés ou joués** le mois précédent, au prorata, moins la commission |

Le Pass suit un modèle « centré sur l'utilisateur » : chaque abonnement ne rémunère que les œuvres consultées par cet abonné. Ce modèle est plus juste que la répartition globale de Spotify (les gros catalogues ne captent pas l'argent des petits auditeurs). Il limite aussi la fraude : un fraudeur ne peut redistribuer que son propre abonnement.

## 3. Fonctionnement du Pass BeamUp

### 3.1 Adhésion des créateurs

Chaque créateur choisit, œuvre par œuvre, si elle est **incluse dans le pass**. Les ventes à l'unité (NFT d'accès) restent possibles en parallèle. Une œuvre incluse est accessible aux abonnés actifs sans achat.

### 3.2 Mesure de l'usage

- L'abonné ouvre une session en signant un message avec son wallet (comme pour les œuvres premium aujourd'hui).
- Seules les **consultations complètes** comptent : 80 % d'un morceau ou d'une vidéo, un chapitre lu jusqu'au bout, une partie de jeu d'au moins 5 minutes.
- Pondération par « temps d'attention », avec un plafond, pour qu'un titre de 2 minutes en boucle ne vaille pas plus qu'un court métrage de 20 minutes. La règle exacte est à fixer et à publier.
- Exclusions : les consultations de ses propres œuvres, celles des autres wallets d'un même créateur (si connus), les boucles anormales.

### 3.3 Renouvellement et répartition

1. En fin de mois, BeamUp calcule la répartition de l'abonné : liste des créateurs et montants.
   - Une part minimale par destinataire est fixée (par exemple 0,05 €) ; les parts plus petites sont regroupées sur les créateurs les plus consultés.
   - Au plus 20 destinataires par paiement.
2. BeamUp **signe** cette répartition (signature EIP-712) : abonné, période, jeton (EURI ou USDC), montant total, destinataires, montants, date d'expiration.
3. L'abonné renouvelle en un clic. Son wallet appelle le contrat de répartition, qui :
   - vérifie la signature de BeamUp et la date d'expiration ;
   - transfère chaque part **directement** du wallet de l'abonné vers chaque créateur, plus la commission vers BeamUp ;
   - enregistre la période payée (le pass est actif jusqu'à la fin du mois suivant) ;
   - ne conserve **aucun solde** (contrôle à la fin de chaque appel).
4. **Premier mois** (aucun historique) : répartition sur les œuvres « à la une » du mois, dont la liste est publiée à l'avance.
5. **Mois sans consultation** : même règle que le premier mois, ou proposer à l'abonné de ne pas renouveler. À trancher.

### 3.4 Pas de prélèvement automatique

En crypto, aucun prélèvement ne se fait sans action du payeur. Chaque mois, l'abonné confirme le paiement (rappel par mail). C'est volontaire : un prélèvement automatique demanderait une autorisation de dépense et un robot qui déclenche les paiements, ce qui se rapproche de la gestion de fonds.

## 4. Contrat de répartition (« SubscriptionSplitter »)

- **Séparé** de BeamUpV3 : aucune modification du contrat principal.
- **Non évolutif** (pas de proxy) : le code déployé est celui audité.
- **Propriétaire = Safe BeamUp**, avec des droits limités :
  - changer la clé de signature (en cas de compromission) ;
  - autoriser un jeton (EURI, USDC) ;
  - mettre en pause.
- **Garde-fous codés** :
  - commission plafonnée ;
  - 20 destinataires au maximum ;
  - une seule période payée par abonné et par mois ;
  - signature à usage unique ;
  - expiration courte (24 h) ;
  - aucun solde conservé.
- **Événements publics** (`Subscribed`, `Split`) : chaque créateur peut vérifier ce qu'il a reçu, et pourquoi.

Risque principal : la **clé de signature** de BeamUp. Volée, elle permettrait de proposer des répartitions vers d'autres wallets. Le paiement resterait toutefois initié et confirmé par chaque abonné dans son wallet, et les destinataires apparaîtraient en clair. Parades : clé dédiée, rotation par le Safe, vérification côté serveur que chaque destinataire est bien créateur d'une œuvre incluse, affichage de la répartition à l'abonné avant paiement.

## 5. Points juridiques à faire valider

1. **MiCA / prestataire de services sur crypto-actifs** : BeamUp ne garde ni ne transfère de fonds pour le compte d'autrui (c'est le wallet de l'abonné qui paie). Il faut confirmer que BeamUp ne fournit donc pas de service de transfert ou de conservation.
2. **Jetons de monnaie électronique** (EURI, USDC) : vérifier qu'un paiement de ce type n'entre pas dans le champ des services de paiement (DSP2), au vu des positions récentes de l'ABE.
3. **Droit de la consommation** : prix TTC affiché, information précontractuelle, droit de rétractation pour un contenu numérique (renonciation au début de l'accès), résiliation simple. Sans prélèvement automatique, ne pas renouveler suffit pour résilier.
4. **Sacem** : les œuvres de ses membres incluses dans le pass entrent dans le cadre d'une autorisation de la Sacem (déclarations déjà collectées à la publication).
5. **Fiscalité** : TVA sur la commission de BeamUp ; chaque créateur déclare ses revenus ; obligations européennes de déclaration des transactions en crypto (DAC8) à vérifier.
6. **Conditions des créateurs** : ajouter un article « inclusion dans le pass » (règle de mesure, pondération, retrait d'une œuvre).

## 6. Étapes proposées

| Étape | Contenu | Prérequis |
|---|---|---|
| 1 | Soutien mensuel à un créateur (paiement direct, renouvellement manuel) | peu de développement ; avis juridique rapide |
| 2 | Mesure de l'usage par wallet abonné, en test (sans paiement), tableau de bord dans `/pilotage` | — |
| 3 | Contrat de répartition sur réseau de test, interface d'abonnement | conception validée |
| 4 | Audit du contrat, avis juridique complet | budget audit |
| 5 | Lancement pilote : quelques créateurs volontaires, plafond d'abonnés | étapes 3 et 4 |

## 7. Questions ouvertes

- Prix du Pass (par exemple 4,99 € / 5 $), et commission de BeamUp sur le Pass (la même que sur les ventes : 5 % ?).
- Pondération entre formats (musique, vidéo, manga, jeux).
- Règle pour les mois sans consultation.
- Les créateurs non abonnés au pass peuvent-ils proposer le « soutien mensuel » seul ? (proposition : oui)
