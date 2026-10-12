import { NextResponse } from 'next/server';
import { redis, hasRedis, hashToObject } from '../../../../lib/redis';
import { isAdmin, adminIdentity } from '../../../../lib/security';
import { contactKey } from '../../../../lib/contacts';
import { sendMails, postDiscord, SITE_URL } from '../../../../lib/notify';
import { logDecision } from '../../../../lib/moderationStore';
import {
  Tournament, currentTournament, saveCurrent, sponsorPrizes, playerIds, announcement, Prize,
  PRIZES_KEY, REPORTS_KEY, CURRENT_KEY, LAST_ANNOUNCE_KEY, HISTORY_KEY, playersKey,
} from '../../../../lib/tournaments';
import { advance, arbitrate, standings, roundKey, playKey, type Result } from '../../../../lib/tournamentPlay';

// Administration des tournois (session de pilotage ou en-tête x-admin-secret) :
//  GET  → tournoi en cours avec son déroulement (rondes, tables, déclarations des joueurs), lots, rapports de l'agent ;
//  POST { action: 'create', ... } → crée et annonce un tournoi (système suisse), comme le ferait l'agent ;
//  POST { action: 'arbitrate', round, board, result } → tranche une partie (litige, triche constatée) ;
//  POST { action: 'setPrizes', prizes: [{ id, label, sponsor }] } → lots offerts par des partenaires, seuls utilisables par l'agent ;
//  POST { action: 'cancel', message } → annule le tournoi en cours et prévient les inscrits.

const DAY = 24 * 3600 * 1000;
const RESULTS: Result[] = ['1-0', '0-1', '1/2-1/2', '0-0'];
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(Number(n) || min)));

export async function GET(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  if (!hasRedis()) return NextResponse.json({});
  const [tournament, prizes, [reports]] = await Promise.all([currentTournament(), sponsorPrizes(), redis([['LRANGE', REPORTS_KEY, 0, 9]])]);
  let play = null;
  if (tournament) {
    const s = await advance(tournament);
    // Déclarations des joueurs (résultat, motif, coups) pour chaque ronde : utiles en cas de litige ou de soupçon de triche.
    const rounds = s.rounds.length ? await redis(s.rounds.map((r) => ['HGETALL', roundKey(tournament.id, r.n)])) : [];
    play = {
      status: s.status, note: s.note || null, totalRounds: s.totalRounds,
      standings: s.status === 'registration' ? [] : standings(s),
      rounds: s.rounds.map((r, i) => {
        const data = hashToObject(rounds[i]);
        const name = (id: string) => s.players[id]?.pseudo || '?';
        return {
          n: r.n, startedAt: r.startedAt, deadline: r.deadline, closed: Boolean(r.closed), bye: r.bye ? name(r.bye) : null,
          boards: r.boards.map((b) => ({
            n: b.n, white: name(b.white), black: name(b.black), result: b.result || null, how: b.how || null,
            present: { w: Boolean(data[`in:${b.white}`]), b: Boolean(data[`in:${b.black}`]) },
            reports: { w: data[`rep:${b.n}:w`] ? JSON.parse(data[`rep:${b.n}:w`]) : null, b: data[`rep:${b.n}:b`] ? JSON.parse(data[`rep:${b.n}:b`]) : null },
          })),
        };
      }),
    };
  }
  return NextResponse.json({ tournament, play, prizes, reports: (reports || []).map((r: string) => JSON.parse(r)) });
}

