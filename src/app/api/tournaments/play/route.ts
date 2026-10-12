import { NextResponse } from 'next/server';
import { redis, hasRedis, rateLimited } from '../../../../lib/redis';
import { clientIp } from '../../../../lib/security';
import { currentTournament, playersKey } from '../../../../lib/tournaments';
import { advance, readPlayerToken, standings, roundKey, FORFEIT_AFTER_MS, type Report } from '../../../../lib/tournamentPlay';
import { gamesOrigin } from '../../../../lib/games/token';

// API des joueurs de tournoi, appelée par le jeu (démo du portfolio ou édition complète) avec le lien personnel ?tournoi=<jeton>.
//  GET  ?p=<jeton>                      → état du tournoi pour ce joueur (fait avancer le tournoi si besoin) ;
//  POST { p, action: 'checkin' }        → le joueur est présent pour la ronde en cours ;
//  POST { p, action: 'report', result: 'win'|'loss'|'draw', reason, moves } → résultat de sa partie ;
//  POST { p, action: 'forfeit' }        → réclame la victoire si l'adversaire n'est pas venu 10 minutes après le début.

const ALLOWED = ['https://portfolio-2026-colombod.vercel.app', 'app://chains-and-crowns', 'http://localhost:8080', 'http://127.0.0.1:8080']; // app:// = version Windows

function cors(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') || '';
  const ok = ALLOWED.includes(origin) || (gamesOrigin() && origin === gamesOrigin());
  return ok ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', Vary: 'Origin' } : { Vary: 'Origin' };
}

const json = (req: Request, data: unknown, status = 200) => NextResponse.json(data, { status, headers: cors(req) });

export function OPTIONS(req: Request) {
  return new NextResponse(null, { status: 204, headers: cors(req) });
}

/** Joueur authentifié par son jeton, pour le tournoi en cours. */
async function authenticate(token: string) {
  const who = readPlayerToken(token);
  if (!who) return { error: 'Lien de tournoi invalide.' };
  const t = await currentTournament();
  if (!t || t.id !== who.tid) return { error: 'Ce tournoi est terminé ou a été annulé.' };
  const [member] = await redis([['SISMEMBER', playersKey(t.id), who.pid]]);
  if (!member) return { error: 'Inscription introuvable pour ce tournoi.' };
  return { t, pid: who.pid };
}

export async function GET(req: Request) {
  if (!hasRedis()) return json(req, { error: 'Stockage indisponible' }, 503);
  if (await rateLimited(`tplay:${clientIp(req)}`, 120)) return json(req, { error: 'Trop de requêtes, patientez un instant.' }, 429);
  const auth = await authenticate(new URL(req.url).searchParams.get('p') || '');
  if ('error' in auth) return json(req, { error: auth.error }, 403);
  const { t, pid } = auth;
  const now = Date.now();
  const s = await advance(t, now);

  const table = s.status === 'registration' ? [] : standings(s);
  const me = table.find((p) => p.id === pid);
  const r = s.status === 'running' ? s.rounds[s.rounds.length - 1] : undefined;
  let game: Record<string, unknown> | null = null;
  if (r) {
    const b = r.boards.find((x) => x.white === pid || x.black === pid);
    if (b) {
      const color = b.white === pid ? 'w' : 'b';
      const opp = color === 'w' ? b.black : b.white;
      const [inOpp, myRep, oppRep] = await redis([
        ['HGET', roundKey(t.id, r.n), `in:${opp}`], ['HEXISTS', roundKey(t.id, r.n), `rep:${b.n}:${color}`], ['HEXISTS', roundKey(t.id, r.n), `rep:${b.n}:${color === 'w' ? 'b' : 'w'}`],
      ]);
      game = {
        board: b.n, color, opponent: s.players[opp]?.pseudo, room: b.room, result: b.result || null, how: b.how || null,
        reported: Boolean(myRep), opponentReported: Boolean(oppRep), opponentPresent: Boolean(inOpp), forfeitAt: r.startedAt + FORFEIT_AFTER_MS,
      };
    } else if (r.bye === pid) game = { bye: true };
  }

  return json(req, {
    serverNow: now,
    tournament: { name: t.name, startsAt: t.startsAt, timeControlMinutes: t.timeControlMinutes, status: s.status, totalRounds: s.totalRounds, note: s.note || null },
    me: me ? { pseudo: me.pseudo, rank: me.rank, score: me.score, withdrawn: me.withdrawn } : { pseudo: null },
    round: r ? { n: r.n, startedAt: r.startedAt, deadline: r.deadline } : null,
    game,
    standings: table.slice(0, 50).map(({ id, ...p }) => ({ ...p, me: id === pid })),
  });
}

export async function POST(req: Request) {
  if (!hasRedis()) return json(req, { error: 'Stockage indisponible' }, 503);
  if (await rateLimited(`tplay-post:${clientIp(req)}`, 20)) return json(req, { error: 'Trop de requêtes, patientez un instant.' }, 429);
  const body = await req.json().catch(() => null);
  const auth = await authenticate(String(body?.p || ''));
  if ('error' in auth) return json(req, { error: auth.error }, 403);
  const { t, pid } = auth;
  const now = Date.now();
  const s = await advance(t, now);
  const r = s.status === 'running' ? s.rounds[s.rounds.length - 1] : undefined;
  const b = r?.boards.find((x) => x.white === pid || x.black === pid);
  if (!r || !b) return json(req, { error: 'Aucune partie à jouer pour vous en ce moment.' }, 409);
  const color = b.white === pid ? 'w' : 'b';
  const opp = color === 'w' ? b.black : b.white;
  const key = roundKey(t.id, r.n);

  if (body?.action === 'checkin') {
    await redis([['HSETNX', key, `in:${pid}`, now], ['EXPIRE', key, 30 * 24 * 3600]]);
    return json(req, { ok: true });
  }

  if (b.result) return json(req, { error: 'Le résultat de cette partie est déjà enregistré.' }, 409);

  let report: Report;
  if (body?.action === 'forfeit') {
    const [inOpp, inMe] = await redis([['HGET', key, `in:${opp}`], ['HGET', key, `in:${pid}`]]);
    if (inOpp) return json(req, { error: 'Votre adversaire est arrivé : jouez la partie.' }, 409);
    if (!inMe) return json(req, { error: 'Signalez d\'abord votre présence.' }, 409);
    if (now < r.startedAt + FORFEIT_AFTER_MS) return json(req, { error: 'Le forfait ne peut être réclamé que 10 minutes après le début de la ronde.' }, 409);
    report = { result: 'win', reason: 'forfait', moves: [], at: now };
  } else if (body?.action === 'report') {
    if (!['win', 'loss', 'draw'].includes(body.result)) return json(req, { error: 'Résultat invalide.' }, 400);
    const moves = (Array.isArray(body.moves) ? body.moves : []).slice(0, 600).map((m: unknown) => String(m).slice(0, 12));
    report = { result: body.result, reason: String(body.reason || '').slice(0, 120), moves, at: now };
  } else {
    return json(req, { error: 'Action inconnue.' }, 400);
  }

  // Une seule déclaration par joueur et par partie (la première compte).
  const [created] = await redis([['HSETNX', key, `rep:${b.n}:${color}`, JSON.stringify(report)], ['HSETNX', key, `in:${pid}`, now], ['EXPIRE', key, 30 * 24 * 3600]]);
  if (!created) return json(req, { error: 'Vous avez déjà déclaré le résultat de cette partie.' }, 409);
  await advance(t, Date.now());
  return json(req, { ok: true });
}
