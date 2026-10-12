import { NextResponse } from 'next/server';
import { hasRedis, rateLimited } from '../../../../lib/redis';
import { clientIp } from '../../../../lib/security';
import { licenceWallet } from '../../../../lib/licence';
import { tournamentQueryFor } from '../../../../lib/tournamentPlay';

// Version Windows : le wallet de la licence est-il inscrit au tournoi en cours ?
//  POST { licence } → { tournoi: <jeton du joueur> } s'il est inscrit (de 2 h avant le début à la fin), sinon {}.

export async function POST(req: Request) {
  if (!hasRedis()) return NextResponse.json({});
  if (await rateLimited(`tdesk:${clientIp(req)}`, 30)) return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 });
  const body = await req.json().catch(() => null);
  const wallet = licenceWallet(String(body?.licence || ''));
  if (!wallet) return NextResponse.json({ error: 'Licence invalide ou expirée' }, { status: 401 });
  return NextResponse.json((await tournamentQueryFor(wallet).catch(() => undefined)) || {});
}
