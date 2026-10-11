import { NextResponse } from 'next/server';
import { redis, hasRedis, hashToObject } from '../../../../lib/redis';
import { isAdmin } from '../../../../lib/security';
import { contactKey } from '../../../../lib/contacts';
import { sendMails, postDiscord } from '../../../../lib/notify';
import { currentTournament, sponsorPrizes, playerIds, Prize, PRIZES_KEY, REPORTS_KEY, CURRENT_KEY } from '../../../../lib/tournaments';

// Administration des tournois (en-tête x-admin-secret) :
//  GET  → tournoi en cours, lots déclarés, 10 derniers rapports de l'agent ;
//  POST { action: 'setPrizes', prizes: [{ id, label, sponsor }] } → lots offerts par des partenaires, seuls utilisables par l'agent ;
//  POST { action: 'cancel', message } → annule le tournoi en cours et prévient les inscrits.

export async function GET(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  if (!hasRedis()) return NextResponse.json({});
  const [tournament, prizes, [reports]] = await Promise.all([currentTournament(), sponsorPrizes(), redis([['LRANGE', REPORTS_KEY, 0, 9]])]);
  return NextResponse.json({ tournament, prizes, reports: (reports || []).map((r: string) => JSON.parse(r)) });
}

export async function POST(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const body = await req.json().catch(() => null);

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
    return NextResponse.json({ ok: true, notified: ids.length });
  }

  return NextResponse.json({ error: 'Action inconnue' }, { status: 400 });
}
