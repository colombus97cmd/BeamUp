import { redis } from '../redis';
import type { Finding } from './inspect';

// Jeux soumis : manifestes (chemin → fichier privé), dossiers de vérification et liste des jeux approuvés.
// Le CID enregistré sur la blockchain pour une œuvre « Jeu » est celui du manifeste.
// Mises à jour : le créateur soumet un nouveau zip pour un jeu approuvé ; une fois la mise à jour approuvée,
// BeamUp sert ce nouveau manifeste à la place de l'original (le CID sur la blockchain, donc les achats, ne changent pas).

export interface ManifestFile { cid: string; type: string; size: number; encoding?: 'gzip' | 'br' }
// Version 1 (premiers dépôts) : Pinata a rangé chaque fichier d'un sous-dossier dans un dossier portant son chemin ;
// le CID enregistré est celui de ce dossier, le fichier se lit à l'intérieur (voir innerName). Version 2 : CID du fichier.
export interface Manifest { version: 1 | 2; entry: string; files: Record<string, ManifestFile> }

/** Nom du fichier à lire à l'intérieur du CID (manifestes version 1, fichiers de sous-dossier), sinon undefined. */
export const innerName = (manifest: Manifest, path: string) =>
  manifest.version === 1 && path.includes('/') ? path.split('/').pop() : undefined;

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
  updateOf?: string;           // mise à jour : CID du manifeste original (celui de la blockchain)
}

export const manifestKey = (cid: string) => `beam:v1:game:manifest:${cid}`;
export const submissionKey = (id: string) => `beam:v1:game:sub:${id}`;
export const SUBMISSIONS_KEY = 'beam:v1:game:subs';     // liste des identifiants, plus récents d'abord
export const APPROVED_KEY = 'beam:v1:game:approved';    // CID de manifeste approuvés
export const currentKey = (originalCid: string) => `beam:v1:game:current:${originalCid}`; // version servie

/** Manifeste à servir pour un jeu : la dernière mise à jour approuvée, sinon l'original. */
export async function currentVersion(originalCid: string): Promise<string> {
  const [cur] = await redis([['GET', currentKey(originalCid)]]);
  return cur && (await isApproved(cur)) ? cur : originalCid;
}

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
