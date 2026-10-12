import { createHmac, timingSafeEqual } from 'crypto';
import { redis, hashToObject } from './redis';
import { contactKey } from './contacts';
import { sendMails, postDiscord, mailAdmin, SITE_URL } from './notify';
import { type Tournament, playerIds, LEGAL_FOOTER } from './tournaments';

// Déroulement des tournois Chains & Crowns (système suisse), sans tâche planifiée :
// chaque consultation (joueurs, page Jeux, pilotage) fait avancer le tournoi s'il le faut (fonction advance, sous verrou Redis).
//  - Au début : les inscrits sont appariés pour la ronde 1.
//  - Pendant une ronde : chaque joueur ouvre son lien personnel dans le jeu, signale sa présence, joue en pair-à-pair,
//    puis le jeu déclare le résultat. Deux déclarations concordantes valident la partie ; en cas de désaccord,
//    la partie passe en litige (nulle provisoire) et l'administrateur tranche dans /pilotage.
//  - Forfait : si l'adversaire n'est pas venu 10 minutes après le début de la ronde, le joueur présent réclame la victoire.
//  - Fin de ronde : toutes les parties réglées, ou délai dépassé (2 × cadence + 20 min). Un joueur absent à une ronde est retiré des suivantes.

export type Result = '1-0' | '0-1' | '1/2-1/2' | '0-0';
export type How = 'partie' | 'forfait' | 'litige' | 'arbitre' | 'non jouée' | 'déclaration unique';

export interface Board { n: number; white: string; black: string; room: string; result?: Result; how?: How }
export interface Round { n: number; startedAt: number; deadline: number; boards: Board[]; bye?: string; closed?: boolean }
export interface PlayerState { pseudo: string; seed: number; withdrawn: boolean }
export interface PlayState {
  status: 'registration' | 'running' | 'finished' | 'cancelled';
  totalRounds: number;
  players: Record<string, PlayerState>;
  rounds: Round[];
  note?: string;
  finishedAt?: number;
}
export interface Standing { id: string; pseudo: string; score: number; buchholz: number; played: number; withdrawn: boolean; rank: number }
export interface Report { result: 'win' | 'loss' | 'draw'; reason: string; moves: string[]; at: number }

const MIN = 60 * 1000;
export const FORFEIT_AFTER_MS = 10 * MIN;
const lockKey = (id: string) => `beam:v1:tournament:${id}:lock`;
export const playKey = (id: string) => `beam:v1:tournament:${id}:play`;
export const roundKey = (id: string, n: number) => `beam:v1:tournament:${id}:r${n}`;

// ---------------- Liens personnels et salles de jeu ----------------

const secret = () => {
  const s = process.env.GAME_TOKEN_SECRET;
  if (!s || s.length < 32) throw new Error('GAME_TOKEN_SECRET manquant');
  return s;
};
const mac = (s: string) => createHmac('sha256', secret()).update(s).digest('base64url');
const b64 = (s: string) => Buffer.from(s).toString('base64url');

/** Jeton personnel d'un joueur pour un tournoi (sans expiration, limité à ce tournoi). */
export function playerToken(tid: string, pid: string) {
  const payload = `${b64(tid)}.${b64(pid)}`;
  return `${payload}.${mac(`tournoi:${payload}`).slice(0, 32)}`;
}

export function readPlayerToken(token: string): { tid: string; pid: string } | null {
  const [t, p, sig] = String(token || '').split('.');
  if (!t || !p || !sig) return null;
  const expected = Buffer.from(mac(`tournoi:${t}.${p}`).slice(0, 32));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  return { tid: Buffer.from(t, 'base64url').toString(), pid: Buffer.from(p, 'base64url').toString() };
}

/** Identifiant de salle pair-à-pair, connu seulement des deux joueurs de la table. */
const roomId = (tid: string, round: number, board: number) => mac(`salle:${tid}:${round}:${board}`).replace(/[^A-Za-z0-9]/g, '').slice(0, 24);