export async function POST(req: Request) {
  const admin = adminIdentity(req);
  if (!admin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const body = await req.json().catch(() => null);

  if (body?.action === 'create') {
    if (await currentTournament()) return NextResponse.json({ error: 'Un tournoi est déjà en cours : annulez-le ou attendez son archivage.' }, { status: 409 });
    const starts = new Date(String(body.startsAt || '')).getTime();
    if (!Number.isFinite(starts) || starts < Date.now() + 10 * 60 * 1000 || starts > Date.now() + 60 * DAY) {
      return NextResponse.json({ error: 'Date de début : entre 10 minutes et 60 jours à partir de maintenant.' }, { status: 400 });
    }
    const name = String(body.name || '').trim().slice(0, 80);
    if (name.length < 3) return NextResponse.json({ error: 'Nom du tournoi trop court.' }, { status: 400 });
    const prizes = await sponsorPrizes();
    const t: Tournament = {
      id: `cc-${new Date(starts).toISOString().slice(0, 10)}-${Math.random().toString(36).slice(2, 6)}`,
      game: 'chains-and-crowns',
      name,
      startsAt: new Date(starts).toISOString(),
      format: 'suisse',
      rounds: clamp(body.rounds, 1, 9),
      timeControlMinutes: clamp(body.timeControlMinutes, 3, 60),
      capacity: clamp(body.capacity, 2, 256),
      description: String(body.description || '').trim().slice(0, 500),
      prizes: prizes.filter((p) => Array.isArray(body.prizeIds) && body.prizeIds.includes(p.id)),
      createdAt: new Date().toISOString(),
      createdBy: 'admin',
    };
    await saveCurrent(t);
    await redis([['SET', LAST_ANNOUNCE_KEY, Date.now()]]);
    await logDecision({ type: 'tournoi créé', id: t.id, name: t.name, by: admin });
    let posted = false;
    if (body.announce === true) {
      posted = await postDiscord(announcement(t, t.description || `Nouveau tournoi Chains & Crowns : ${t.name} !`, SITE_URL)).catch(() => false);
    }
    return NextResponse.json({ ok: true, tournament: t, announced: posted });
  }

  if (body?.action === 'archive') {
    const t = await currentTournament();
    if (!t) return NextResponse.json({ error: 'Aucun tournoi en cours' }, { status: 404 });
    const s = await advance(t);
    if (s.status !== 'finished' && s.status !== 'cancelled') return NextResponse.json({ error: 'Le tournoi n\'est pas terminé.' }, { status: 409 });
    const players = await playerIds(t.id);
    await redis([
      ['LPUSH', HISTORY_KEY, JSON.stringify({ id: t.id, name: t.name, startsAt: t.startsAt, capacity: t.capacity, registered: players.length, format: t.format, outcome: s.status, rounds: s.rounds.length })],
      ['LTRIM', HISTORY_KEY, 0, 19],
      ['EXPIRE', playersKey(t.id), 90 * 24 * 3600],
      ['EXPIRE', playKey(t.id), 90 * 24 * 3600],
      ['DEL', CURRENT_KEY],
    ]);
    await logDecision({ type: 'tournoi archivé', id: t.id, by: admin });
    return NextResponse.json({ ok: true });
  }

  if (body?.action === 'arbitrate') {
    const t = await currentTournament();
    if (!t) return NextResponse.json({ error: 'Aucun tournoi en cours' }, { status: 404 });
    if (!RESULTS.includes(body.result)) return NextResponse.json({ error: 'Résultat invalide' }, { status: 400 });
    await arbitrate(t, Number(body.round), Number(body.board), body.result);
    await logDecision({ type: 'arbitrage', tournament: t.id, round: Number(body.round), board: Number(body.board), result: body.result, by: admin });
    await advance(t);
    return NextResponse.json({ ok: true });
  }

  if (body?.action === 'setPrizes') {
    const prizes: Prize[] = (Array.isArray(body.prizes) ? body.prizes : [])
      .map((p: any) => ({ id: String(p.id || '').slice(0, 40), label: String(p.label || '').slice(0, 120), sponsor: String(p.sponsor || '').slice(0, 80) }))
      .filter((p: Prize) => p.id && p.label && p.sponsor);
    await redis([['SET', PRIZES_KEY, JSON.stringify(prizes)]]);
    return NextResponse.json({ ok: true, prizes });
  }

  if (body?.action === 'cancel') {
    const t = await currentTournament();
    if (!t) return NextResponse.json({ error: 'Aucun tournoi en cours' }, { status: 404 });
    const message = String(body.message || 'Le tournoi est annulé. Toutes nos excuses.').slice(0, 1000);
    const ids = await playerIds(t.id);
    const rows = ids.length ? await redis(ids.map((id) => ['HGETALL', contactKey(id)])) : [];
    await sendMails(ids.map((id, i) => ({ id, c: hashToObject(rows[i]) })).filter(({ c }) => c.email)
      .map(({ id, c }) => ({ to: c.email, subject: `Annulation : ${t.name}`, text: message, unsubscribeId: id })));
    await postDiscord(`❌ **${t.name}** est annulé. ${message}`).catch(() => false);
    await redis([['DEL', CURRENT_KEY]]);
    await logDecision({ type: 'tournoi annulé', id: t.id, by: admin });
    return NextResponse.json({ ok: true, notified: ids.length });
  }

  return NextResponse.json({ error: 'Action inconnue' }, { status: 400 });
}
