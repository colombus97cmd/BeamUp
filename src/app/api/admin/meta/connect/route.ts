import { NextResponse } from 'next/server';
import { adminIdentity } from '../../../../../lib/security';
import { createState, dialogUrl, hasMeta } from '../../../../../lib/meta';

// Début de la connexion : un signataire du Safe (session /pilotage) est redirigé vers la fenêtre d'autorisation de Meta.
export async function GET(req: Request) {
  const admin = adminIdentity(req);
  if (!admin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  if (!hasMeta()) return NextResponse.json({ error: 'META_APP_ID ou META_APP_SECRET manquant dans Vercel' }, { status: 503 });
  return NextResponse.redirect(dialogUrl(await createState(admin)));
}