/** Démo gratuite du jeu (aucun achat requis pour jouer un tournoi). */
export const GAME_URL = process.env.TOURNAMENT_GAME_URL || 'https://portfolio-2026-colombod.vercel.app/chains-and-crowns/index.html';
export const playLink = (tid: string, pid: string) => `${GAME_URL}?tournoi=${playerToken(tid, pid)}`;

// ---------------- Lecture et calculs ----------------

export async function loadPlay(id: string): Promise<PlayState | null> {
  const [raw] = await redis([['GET', playKey(id)]]);
  return raw ? (JSON.parse(raw) as PlayState) : null;
}

const points = (r: Result | undefined, color: 'w' | 'b') =>
  !r ? 0 : r === '1/2-1/2' ? 0.5 : r === '0-0' ? 0 : (r === '1-0') === (color === 'w') ? 1 : 0;

export function standings(s: PlayState): Standing[] {
  const score: Record<string, number> = {};
  const opps: Record<string, string[]> = {};
  const played: Record<string, number> = {};
  for (const id of Object.keys(s.players)) { score[id] = 0; opps[id] = []; played[id] = 0; }
  for (const r of s.rounds) {
    if (r.bye && score[r.bye] !== undefined) score[r.bye] += 1;
    for (const b of r.boards) {
      score[b.white] += points(b.result, 'w');
      score[b.black] += points(b.result, 'b');
      opps[b.white].push(b.black);
      opps[b.black].push(b.white);
      if (b.result && b.how !== 'forfait' && b.how !== 'non jouée') { played[b.white]++; played[b.black]++; }
    }
  }
  const list = Object.entries(s.players).map(([id, p]) => ({
    id, pseudo: p.pseudo, score: score[id], buchholz: opps[id].reduce((x, o) => x + score[o], 0), played: played[id], withdrawn: p.withdrawn, seed: p.seed, rank: 0,
  }));
  list.sort((a, b) => b.score - a.score || b.buchholz - a.buchholz || a.seed - b.seed);
  return list.map(({ seed, ...x }, i) => ({ ...x, rank: i + 1 }));
}

// ---------------- Appariements (système suisse) ----------------

function colorHistory(s: PlayState, id: string) {
  const colors: ('w' | 'b')[] = [];
  for (const r of s.rounds) for (const b of r.boards) { if (b.white === id) colors.push('w'); if (b.black === id) colors.push('b'); }
  return colors;
}

function opponents(s: PlayState, id: string) {
  const set = new Set<string>();
  for (const r of s.rounds) for (const b of r.boards) { if (b.white === id) set.add(b.black); if (b.black === id) set.add(b.white); }
  return set;
}

/** Appariement glouton avec retour arrière : joueurs classés par score, jamais deux fois le même adversaire si possible. */
function pairPlayers(s: PlayState, ids: string[], allowRematch: boolean): [string, string][] | null {
  if (!ids.length) return [];
  const [first, ...rest] = ids;
  const met = opponents(s, first);
  for (let i = 0; i < rest.length; i++) {
    if (!allowRematch && met.has(rest[i])) continue;
    const tail = pairPlayers(s, [...rest.slice(0, i), ...rest.slice(i + 1)], allowRematch);
    if (tail) return [[first, rest[i]], ...tail];
  }
  return null;
}

