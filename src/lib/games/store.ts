import { redis } from '../redis';
import type { Finding } from './inspect';

// Jeux soumis : manifestes (chemin → fichier privé), dossiers de vérification et liste des jeux approuvés.
// Le CID enregistré sur la blockchain pour une œuvre « Jeu » est celui du manifeste.

export interface ManifestFile { cid: string; type: string; size: number; encoding?: 'gzip' | 'br' }
export interface Manifest { version: 1; entry: string; files: Record<string, ManifestFile> }

export type GameStatus = 'refusé' | 'en_attente' | 'approuvé' | 'rejeté';

export interface Review { verdict: 'sûr' | 'à_surveiller' | 'dangereux'; summary: string; concerns: { file: string; issue: string; severity: string }[] }

export interface Submission {
  cid: string;                 // CID du manifeste (vide si refus automatique)
  zipCid: string;
  title: string;
  creator: string;
  status: GameStatus;
  createdAt: string;
  decidedAt?: string;
  decidedBy?: string;
  note?: string;
  errors: string[];            // refus automatiques
  findings: Finding[];         // motifs à examiner
  externalDomains: string[];
  files: number;
  totalBytes: number;
  review?: Review;             // avis de l'agent vérificateur
}

export const manifestKey = (cid: string) => `beam:v1:game:manifest:${cid}`;
export const submissionKey = (id: string) => `beam:v1:game:sub:${id}`;
export const SUBMISSIONS_KEY = 'beam:v1:game:subs';     // liste des identifiants, plus récents d'abord
export const APPROVED_KEY = 'beam:v1:game:approved';    // CID de manifeste approuvés

export async function getManifest(cid: string): Promise<Manifest | null> {
  const [raw] = await redis([['GET', manifestKey(cid)]]);
  return raw ? (JSON.parse(raw) as Manifest) : null;
}

export async function isApproved(cid: string): Promise<boolean> {
  const [is] = await redis([['SISMEMBER', APPROVED_KEY, cid]]);
  return Number(is) === 1;
}

export async function saveSubmission(id: string, s: Submission) {
  await redis([['SET', submissionKey(id), JSON.stringify(s)]]);
}

export async function getSubmission(id: string): Promise<Submission | null> {
  const [raw] = await redis([['GET', submissionKey(id)]]);
  return raw ? (JSON.parse(raw) as Submission) : null;
}

export async function listSubmissions(limit = 50): Promise<(Submission & { id: string })[]> {
  const [ids] = await redis([['LRANGE', SUBMISSIONS_KEY, 0, limit - 1]]);
  if (!ids?.length) return [];
  const rows = await redis((ids as string[]).map((id) => ['GET', submissionKey(id)]));
  return (ids as string[]).map((id, i) => (rows[i] ? { id, ...(JSON.parse(rows[i]) as Submission) } : null)).filter(Boolean) as (Submission & { id: string })[];
}
