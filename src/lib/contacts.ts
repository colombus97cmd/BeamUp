import { redis, hashToObject } from './redis';

// Clés Redis des contacts (news) et des tournois, partagées entre les routes et les agents.

export const contactKey = (id: string) => `beam:v1:contact:${id}`;
export const NEWS_SET = 'beam:v1:contacts:news';

export const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;
export const DISCORD_RE = /^[a-z0-9_.]{2,32}$/;

export interface Contact { id: string; email: string; discord: string }

/** Tous les contacts ayant consenti aux news. */
export async function newsContacts(): Promise<Contact[]> {
  const [ids] = await redis([['SMEMBERS', NEWS_SET]]);
  if (!ids?.length) return [];
  const rows = await redis((ids as string[]).map((id) => ['HGETALL', contactKey(id)]));
  return (ids as string[]).map((id, i) => {
    const c = hashToObject(rows[i]);
    return { id, email: c.email || '', discord: c.discord || '' };
  }).filter((c) => c.email || c.discord);
}