function nextRound(s: PlayState, tid: string, now: number, tc: number): Round {
  const n = s.rounds.length + 1;
  const ranking = standings(s).filter((p) => !p.withdrawn).map((p) => p.id);
  let bye: string | undefined;
  if (ranking.length % 2) {
    const hadBye = new Set(s.rounds.map((r) => r.bye).filter(Boolean));
    bye = [...ranking].reverse().find((id) => !hadBye.has(id)) || ranking[ranking.length - 1];
  }
  const ids = ranking.filter((id) => id !== bye);
  const pairs = pairPlayers(s, ids, false) || pairPlayers(s, ids, true) || [];
  const boards = pairs.map(([a, b], i) => {
    const ca = colorHistory(s, a), cb = colorHistory(s, b);
    const bal = (c: ('w' | 'b')[]) => c.filter((x) => x === 'w').length - c.filter((x) => x === 'b').length;
    // Couleurs équilibrées : d'abord l'écart blancs/noirs, puis l'alternance avec la ronde précédente.
    let aWhite: boolean;
    if (bal(ca) !== bal(cb)) aWhite = bal(ca) < bal(cb);
    else if (ca.length && ca[ca.length - 1] !== cb[cb.length - 1]) aWhite = ca[ca.length - 1] === 'b';
    else aWhite = (n + i) % 2 === 0;
    return { n: i + 1, white: aWhite ? a : b, black: aWhite ? b : a, room: roomId(tid, n, i + 1) };
  });
  return { n, startedAt: now, deadline: now + (2 * tc + 20) * MIN, boards, bye };
}

// ---------------- Résolution des parties ----------------

const fromReport = (rep: Report, color: 'w' | 'b'): Result =>
  rep.result === 'draw' ? '1/2-1/2' : (rep.result === 'win') === (color === 'w') ? '1-0' : '0-1';

/** Règle une table d'après les déclarations et présences. `final` : le délai de la ronde est dépassé. */
function resolveBoard(b: Board, data: Record<string, string>, final: boolean): { result?: Result; how?: How; dispute?: boolean } {
  const repW = data[`rep:${b.n}:w`] ? (JSON.parse(data[`rep:${b.n}:w`]) as Report) : null;
  const repB = data[`rep:${b.n}:b`] ? (JSON.parse(data[`rep:${b.n}:b`]) as Report) : null;
  if (repW && repB) {
    const rw = fromReport(repW, 'w'), rb = fromReport(repB, 'b');
    return rw === rb ? { result: rw, how: repW.reason === 'forfait' || repB.reason === 'forfait' ? 'forfait' : 'partie' } : { result: '1/2-1/2', how: 'litige', dispute: true };
  }
  const single = repW ? { rep: repW, color: 'w' as const } : repB ? { rep: repB, color: 'b' as const } : null;
  // Forfait réclamé et vérifié à la déclaration : réglé tout de suite.
  if (single?.rep.reason === 'forfait') return { result: fromReport(single.rep, single.color), how: 'forfait' };
  if (!final) return {};
  if (single) return { result: fromReport(single.rep, single.color), how: 'déclaration unique' };
  const inW = Boolean(data[`in:${b.white}`]), inB = Boolean(data[`in:${b.black}`]);
  if (inW && inB) return { result: '1/2-1/2', how: 'non jouée' };
  if (inW) return { result: '1-0', how: 'forfait' };
  if (inB) return { result: '0-1', how: 'forfait' };
  return { result: '0-0', how: 'non jouée' };
}

// ---------------- Notifications ----------------

async function contactsOf(ids: string[]) {
  if (!ids.length) return {} as Record<string, Record<string, string>>;
  const rows = await redis(ids.map((id) => ['HGETALL', contactKey(id)]));
  return Object.fromEntries(ids.map((id, i) => [id, hashToObject(rows[i])]));
}

