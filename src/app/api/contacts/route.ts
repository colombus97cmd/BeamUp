import { NextResponse } from 'next/server';
import { redis, hasRedis, rateLimited } from '../../../lib/redis';
import { verifyWallet, clientIp } from '../../../lib/security';
import { hasPurchased } from '../../../lib/games';
import { sendMails } from '../../../lib/notify';
import { contactKey, NEWS_SET, EMAIL_RE as EMAIL, DISCORD_RE as DISCORD } from '../../../lib/contacts';

// Contacts des acheteurs du jeu ou d'un pass saison, pour recevoir les news et les annonces de tournois.
// RGPD : consentement explicite, finalité unique (news et tournois BeamUp), désinscription en un clic,
// effacement sur demande (DELETE signé par le wallet). Aucune autre donnée que le mail et/ou le pseudo Discord.

async function proof(body: any) {
  const address = String(body?.address || '').toLowerCase();
  const ok = await verifyWallet(address, Number(body?.issuedAt), String(body?.signature || ''));
  return ok ? address : null;
}

export async function POST(req: Request) {
  if (!hasRedis()) return NextResponse.json({ error: 'Stockage indisponible' }, { status: 503 });
  if (await rateLimited(`contacts:${clientIp(req)}`, 10)) return NextResponse.json({ error: 'Trop de tentatives, réessayez dans une minute.' }, { status: 429 });

  const body = await req.json().catch(() => null);
  const address = await proof(body);
  if (!address) return NextResponse.json({ error: 'Signature du wallet invalide ou expirée.' }, { status: 401 });

  const email = String(body.email || '').trim().toLowerCase();
  const discord = String(body.discord || '').trim().toLowerCase();
  if (!email && !discord) return NextResponse.json({ error: 'Indiquez un mail ou un pseudo Discord.' }, { status: 400 });
  if (email && !EMAIL.test(email)) return NextResponse.json({ error: 'Adresse mail invalide.' }, { status: 400 });
  if (discord && !DISCORD.test(discord)) return NextResponse.json({ error: 'Pseudo Discord invalide (2 à 32 caractères : lettres minuscules, chiffres, _ et .).' }, { status: 400 });
  if (body.consent !== true) return NextResponse.json({ error: 'Le consentement est nécessaire pour recevoir les news.' }, { status: 400 });

  if (!(await hasPurchased(address))) {
    return NextResponse.json({ error: 'Ce wallet n\'a pas encore acheté le jeu ni de pass saison. Les tournois restent ouverts à tous, gratuitement.' }, { status: 403 });
  }

  const [existed] = await redis([
    ['EXISTS', contactKey(address)],
    ['HSET', contactKey(address), 'email', email, 'discord', discord, 'consentAt', new Date().toISOString(), 'source', 'achat'],
    ['SADD', NEWS_SET, address],
  ]);

  if (email && !existed) {
    await sendMails([{
      to: email,
      subject: 'Bienvenue dans les news BeamUp',
      text: 'Merci pour votre achat ! Vous recevrez ici les news des jeux BeamUp et les annonces de tournois.\n\nLes tournois sont toujours gratuits et ouverts à tous.',
      unsubscribeId: address,
    }]).catch(() => { /* l'inscription reste valable même si le mail de bienvenue échoue */ });
  }
  return NextResponse.json({ ok: true, updated: Boolean(existed) });
}

/** Préférences actuelles (pour préremplir le formulaire). */
export async function PUT(req: Request) {
  if (!hasRedis()) return NextResponse.json({});
  const address = await proof(await req.json().catch(() => null));
  if (!address) return NextResponse.json({ error: 'Signature invalide.' }, { status: 401 });
  const [flat] = await redis([['HGETALL', contactKey(address)]]);
  const c: Record<string, string> = {};
  for (let i = 0; flat && i < flat.length; i += 2) c[flat[i]] = flat[i + 1];
  return NextResponse.json({ email: c.email || '', discord: c.discord || '', subscribed: Boolean(c.consentAt) });
}

/** Droit à l'effacement : supprime toutes les données de contact du wallet. */
export async function DELETE(req: Request) {
  if (!hasRedis()) return NextResponse.json({ ok: true });
  const address = await proof(await req.json().catch(() => null));
  if (!address) return NextResponse.json({ error: 'Signature invalide.' }, { status: 401 });
  await redis([['DEL', contactKey(address)], ['SREM', NEWS_SET, address]]);
  return NextResponse.json({ ok: true });
}
