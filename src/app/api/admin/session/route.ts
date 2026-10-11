import { NextResponse } from 'next/server';
import { rateLimited, hasRedis } from '../../../../lib/redis';
import { clientIp, adminIdentity } from '../../../../lib/security';
import { openSession, sessionCookie, clearedCookie } from '../../../../lib/adminAuth';

// Connexion à la page de pilotage (signataires du Safe uniquement).

export async function GET(req: Request) {
  return NextResponse.json({ admin: adminIdentity(req) });
}

export async function POST(req: Request) {
  if (hasRedis() && (await rateLimited(`admin-login:${clientIp(req)}`, 10))) {
    return NextResponse.json({ error: 'Trop de tentatives, réessayez dans une minute.' }, { status: 429 });
  }
  const body = await req.json().catch(() => null);
  let token: string | null = null;
  try {
    token = await openSession(String(body?.address || ''), Number(body?.issuedAt), String(body?.signature || ''));
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
  if (!token) return NextResponse.json({ error: 'Accès refusé : signature invalide ou wallet absent des signataires du Safe.' }, { status: 403 });
  const res = NextResponse.json({ ok: true });
  res.headers.set('Set-Cookie', sessionCookie(token));
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.headers.set('Set-Cookie', clearedCookie);
  return res;
}
