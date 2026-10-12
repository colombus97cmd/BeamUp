import { NextResponse } from 'next/server';
import { redis, hasRedis } from '../../../../lib/redis';
import { adminIdentity } from '../../../../lib/security';
import { listSubmissions, getSubmission, saveSubmission, APPROVED_KEY, currentKey } from '../../../../lib/games/store';
import { logDecision } from '../../../../lib/moderationStore';
import { WINDOWS_KEY } from '../../../../lib/licence';

// Validation des jeux par les signataires du Safe (/pilotage, onglet Jeux).
//  GET  → 50 dernières soumissions avec le rapport de vérification ;
//  POST { cid, action: 'approve' | 'reject', note } → seul un jeu approuvé peut être joué sur BeamUp.
// Mise à jour approuvée : elle devient la version servie du jeu original ; retirée, l'original (ou la version précédente) revient.

export async function GET(req: Request) {
  if (!adminIdentity(req)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  if (!hasRedis()) return NextResponse.json({ submissions: [] });
  return NextResponse.json({ submissions: await listSubmissions(50) });
}

export async function POST(req: Request) {
  const admin = adminIdentity(req);
  if (!admin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const body = await req.json().catch(() => null);

  // Installateur Windows de Chains & Crowns (fichier privé déjà envoyé chez Pinata depuis /pilotage).
  if (body?.action === 'setWindows') {
    const cid = String(body.cid || '');
    if (!/^[a-zA-Z0-9]{20,100}$/.test(cid)) return NextResponse.json({ error: 'Fichier invalide' }, { status: 400 });
    const info = { cid, version: String(body.version || '').slice(0, 20) || '1.0.0', size: Number(body.size) || null, fileName: String(body.fileName || 'Chains-and-Crowns-Setup.exe').slice(0, 80), at: new Date().toISOString() };
    await redis([['SET', WINDOWS_KEY, JSON.stringify(info)]]);
    await logDecision({ type: 'jeu', action: 'version Windows', version: info.version, cid, by: admin });
    return NextResponse.json({ ok: true });
  }

  const cid = String(body?.cid || '');
  const sub = cid ? await getSubmission(cid) : null;
  if (!sub || !sub.cid) return NextResponse.json({ error: 'Jeu introuvable' }, { status: 404 });
  if (body.action !== 'approve' && body.action !== 'reject') return NextResponse.json({ error: 'Action inconnue' }, { status: 400 });

  const approve = body.action === 'approve';
  await redis([[approve ? 'SADD' : 'SREM', APPROVED_KEY, cid]]);
  if (sub.updateOf) {
    const key = currentKey(sub.updateOf);
    const [current, previous] = await redis([['GET', key], ['GET', `${key}:previous`]]);
    if (approve && current !== cid) await redis([['SET', key, cid], ...(current ? [['SET', `${key}:previous`, current]] : [['DEL', `${key}:previous`]])]);
    if (!approve && current === cid) await redis(previous ? [['SET', key, previous], ['DEL', `${key}:previous`]] : [['DEL', key]]);
  }
  await saveSubmission(cid, { ...sub, status: approve ? 'approuvé' : 'rejeté', decidedAt: new Date().toISOString(), decidedBy: admin, note: String(body.note || '').slice(0, 500) });
  await logDecision({ type: 'jeu', action: body.action, cid, title: sub.title, by: admin, reason: body.note || '' });
  return NextResponse.json({ ok: true });
}
