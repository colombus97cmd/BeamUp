// Accès à Upstash Redis (API REST), partagé par les routes serveur.
// L'intégration Upstash de Vercel nomme les variables selon le préfixe choisi
// (KV_REST_API_URL, UPSTASH_REDIS_REST_URL, STORAGE_KV_REST_API_URL...) : on accepte toutes ces formes.

const findEnv = (...suffixes: string[]) => {
  for (const suffix of suffixes) {
    const key = Object.keys(process.env).find((k) => k.endsWith(suffix) && !k.includes('READ_ONLY') && process.env[k]);
    if (key) return process.env[key];
  }
  return undefined;
};

export const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || findEnv('KV_REST_API_URL', 'REDIS_REST_URL', 'REST_API_URL');
export const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || findEnv('KV_REST_API_TOKEN', 'REDIS_REST_TOKEN', 'REST_API_TOKEN');

export const hasRedis = () => Boolean(REDIS_URL && REDIS_TOKEN);

/** Exécute une série de commandes Redis en un seul aller-retour. */
export async function redis(commands: (string | number)[][]): Promise<any[]> {
  const res = await fetch(`${REDIS_URL}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Redis ${res.status}`);
  const data = (await res.json()) as { result?: any; error?: string }[];
  return data.map((d) => {
    if (d.error) throw new Error(d.error);
    return d.result;
  });
}

/** Hash Redis (liste plate clé, valeur, ...) vers objet. */
export function hashToObject(flat: string[] | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!flat) return out;
  for (let i = 0; i < flat.length; i += 2) out[flat[i]] = flat[i + 1];
  return out;
}

/** Limite de débit simple : `limit` requêtes par fenêtre de `seconds` pour une clé. */
export async function rateLimited(key: string, limit: number, seconds = 60): Promise<boolean> {
  const [count] = await redis([['INCR', `beam:v1:rl:${key}`], ['EXPIRE', `beam:v1:rl:${key}`, seconds, 'NX']]);
  return Number(count) > limit;
}
