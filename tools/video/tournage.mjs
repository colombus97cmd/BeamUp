// Robot de tournage BeamUp — une vidéo promotionnelle verticale (1080 × 1920) par lancement.
//  1. demande à BeamUp les textes de la semaine (rédigés par l'agent promotionnel) ;
//  2. filme une partie de démonstration de Chains & Crowns (l'IA joue les deux camps) ;
//  3. monte la vidéo aux couleurs de BeamUp (anneau néon, comète, Geist ; titre en Permanent Marker) ;
//  4. l'envoie à BeamUp, qui la propose dans /pilotage → Promotion.
//
// Lancement : node tools/video/tournage.mjs        (depuis le dossier frontend)
//             node tools/video/tournage.mjs --sans-envoi   (tourne et monte, sans envoyer)
// Configuration : tools/video/.env.local (voir .env.example) — jamais commité : musique et secret restent sur ce PC.

import { readFileSync, existsSync, mkdirSync, copyFileSync, writeFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { filmerPartie } from './filmer.mjs';
import { monter, meilleurPassage } from './monter.mjs';

const ICI = dirname(fileURLToPath(import.meta.url));
const FRONTEND = join(ICI, '..', '..');
const CACHE = join(ICI, 'cache');
const SORTIE = join(ICI, 'sortie');
const SANS_ENVOI = process.argv.includes('--sans-envoi');
const MAX_OCTETS = 4 * 1024 * 1024;

const journal = (...m) => console.log(new Date().toLocaleTimeString('fr-FR'), '·', ...m);

// --- Configuration locale -------------------------------------------------------------------------
const fichierConfig = join(ICI, '.env.local');
if (!existsSync(fichierConfig)) throw new Error(`Configuration absente : copiez ${join(ICI, '.env.example')} en .env.local et complétez-la.`);
const config = Object.fromEntries(readFileSync(fichierConfig, 'utf8').split(/\r?\n/)
  .map((l) => l.trim()).filter((l) => l && !l.startsWith('#') && l.includes('='))
  .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
for (const cle of ['BEAMUP_URL', 'MUSIQUE', 'NAVIGATEUR', 'JEU_URL']) if (!config[cle]) throw new Error(`${cle} manquant dans .env.local`);
if (!SANS_ENVOI && !config.CRON_SECRET) throw new Error('CRON_SECRET manquant dans .env.local');

// --- Ressources de montage (polices, visuels) dans le cache ---------------------------------------
mkdirSync(join(CACHE, 'polices'), { recursive: true });
mkdirSync(join(CACHE, 'visuels'), { recursive: true });
mkdirSync(SORTIE, { recursive: true });
for (const f of ['Geist-Black.ttf', 'Geist-Bold.ttf', 'Geist-SemiBold.ttf']) {
  copyFileSync(join(FRONTEND, 'node_modules', 'geist', 'dist', 'fonts', 'geist-sans', f), join(CACHE, 'polices', f));
}
const marker = join(CACHE, 'polices', 'PermanentMarker-Regular.ttf');
if (!existsSync(marker)) {
  // Police libre (licence Apache 2.0), dépôt officiel de Google Fonts.
  const r = await fetch('https://raw.githubusercontent.com/google/fonts/main/apache/permanentmarker/PermanentMarker-Regular.ttf');
  if (!r.ok) throw new Error(`Téléchargement de Permanent Marker impossible (${r.status})`);
  writeFileSync(marker, Buffer.from(await r.arrayBuffer()));
}
copyFileSync(join(FRONTEND, 'public', 'og-image.png'), join(CACHE, 'visuels', 'anneau.png'));
copyFileSync(join(FRONTEND, 'public', 'icon-512x512.png'), join(CACHE, 'visuels', 'comete.png'));

// --- 1. Textes de la semaine ------------------------------------------------------------------------
let script = {
  captions: [
    ['La Résistance de 1802', 'contre l’Empire'],
    ['Affronte l’IA impériale', 'ou un joueur en ligne'],
    ['Édition complète', 'sur BeamUp'],
    ['Prix fixe : 4,99 € ou 5 $', 'Installable sur PC et mobile'],
  ],
  postText: "Chains & Crowns : un jeu d'échecs inspiré de la résistance guadeloupéenne de 1802.",
  hashtags: ['ChainsAndCrowns', 'Guadeloupe', 'JeuIndé', 'BeamUp'],
};
if (config.CRON_SECRET) {
  try {
    const r = await fetch(`${config.BEAMUP_URL}/api/agents/video`, { headers: { Authorization: `Bearer ${config.CRON_SECRET}` } });
    if (r.ok) { const d = await r.json(); script = d.script; journal(`Textes : ${d.source === 'agent' ? 'rédigés par l\'agent' : 'par défaut'}.`); }
    else journal(`Textes par défaut (BeamUp a répondu ${r.status}).`);
  } catch (e) { journal('Textes par défaut (BeamUp injoignable).'); }
}

// --- 2. Tournage ------------------------------------------------------------------------------------
const date = new Date().toISOString().slice(0, 10);
const brut = join(CACHE, 'partie.mp4');
journal('Tournage de la partie…');
await filmerPartie({ navigateur: config.NAVIGATEUR, url: config.JEU_URL, secondes: 46, sortie: brut, travail: CACHE });

// --- 3. Montage -------------------------------------------------------------------------------------
const debutMusique = meilleurPassage(config.MUSIQUE, 45);
journal(`Montage (musique à partir de ${debutMusique} s)…`);
let finale = join(SORTIE, `chains-crowns-${date}.mp4`);
monter({ dossier: CACHE, partie: 'partie.mp4', musique: config.MUSIQUE, debutMusique, sousTitres: script.captions, sortie: finale, crf: 21 });
if (statSync(finale).size > MAX_OCTETS) {
  journal('Vidéo trop lourde pour l\'envoi : nouvel encodage plus compressé…');
  monter({ dossier: CACHE, partie: 'partie.mp4', musique: config.MUSIQUE, debutMusique, sousTitres: script.captions, sortie: finale, crf: 26 });
}
journal(`Vidéo prête : ${finale} (${(statSync(finale).size / 1024 / 1024).toFixed(1)} Mo)`);

// --- 4. Envoi à BeamUp ------------------------------------------------------------------------------
if (SANS_ENVOI) { journal('Envoi désactivé (--sans-envoi).'); process.exit(0); }
const form = new FormData();
form.append('video', new Blob([readFileSync(finale)], { type: 'video/mp4' }), `chains-crowns-${date}.mp4`);
form.append('title', `Chains & Crowns — vidéo du ${new Date().toLocaleDateString('fr-FR')}`);
form.append('postText', script.postText);
form.append('hashtags', script.hashtags.join(' '));
const r = await fetch(`${config.BEAMUP_URL}/api/agents/video`, { method: 'POST', headers: { Authorization: `Bearer ${config.CRON_SECRET}` }, body: form });
const d = await r.json().catch(() => ({}));
if (!r.ok) throw new Error(`Envoi refusé (${r.status}) : ${d.error || ''}`);
journal(`Envoyée : à valider dans ${config.BEAMUP_URL}/pilotage (onglet Promotion).`);
