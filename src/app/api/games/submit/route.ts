import { NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { redis, hasRedis, rateLimited } from '../../../../lib/redis';
import { clientIp } from '../../../../lib/security';
import { getServerClient } from '../../../../lib/rpc';
import { SUPPORTED_CHAIN_IDS, DEFAULT_CHAIN } from '../../../../config/contracts';
import { buildGameSubmitMessage } from '../../../../services/gameSubmitMessage';
import { inspectZip, LIMITS } from '../../../../lib/games/inspect';
import { reviewGame } from '../../../../lib/games/review';
import { uploadPrivate, downloadPrivate, deletePrivateByCid } from '../../../../lib/games/pinata';
import { Manifest, Submission, manifestKey, saveSubmission, isApproved, SUBMISSIONS_KEY } from '../../../../lib/games/store';
import { mailAdmin, SITE_URL } from '../../../../lib/notify';

// Soumission d'un jeu (zip déjà déposé sur le réseau privé de Pinata par le créateur) :
//  1. inspection du zip (liste blanche, contenu réel des fichiers, bombes zip, chemins piégés) ;
//  2. si conforme : chaque fichier est stocké en privé, un manifeste privé les relie ; son CID identifie le jeu ;
//  3. l'agent vérificateur relit le code ; 4. le jeu attend la validation d'un signataire du Safe (/pilotage).
// Le zip déposé est supprimé dans tous les cas.

export const maxDuration = 300;

const SIGNATURE_MAX_AGE_MS = 10 * 60 * 1000;
const PARALLEL_UPLOADS = 4;

export async function POST(req: Request) {
  if (!hasRedis()) return NextResponse.json({ error: 'Stockage indisponible' }, { status: 503 });
  const body = await req.json().catch(() => null);
  const { zipCid, address, timestamp, signature } = body || {};
  const title = String(body?.title || '').trim().slice(0, 120) || 'Jeu sans titre';
  const chainId = SUPPORTED_CHAIN_IDS.includes(Number(body?.chainId)) ? Number(body.chainId) : DEFAULT_CHAIN;

  if (typeof zipCid !== 'string' || !/^[a-zA-Z0-9]{20,100}$/.test(zipCid)) return NextResponse.json({ error: 'Fichier invalide' }, { status: 400 });
  if (typeof address !== 'string' || !isAddress(address)) return NextResponse.json({ error: 'Wallet invalide' }, { status: 400 });
  if (typeof timestamp !== 'number' || Math.abs(Date.now() - timestamp) > SIGNATURE_MAX_AGE_MS) return NextResponse.json({ error: 'Signature expirée, réessayez' }, { status: 401 });
  if (await rateLimited(`game-submit:${clientIp(req)}`, 5, 3600) || await rateLimited(`game-submit:${address.toLowerCase()}`, 10, 86400)) {
    return NextResponse.json({ error: 'Trop de soumissions. Réessayez plus tard.' }, { status: 429 });
  }
  const valid = await getServerClient(chainId).verifyMessage({
    address: address as `0x${string}`,
    message: buildGameSubmitMessage(address, zipCid, timestamp),
    signature: signature as `0x${string}`,
  }).catch(() => false);
  if (!valid) return NextResponse.json({ error: 'Signature invalide' }, { status: 401 });

  const base = { zipCid, title, creator: address.toLowerCase(), createdAt: new Date().toISOString() };
  let zip: Uint8Array;
  try {
    zip = await downloadPrivate(zipCid, LIMITS.zipBytes);
  } catch (e: any) {
    return NextResponse.json({ error: e.message === 'Fichier trop lourd' ? 'Zip trop lourd (200 Mo maximum).' : 'Zip introuvable.' }, { status: 400 });
  }

  // 1. Inspection.
  const inspection = inspectZip(zip);
  if (!inspection.ok) {
    const id = `refus-${zipCid}`;
    await saveSubmission(id, { ...base, cid: '', status: 'refusé', errors: inspection.errors, findings: inspection.findings, externalDomains: inspection.externalDomains, files: inspection.files.length, totalBytes: inspection.totalBytes });
    await redis([['LPUSH', SUBMISSIONS_KEY, id], ['LTRIM', SUBMISSIONS_KEY, 0, 499]]);
    await deletePrivateByCid(zipCid).catch(() => {});
    return NextResponse.json({ status: 'refusé', errors: inspection.errors }, { status: 422 });
  }

  // 2. Fichiers privés + manifeste.
  const manifest: Manifest = { version: 1, entry: inspection.entry, files: {} };
  const queue = [...inspection.files];
  await Promise.all(Array.from({ length: PARALLEL_UPLOADS }, async () => {
    for (let f = queue.shift(); f; f = queue.shift()) {
      const cid = await uploadPrivate(f.bytes, `jeu:${f.path}`, { kind: 'jeu', creator: base.creator });
      manifest.files[f.path] = { cid, type: f.type, size: f.bytes.byteLength, ...(f.encoding ? { encoding: f.encoding } : {}) };
    }
  }));
  const ordered: Manifest = { ...manifest, files: Object.fromEntries(Object.entries(manifest.files).sort(([a], [b]) => a.localeCompare(b))) };
  const manifestJson = JSON.stringify(ordered);
  const cid = await uploadPrivate(new TextEncoder().encode(manifestJson), `jeu-manifeste:${title}.json`, { kind: 'jeu-manifeste', creator: base.creator });
  await redis([['SET', manifestKey(cid), manifestJson]]);

  // 3. Avis de l'agent vérificateur (n'empêche pas la soumission s'il échoue : un humain décide).
  const review = await reviewGame(inspection, title).catch((e) => ({ verdict: 'à_surveiller' as const, summary: `L'agent vérificateur n'a pas pu relire le code (${e?.message || 'erreur'}). Examen humain nécessaire.`, concerns: [] }));

  const already = await isApproved(cid);
  const submission: Submission = {
    ...base, cid, status: already ? 'approuvé' : 'en_attente', errors: [],
    findings: inspection.findings, externalDomains: inspection.externalDomains,
    files: inspection.files.length, totalBytes: inspection.totalBytes, review,
  };
  await saveSubmission(cid, submission);
  await redis([['LREM', SUBMISSIONS_KEY, 0, cid], ['LPUSH', SUBMISSIONS_KEY, cid], ['LTRIM', SUBMISSIONS_KEY, 0, 499]]);
  await deletePrivateByCid(zipCid).catch(() => {});

  if (!already) {
    await mailAdmin(
      `[BeamUp] Jeu à valider : ${title}`,
      `Créateur : ${base.creator}\nFichiers : ${inspection.files.length} (${Math.round(inspection.totalBytes / 1024)} Ko)\nAvis de l'agent : ${review?.verdict ?? 'non disponible'} — ${review?.summary ?? ''}\n\nÀ valider sur ${SITE_URL}/pilotage (onglet Jeux).`,
    ).catch(() => {});
  }
  return NextResponse.json({ status: submission.status, cid, review: review ? { verdict: review.verdict } : null, findings: inspection.findings.length });
}