async function announceRound(t: Tournament, s: PlayState, r: Round) {
  const name = (id: string) => s.players[id]?.pseudo || '?';
  const ids = [...r.boards.flatMap((b) => [b.white, b.black]), ...(r.bye ? [r.bye] : [])];
  const contacts = await contactsOf(ids);
  const mails = ids.filter((id) => contacts[id]?.email).map((id) => {
    const b = r.boards.find((x) => x.white === id || x.black === id);
    const what = b
      ? `Vous jouez ${b.white === id ? 'l\'Empire (blancs, vous commencez)' : 'la Résistance (noirs)'} contre ${name(b.white === id ? b.black : b.white)}.`
      : 'Vous êtes exempté de cette ronde : 1 point vous est attribué.';
    return {
      to: contacts[id].email,
      subject: `Ronde ${r.n} / ${s.totalRounds} : ${t.name}`,
      text: `Bonjour ${name(id)},\n\nLa ronde ${r.n} du tournoi « ${t.name} » commence.\n${what}\n\n${b ? `Ouvrez votre lien personnel pour jouer (ne le partagez pas) :\n${playLink(t.id, id)}\n\nSi votre adversaire n'est pas là 10 minutes après le début de la ronde, vous pourrez réclamer la victoire par forfait.` : `Suivez le classement avec votre lien personnel :\n${playLink(t.id, id)}`}\n\n${LEGAL_FOOTER}`,
    };
  });
  await sendMails(mails).catch(() => 0);
  const lines = r.boards.slice(0, 40).map((b) => `${b.n}. ${name(b.white)} – ${name(b.black)}`);
  if (r.boards.length > 40) lines.push(`… et ${r.boards.length - 40} autres tables`);
  if (r.bye) lines.push(`Exempté : ${name(r.bye)}`);
  await postDiscord(`♟️ **${t.name}** — ronde ${r.n} / ${s.totalRounds}\n${lines.join('\n')}\n\nJouez avec votre lien personnel (reçu à l'inscription ou par mail).`).catch(() => false);
}

async function announceEnd(t: Tournament, s: PlayState) {
  const table = standings(s);
  const top = table.slice(0, 10).map((p) => `${p.rank}. ${p.pseudo} — ${p.score} pt${p.score > 1 ? 's' : ''} (départage ${p.buchholz})`);
  const contacts = await contactsOf(table.map((p) => p.id));
  await sendMails(table.filter((p) => contacts[p.id]?.email).map((p) => ({
    to: contacts[p.id].email,
    subject: `Classement final : ${t.name}`,
    text: `Bonjour ${p.pseudo},\n\nLe tournoi « ${t.name} » est terminé. Vous terminez ${p.rank === 1 ? '1er' : `${p.rank}e`} avec ${p.score} point(s).\n\n${top.join('\n')}\n\nMerci d'avoir joué !\n\n${LEGAL_FOOTER}`,
    unsubscribeId: p.id,
  }))).catch(() => 0);
  await postDiscord(`🏆 **${t.name}** est terminé !\n${top.join('\n')}`).catch(() => false);
  const prizes = t.prizes.length ? `\n\nLots à remettre :\n${t.prizes.map((pr, i) => `${pr.label} (${pr.sponsor}) → ${table[i] ? `${table[i].pseudo} — ${contacts[table[i].id]?.email || `Discord ${contacts[table[i].id]?.discord || '?'}`}` : 'personne'}`).join('\n')}` : '';
  await mailAdmin(`[BeamUp] Tournoi terminé : ${t.name}`, `${top.join('\n')}${prizes}\n\nAvant de remettre un lot, vérifiez le fair-play des parties gagnantes dans /pilotage → Tournois.`).catch(() => {});
}

// ---------------- Avancement ----------------

/**
 * Fait avancer le tournoi : début, règlement des parties, clôture de ronde, ronde suivante, fin.
 * Sans effet si un autre appel tient déjà le verrou (il fera le travail).
 */
