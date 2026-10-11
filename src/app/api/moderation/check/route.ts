import { NextResponse } from 'next/server';
import { hasRedis, rateLimited } from '../../../../lib/redis';
import { clientIp } from '../../../../lib/security';
import { moderateText } from '../../../../lib/moderation';

// Vérification d'un commentaire AVANT sa signature : l'agent conseille, il ne bloque jamais.
// En cas d'erreur (clé absente, API indisponible), le commentaire passe.

export async function POST(req: Request) {
  if (hasRedis() && (await rateLimited(`modcheck:${clientIp(req)}`, 20))) {
    return NextResponse.json({ decision: 'ok', reason: '', suggestion: '' });
  }
  const body = await req.json().catch(() => null);
  const text = String(body?.text || '').slice(0, 500);
  try {
    return NextResponse.json(await moderateText(text));
  } catch {
    return NextResponse.json({ decision: 'ok', reason: '', suggestion: '' });
  }
}
