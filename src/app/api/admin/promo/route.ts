import { NextResponse } from 'next/server';
import { adminIdentity } from '../../../../lib/security';
import { getItem, saveItem, PromoStatus } from '../../../../lib/promotion';
import { newsContacts } from '../../../../lib/contacts';
import { sendMails, postDiscord } from '../../../../lib/notify';

// Décisions des signataires du Safe sur les propositions de l'agent promotionnel.
//  { id, action: 'edit', text }      → corrige le texte avant publication
//  { id, action: 'publish' }         → post Discord : publié dans le salon ; newsletter : envoyée aux abonnés
//  { id, action: 'sent' }            → marqué comme envoyé / publié à la main (réseaux sociaux, démarchage)
//  { id, action: 'approve' | 'reject', choice? } → décision, événement ou proposition retenue / écartée

export const maxDuration = 60;

export async function POST(req: Request) {
  const admin = adminIdentity(req);
  if (!admin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const body = await req.json().catch(() => null);
  const item = await getItem(String(body?.id || ''));
  if (!item) return NextResponse.json({ error: 'Proposition introuvable' }, { status: 404 });

  const update = (status: PromoStatus, extra: object = {}) =>
    saveItem({ ...item, ...extra, status, updatedAt: new Date().toISOString(), updatedBy: admin });

  switch (body.action) {
    case 'edit': {
      const text = String(body.text || '').trim();
      if (!text) return NextResponse.json({ error: 'Texte vide' }, { status: 400 });
      await saveItem({ ...item, text: text.slice(0, 6000), updatedAt: new Date().toISOString(), updatedBy: admin });
      return NextResponse.json({ ok: true });
    }
    case 'publish': {
      if (item.status === 'publié') return NextResponse.json({ error: 'Déjà publié' }, { status: 409 });
      if (item.kind === 'post' && item.channel === 'discord') {
        if (!(await postDiscord(item.text))) return NextResponse.json({ error: 'Webhook Discord non configuré' }, { status: 503 });
        await update('publié');
        return NextResponse.json({ ok: true });
      }
      if (item.kind === 'newsletter') {
        const contacts = (await newsContacts()).filter((c) => c.email);
        const sent = await sendMails(contacts.map((c) => ({ to: c.email, subject: item.title, text: item.text, unsubscribeId: c.id })));
        await update('publié');
        return NextResponse.json({ ok: true, sent });
      }
      return NextResponse.json({ error: 'Ce type de proposition se publie à la main, puis « Marquer comme fait ».' }, { status: 400 });
    }
    case 'sent':
      await update(item.kind === 'outreach' ? 'envoyé' : 'publié');
      return NextResponse.json({ ok: true });
    case 'approve':
      await update('approuvé', body.choice ? { recommendation: String(body.choice).slice(0, 300) } : {});
      return NextResponse.json({ ok: true });
    case 'reject':
      await update('rejeté');
      return NextResponse.json({ ok: true });
    default:
      return NextResponse.json({ error: 'Action inconnue' }, { status: 400 });
  }
}