export async function advance(t: Tournament, now = Date.now()): Promise<PlayState> {
  let s = (await loadPlay(t.id)) || { status: 'registration', totalRounds: t.rounds, players: {}, rounds: [] } as PlayState;
  if (s.status === 'finished' || s.status === 'cancelled') return s;
  if (s.status === 'registration' && now < new Date(t.startsAt).getTime()) return s;

  const [locked] = await redis([['SET', lockKey(t.id), now, 'NX', 'PX', 30000]]);
  if (locked !== 'OK') return s;
  const events: (() => Promise<unknown>)[] = [];
  try {
    s = (await loadPlay(t.id)) || s;

    if (s.status === 'registration') {
      const ids = await playerIds(t.id);
      const contacts = await contactsOf(ids);
      const shuffled = ids.map((id) => ({ id, k: Math.random() })).sort((a, b) => a.k - b.k);
      s.players = Object.fromEntries(shuffled.map(({ id }, i) => [id, { pseudo: (contacts[id]?.pseudo || 'Joueur').slice(0, 20), seed: i, withdrawn: false }]));
      if (ids.length < 2) {
        s.status = 'cancelled';
        s.note = 'Pas assez d\'inscrits (2 au minimum).';
        events.push(() => postDiscord(`❌ **${t.name}** n'a pas lieu faute d'inscrits. Rendez-vous au prochain tournoi !`).catch(() => false));
      } else {
        s.status = 'running';
        s.totalRounds = Math.max(1, Math.min(t.rounds, ids.length % 2 ? ids.length : ids.length - 1));
        const r = nextRound(s, t.id, now, t.timeControlMinutes);
        s.rounds.push(r);
        events.push(() => announceRound(t, s, r));
      }
    }

    if (s.status === 'running') {
      const r = s.rounds[s.rounds.length - 1];
      const [flat] = await redis([['HGETALL', roundKey(t.id, r.n)]]);
      const data = hashToObject(flat);
      const final = now > r.deadline;
      const disputes: Board[] = [];
      for (const b of r.boards) {
        if (b.result) continue; // table déjà réglée (partie, forfait, litige ou arbitre)
        const res = resolveBoard(b, data, final);
        if (res.result) {
          if (res.dispute) disputes.push(b);
          b.result = res.result;
          b.how = res.how;
        }
      }
      if (disputes.length) {
        events.push(() => mailAdmin(`[BeamUp] Litige au tournoi ${t.name}`, `Ronde ${r.n} : ${disputes.map((b) => `table ${b.n} (${s.players[b.white].pseudo} – ${s.players[b.black].pseudo})`).join(', ')}.\nLes deux joueurs déclarent des résultats différents. Nulle provisoire ; à trancher dans ${SITE_URL}/pilotage → Tournois.`).catch(() => {}));
      }

      if (r.boards.every((b) => b.result) || final) {
        r.closed = true;
        // Un joueur absent (aucune présence signalée) est retiré des rondes suivantes.
        for (const b of r.boards) for (const id of [b.white, b.black]) if (!data[`in:${id}`] && !data[`rep:${b.n}:${id === b.white ? 'w' : 'b'}`]) s.players[id].withdrawn = true;
        const active = Object.values(s.players).filter((p) => !p.withdrawn).length;
        if (r.n < s.totalRounds && active >= 2) {
          const next = nextRound(s, t.id, now, t.timeControlMinutes);
          s.rounds.push(next);
          events.push(() => announceRound(t, s, next));
        } else {
          s.status = 'finished';
          s.finishedAt = now;
          events.push(() => announceEnd(t, s));
        }
      }
    }

    await redis([['SET', playKey(t.id), JSON.stringify(s)]]);
  } finally {
    await redis([['DEL', lockKey(t.id)]]);
  }
  for (const e of events) await e();
  return s;
}

/** Décision de l'arbitre (administrateur) sur une table : modifie le résultat, sans refaire les appariements déjà publiés. */
export async function arbitrate(t: Tournament, round: number, board: number, result: Result) {
  for (let i = 0; i < 10; i++) {
    const [locked] = await redis([['SET', lockKey(t.id), Date.now(), 'NX', 'PX', 30000]]);
    if (locked === 'OK') break;
    await new Promise((r) => setTimeout(r, 500));
    if (i === 9) throw new Error('Tournoi occupé, réessayez.');
  }
  try {
    const s = await loadPlay(t.id);
    const b = s?.rounds.find((r) => r.n === round)?.boards.find((x) => x.n === board);
    if (!s || !b) throw new Error('Table introuvable');
    b.result = result;
    b.how = 'arbitre';
    await redis([['SET', playKey(t.id), JSON.stringify(s)]]);
    return s;
  } finally {
    await redis([['DEL', lockKey(t.id)]]);
  }
}
