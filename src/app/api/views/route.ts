import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { SUPPORTED_CHAIN_IDS } from '../../../config/contracts';

// Statistiques de lecture, stockées dans Upstash Redis (persistant, contrairement au disque Vercel).
// Règles anti-fausses vues :
//  - le navigateur n'envoie une vue qu'après une vraie lecture (temps de lecture minimum, voir SocialFeed) ;
//  - une vue / une lecture complète au plus par visiteur, par œuvre et par 24 h ;
//  - 30 requêtes max par minute et par visiteur ; robots ignorés.

type StatType = 'view' | 'inProgress' | 'completed';
const TYPES: StatType[] = ['view', 'inProgress', 'completed'];
const FIELD: Record<StatType, string> = { view: 'views', inProgress: 'inProgress', completed: 'completed' };
const DEDUPE_SECONDS = 24 * 3600;
const RATE_LIMIT_PER_MINUTE = 30;
const BOT_UA = /bot|crawl|spider|slurp|headless|lighthouse|preview|curl|wget|python|axios|node-fetch|go-http/i;

// L'intégration Upstash de Vercel nomme les variables selon le préfixe choisi
// (KV_REST_API_URL, UPSTASH_REDIS_REST_URL, STORAGE_KV_REST_API_URL...) : on accepte toutes ces formes.
const findEnv = (...suffixes: string[]) => {
  for (const suffix of suffixes) {
    const key = Object.keys(process.env).find((k) => k.endsWith(suffix) && !k.includes('READ_ONLY') && process.env[k]);
    if (key) return process.env[key];
  }
  return undefined;
};
const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || findEnv('KV_REST_API_URL', 'REDIS_REST_URL', 'REST_API_URL');
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || findEnv('KV_REST_API_TOKEN', 'REDIS_REST_TOKEN', 'REST_API_TOKEN');

async function redis(commands: (string | number)[][]): Promise<any[]> {
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

const statsKey = (chainId: number) => `beam:v1:stats:${chainId}`;

function parseStats(flat: string[] | null) {
  const out: Record<string, { views: number; completed: number; inProgress: number }> = {};
  if (!flat) return out;
  for (let i = 0; i < flat.length; i += 2) {
    const [workId, field] = flat[i].split(':');
    out[workId] ??= { views: 0, completed: 0, inProgress: 0 };
    (out[workId] as any)[field] = Number(flat[i + 1]) || 0;
  }
  return out;
}

function parseChain(value: unknown): number | null {
  const chainId = Number(value);
  return SUPPORTED_CHAIN_IDS.includes(chainId) ? chainId : null;
}

export async function GET(request: Request) {
  const chainId = parseChain(new URL(request.url).searchParams.get('chainId') ?? 56);
  if (!chainId || !REDIS_URL || !REDIS_TOKEN) return NextResponse.json({});
  try {
    const [flat] = await redis([['HGETALL', statsKey(chainId)]]);
    return NextResponse.json(parseStats(flat));
  } catch (error) {
    console.error('Erreur lecture des vues :', error);
    return NextResponse.json({});
  }
}

export async function POST(request: Request) {
  if (!REDIS_URL || !REDIS_TOKEN) {
    return NextResponse.json({ success: false, error: 'Statistiques indisponibles' }, { status: 503 });
  }

  const ua = request.headers.get('user-agent') || '';
  if (!ua || BOT_UA.test(ua)) return NextResponse.json({ success: false, ignored: true });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Requête invalide' }, { status: 400 });
  }

  const chainId = parseChain(body.chainId);
  const workId = Number(body.workId);
  const type = body.type as StatType;
  if (!chainId || !Number.isInteger(workId) || workId < 0 || workId > 10_000_000 || !TYPES.includes(type)) {
    return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 });
  }

  const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'inconnu';
  const salt = process.env.VIEWS_SALT || REDIS_TOKEN;
  const visitor = createHash('sha256').update(`${salt}|${ip}|${ua}`).digest('hex').slice(0, 32);

  try {
    const rlKey = `beam:v1:rl:${visitor}`;
    const [count] = await redis([['INCR', rlKey], ['EXPIRE', rlKey, 60, 'NX']]);
    if (Number(count) > RATE_LIMIT_PER_MINUTE) {
      return NextResponse.json({ success: false, error: 'Trop de requêtes' }, { status: 429 });
    }

    const seenKey = `beam:v1:seen:${chainId}:${workId}:${type}:${visitor}`;
    const [firstTime] = await redis([['SET', seenKey, 1, 'EX', DEDUPE_SECONDS, 'NX']]);
    if (firstTime === 'OK') {
      await redis([['HINCRBY', statsKey(chainId), `${workId}:${FIELD[type]}`, 1]]);
    }

    const [flat] = await redis([['HGETALL', statsKey(chainId)]]);
    const stats = parseStats(flat)[String(workId)] || { views: 0, completed: 0, inProgress: 0 };
    return NextResponse.json({ success: true, counted: firstTime === 'OK', stats });
  } catch (error) {
    console.error('Erreur enregistrement des vues :', error);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
