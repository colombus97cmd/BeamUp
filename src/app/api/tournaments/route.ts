import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { redis, hasRedis, rateLimited } from '../../../lib/redis';
import { clientIp } from '../../../lib/security';
import { contactKey, NEWS_SET, EMAIL_RE, DISCORD_RE } from '../../../lib/contacts';
import { currentTournament, playersKey, formatDate, LEGAL_FOOTER } from '../../../lib/tournaments';
import { sendMails } from '../../../lib/notify';
import { moderateText } from '../../../lib/moderation';
import { advance, standings, playLink } from '../../../lib/tournamentPlay';

// Tournoi en cours : consultation publique et inscription GRATUITE ouverte à tous (aucun achat requis).
// Les coordonnées d'un inscrit sans abonnement aux news sont effacées 90 jours après l'inscription.

const PSEUDO = /^[\p{L}\p{N} _.-]{2,20}$/u;
const KEEP_SECONDS = 90 * 24 * 3600;

export async function GET() {
  if (!hasRedis()) return NextResponse.json({ tournament: null });
  const t = await currentTournament();
  if (!t) return NextResponse.json({ tournament: null });
  const [count] = await redis([['SCARD', playersKey(t.id)]]);
  // Le tournoi avance aussi quand on consulte la page Jeux (pas de tâche planifiée pendant les rondes).
  const s = await advance(t).catch(() => null);
  const live = s && s.status !== 'registration' ? {
    status: s.status, note: s.note || null, round: s.rounds.length, totalRounds: s.totalRounds,
    standings: standings(s).slice(0, 10).map(({ pseudo, score, rank }) => ({ pseudo, score, rank })),
  } : null;
  return NextResponse.json({ tournament: { ...t, registered: Number(count) || 0, live }, legal: LEGAL_FOOTER });
}

export async function POST(req: Request) {
  if (!hasRedis()) return NextResponse.json({ error: 'Stockage indisponible' }, { status: 503 });
  if (await rateLimited(`tournoi:${clientIp(req)}`, 5)) return NextResponse.json({ error: 'Trop de tentatives, réessayez dans une minute.' }, { status: 429 });

  const t = await currentTournament();
  if (!t || new Date(t.startsAt).getTime() < Date.now()) return NextResponse.json({ error: 'Aucun tournoi ouvert aux inscriptions.' }, { status: 404 });

  const body = await req.json().catch(() => null);
  const pseudo = String(body?.pseudo || '').trim();
  const email = String(body?.email || '').trim().toLowerCase();
  const discord = String(body?.discord || '').trim().toLowerCase();
  if (!PSEUDO.test(pseudo)) return NextResponse.json({ error: 'Pseudo de 2 à 20 caractères (lettres, chiffres, espace, _ . -).' }, { status: 400 });
  if (!email && !discord) return NextResponse.json({ error: 'Indiquez un mail ou un pseudo Discord pour recevoir vos appariements.' }, { status: 400 });
  if (email && !EMAIL_RE.test(email)) return NextResponse.json({ error: 'Adresse mail invalide.' }, { status: 400 });
  if (discord && !DISCORD_RE.test(discord)) return NextResponse.json({ error: 'Pseudo Discord invalide.' }, { status: 400 });
  if (body?.rules !== true) return NextResponse.json({ error: 'Merci d\'accepter le règlement du tournoi.' }, { status: 400 });

  const verdict = await moderateText(pseudo, 'pseudo de tournoi').catch(() => null);
  if (verdict?.decision === 'masquer') return NextResponse.json({ error: 'Ce pseudo ne respecte pas la charte de la communauté. Choisissez-en un autre.' }, { status: 400 });

  const id = 't:' + createHash('sha256').update(email || `discord:${discord}`).digest('hex').slice(0, 20);
  const [count, already, subscribed] = await redis([['SCARD', playersKey(t.id)], ['SISMEMBER', playersKey(t.id), id], ['SISMEMBER', NEWS_SET, id]]);
  if (!already && Number(count) >= t.capacity) return NextResponse.json({ error: 'Le tournoi est complet.' }, { status: 409 });

  // Un contact déjà abonné aux news le reste : ses coordonnées ne sont pas soumises à l'effacement automatique.
  const news = body?.news === true || Boolean(subscribed);
  const commands: (string | number)[][] = [
    ['HSET', contactKey(id), 'pseudo', pseudo, 'email', email, 'discord', discord, 'consentAt', new Date().toISOString(), 'source', 'tournoi'],
    ['SADD', playersKey(t.id), id],
  ];
  if (news) commands.push(['SADD', NEWS_SET, id], ['PERSIST', contactKey(id)]);
  else commands.push(['EXPIRE', contactKey(id), KEEP_SECONDS]);
  await redis(commands);

  const link = playLink(t.id, id);
  if (email && !already) {
    await sendMails([{
      to: email,
      subject: `Inscription confirmée : ${t.name}`,
      text: `Bonjour ${pseudo},\n\nVotre inscription au tournoi « ${t.name} » est confirmée.\nDébut : ${formatDate(t.startsAt)}.\n\nVotre lien personnel pour jouer (gardez-le, ne le partagez pas) :\n${link}\n\nOuvrez-le à l'heure du début : le jeu vous indiquera votre adversaire à chaque ronde. Le jeu est gratuit, aucun achat n'est nécessaire.\n\n${LEGAL_FOOTER}`,
      unsubscribeId: id,
    }]).catch(() => { /* inscription valable même sans mail */ });
  }
  // Le lien n'est affiché qu'à la première inscription : le redemander avec les mêmes coordonnées ne le révèle pas.
  return NextResponse.json({ ok: true, already: Boolean(already), link: already ? null : link });
}
