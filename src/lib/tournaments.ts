import { redis } from './redis';

// Tournois des jeux BeamUp.
// Règles légales codées en dur (compétitions de jeux vidéo, art. L321-8 et suivants du Code de la sécurité intérieure) :
//  - inscription GRATUITE (aucun droit d'inscription), réservée aux possesseurs de l'édition complète ou d'un pass saison ;
//    le prix d'acquisition du jeu n'est pas un « sacrifice financier » pour une compétition en ligne ;
//  - lots uniquement offerts par des partenaires et déclarés par l'administrateur (PRIZES_KEY), jamais financés par les joueurs ;
//  - aucun lot en cauris, en crypto ou en NFT revendable gagné en jouant.

export interface Prize { id: string; label: string; sponsor: string }

export interface Tournament {
  id: string;
  game: string;
  name: string;
  startsAt: string;        // ISO
  format: 'suisse' | 'elimination';
  rounds: number;
  timeControlMinutes: number;
  capacity: number;
  description: string;
  prizes: Prize[];
  createdAt: string;
  createdBy: 'agent' | 'admin';
  reminded?: boolean;
}

export const CURRENT_KEY = 'beam:v1:tournament:current';
export const HISTORY_KEY = 'beam:v1:tournament:history';
export const PRIZES_KEY = 'beam:v1:tournament:prizes';
export const LAST_ANNOUNCE_KEY = 'beam:v1:tournament:lastAnnounce';
export const REPORTS_KEY = 'beam:v1:agent:tournament:reports';
export const playersKey = (id: string) => `beam:v1:tournament:${id}:players`;

export const LEGAL_FOOTER =
  'Inscription gratuite, réservée aux joueurs de l’édition complète. Les lots éventuels sont offerts par nos partenaires. Aucune mise, aucun argent réel.';

export async function currentTournament(): Promise<Tournament | null> {
  const [raw] = await redis([['GET', CURRENT_KEY]]);
  return raw ? (JSON.parse(raw) as Tournament) : null;
}

export async function saveCurrent(t: Tournament) {
  await redis([['SET', CURRENT_KEY, JSON.stringify(t)]]);
}

export async function sponsorPrizes(): Promise<Prize[]> {
  const [raw] = await redis([['GET', PRIZES_KEY]]);
  try { return raw ? (JSON.parse(raw) as Prize[]) : []; } catch { return []; }
}

export async function playerIds(id: string): Promise<string[]> {
  const [ids] = await redis([['SMEMBERS', playersKey(id)]]);
  return ids || [];
}

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('fr-FR', { timeZone: 'America/Guadeloupe', dateStyle: 'full', timeStyle: 'short' }) + ' (heure de Guadeloupe)';

/** Texte d'annonce complet : message rédigé par l'agent + informations pratiques et mentions légales ajoutées par le code. */
export function announcement(t: Tournament, body: string, siteUrl: string) {
  const prizes = t.prizes.length ? `\nLots : ${t.prizes.map((p) => `${p.label} (offert par ${p.sponsor})`).join(', ')}.` : '';
  return `${body.trim()}\n\n${t.name} — ${formatDate(t.startsAt)}\nFormat : ${t.format === 'suisse' ? `système suisse, ${t.rounds} rondes` : 'élimination directe'}, ${t.timeControlMinutes} min par joueur. Places : ${t.capacity}.${prizes}\nInscription : ${siteUrl}/jeux#tournoi\n\n${LEGAL_FOOTER}`;
}
