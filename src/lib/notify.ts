import { createHmac, timingSafeEqual } from 'crypto';

// Envoi des news et annonces : mail (Resend) et salon Discord (webhook).
// Variables : RESEND_API_KEY, NEWS_FROM_EMAIL (ex. « BeamUp <news@beautifull-earthcorp.tech> », domaine vérifié chez Resend),
// NEWS_REPLY_TO (facultatif : boîte qui reçoit les réponses des abonnés), DISCORD_WEBHOOK_URL (salon d'annonces), ADMIN_EMAIL (rapports des agents), UNSUBSCRIBE_SECRET.

export const SITE_URL = process.env.SITE_URL || 'https://beamup.beautifull-earthcorp.tech';

export const hasMail = () => Boolean(process.env.RESEND_API_KEY && process.env.NEWS_FROM_EMAIL);
export const hasDiscord = () => Boolean(process.env.DISCORD_WEBHOOK_URL);

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

/** Jeton de désinscription : HMAC de l'identifiant, sans base de jetons à gérer. */
export function unsubscribeToken(id: string): string {
  const secret = process.env.UNSUBSCRIBE_SECRET;
  if (!secret) throw new Error('UNSUBSCRIBE_SECRET manquant');
  return createHmac('sha256', secret).update(id).digest('hex').slice(0, 32);
}

export function checkUnsubscribeToken(id: string, token: string): boolean {
  const expected = Buffer.from(unsubscribeToken(id));
  const given = Buffer.from(String(token));
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export const unsubscribeUrl = (id: string) =>
  `${SITE_URL}/api/contacts/unsubscribe?id=${encodeURIComponent(id)}&t=${unsubscribeToken(id)}`;

export interface Mail { to: string; subject: string; text: string; unsubscribeId?: string }

function toResend(m: Mail) {
  const footer = m.unsubscribeId ? `\n\n—\nVous recevez ce message car vous êtes inscrit aux news de BeamUp.\nSe désinscrire : ${unsubscribeUrl(m.unsubscribeId)}` : '';
  const text = m.text + footer;
  return {
    from: process.env.NEWS_FROM_EMAIL,
    ...(process.env.NEWS_REPLY_TO ? { reply_to: process.env.NEWS_REPLY_TO } : {}),
    to: [m.to],
    subject: m.subject,
    text,
    html: `<div style="font-family:system-ui,sans-serif;white-space:pre-wrap;line-height:1.6">${escapeHtml(text)}</div>`,
    ...(m.unsubscribeId ? { headers: { 'List-Unsubscribe': `<${unsubscribeUrl(m.unsubscribeId)}>` } } : {}),
  };
}

/** Envoie des mails par lots de 100 (limite de l'API batch de Resend). Renvoie le nombre envoyé. */
export async function sendMails(mails: Mail[]): Promise<number> {
  if (!hasMail() || !mails.length) return 0;
  let sent = 0;
  for (let i = 0; i < mails.length; i += 100) {
    const batch = mails.slice(i, i + 100);
    const res = await fetch('https://api.resend.com/emails/batch', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(batch.map(toResend)),
    });
    if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
    sent += batch.length;
  }
  return sent;
}

export async function mailAdmin(subject: string, text: string) {
  const to = process.env.ADMIN_EMAIL;
  if (to) await sendMails([{ to, subject, text }]);
}

/** Publie un message dans le salon Discord d'annonces (2000 caractères max par message). */
export async function postDiscord(content: string) {
  if (!hasDiscord()) return false;
  const res = await fetch(process.env.DISCORD_WEBHOOK_URL!, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: content.slice(0, 2000), allowed_mentions: { parse: [] } }),
  });
  if (!res.ok) throw new Error(`Discord ${res.status}`);
  return true;
}
