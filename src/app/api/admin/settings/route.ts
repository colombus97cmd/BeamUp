import { NextResponse } from 'next/server';
import { adminIdentity } from '../../../../lib/security';
import { setSetting, getSettings, SETTING_KEYS, AgentSettings } from '../../../../lib/settings';
import { logDecision } from '../../../../lib/moderationStore';

// Activation et arrêt des agents depuis la page de pilotage.

export async function POST(req: Request) {
  const admin = adminIdentity(req);
  if (!admin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const body = await req.json().catch(() => null);
  const key = body?.key as keyof AgentSettings;
  if (!SETTING_KEYS.includes(key) || typeof body?.value !== 'boolean') return NextResponse.json({ error: 'Réglage invalide' }, { status: 400 });
  await setSetting(key, body.value);
  await logDecision({ type: 'réglage', key, value: body.value, by: admin });
  return NextResponse.json({ settings: await getSettings() });
}
