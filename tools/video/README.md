# Robot de tournage BeamUp

Produit chaque semaine une vidéo promotionnelle verticale (1080 × 1920, 45 s) pour TikTok, Reels, Shorts et Facebook :

1. **Textes** : demandés à BeamUp (`GET /api/agents/video`), rédigés par l'agent promotionnel ; textes par défaut si indisponible.
2. **Tournage** (`filmer.mjs`) : Edge piloté par puppeteer-core filme la démo de Chains & Crowns en mode démonstration (`?demo=auto`, l'IA joue les deux camps).
3. **Montage** (`monter.mjs`) : univers BeamUp (anneau néon, comète, cyan / violet, police Geist), titre en Permanent Marker, sous-titres, carte de fin, musique (passage le plus énergique choisi automatiquement).
4. **Envoi** (`POST /api/agents/video`) : la vidéo est publiée sur IPFS et proposée dans `/pilotage` → Promotion, où un signataire du Safe la valide.

## Pourquoi sur le PC et pas sur GitHub

Le dépôt est public : la musique et le secret ne doivent pas y entrer. Ils restent dans `tools/video/.env.local`, ignoré par git, sur le PC qui tourne les vidéos.

## Mise en place

1. Copier `.env.example` en `.env.local` et compléter (`CRON_SECRET` = celui du projet Vercel, chemin de la musique).
2. Prérequis : Node.js, ffmpeg dans le PATH, Microsoft Edge, `npm install` dans `frontend`.
3. Essai sans envoi : `node tools/video/tournage.mjs --sans-envoi` (vidéo dans `tools/video/sortie/`).
4. Tâche hebdomadaire : `powershell -ExecutionPolicy Bypass -File tools\video\planifier.ps1` (mardi 10 h ; rattrapage au démarrage si le PC était éteint).

## Règles

- Musique : uniquement des morceaux dont BeamUp ou le créateur détient les droits.
- Images : seulement Chains & Crowns et les œuvres de BeamUp ; une œuvre d'un autre créateur exige son accord écrit.
- Aucun wallet : le robot ne filme que des pages publiques et la démo gratuite.
- Logos d'établissements : non utilisés sans autorisation écrite ; l'origine du projet est mentionnée par écrit.
