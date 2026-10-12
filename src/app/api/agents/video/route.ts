import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { isCron, isAdmin } from '../../../../lib/security';
import { hasRedis } from '../../../../lib/redis';
import { weeklyVideoScript } from '../../../../lib/video';
import { listItems, saveItem, PromoItem } from '../../../../lib/promotion';
import { mailAdmin, SITE_URL } from '../../../../lib/notify';

// Robot de tournage (tools/video, lancé chaque semaine sur le PC de l'administrateur) :
//  GET  → textes de la vidéo de la semaine, rédigés par l'agent promotionnel ;
//  POST → réception de la vidéo montée (MP4, 4 Mo max), publiée sur IPFS et proposée dans /pilotage.
// Authentification : Authorization: Bearer CRON_SECRET (ou session d'un signataire du Safe).

export const maxDuration = 120;

const MAX_BYTES = 4 * 1024 * 1024; // limite du corps de requête des fonctions Vercel : 4,5 Mo
const GATEWAY = process.env.PINATA_GATEWAY || 'coffee-tremendous-crayfish-424.mypinata.cloud';

export async function GET(req: Request) {
  if (!isCron(req) && !isAdmin(req)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const previous = hasRedis() ? (await listItems()).filter((i) => i.kind === 'video').map((i) => i.text.split('\n')[0]) : [];
  return NextResponse.json(await weeklyVideoScript(previous));
}

export async function POST(req: Request) {
  if (!isCron(req) && !isAdmin(req)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  if (!hasRedis() || !process.env.PINATA_JWT) return NextResponse.json({ error: 'Stockage indisponible' }, { status: 503 });

  const form = await req.formData().catch(() => null);
  const video = form?.get('video');
  if (!(video instanceof File)) return NextResponse.json({ error: 'Vidéo manquante' }, { status: 400 });
  if (video.size > MAX_BYTES) return NextResponse.json({ error: 'Vidéo trop lourde (4 Mo maximum)' }, { status: 413 });
  const bytes = new Uint8Array(await video.arrayBuffer());
  // Contrôle du contenu réel : conteneur MP4 (« ftyp » à l'octet 4).
  if (String.fromCharCode(...bytes.slice(4, 8)) !== 'ftyp') return NextResponse.json({ error: 'Le fichier n\'est pas un MP4' }, { status: 400 });

  const title = String(form?.get('title') || 'Vidéo de la semaine').slice(0, 120);
  const postText = String(form?.get('postText') || '').slice(0, 500);
  const hashtags = String(form?.get('hashtags') || '').split(/[\s,]+/).filter(Boolean).slice(0, 8).map((h) => `#${h.replace(/^#/, '')}`);

  // Vidéo publique sur IPFS : les réseaux sociaux doivent pouvoir la télécharger depuis une adresse publique.
  const upload = new FormData();
  upload.append('file', new Blob([bytes as BlobPart], { type: 'video/mp4' }), `beamup-video-${Date.now()}.mp4`);
  upload.append('network', 'public');
  const res = await fetch('https://uploads.pinata.cloud/v3/files', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.PINATA_JWT}` },
    body: upload,
    signal: AbortSignal.timeout(90_000),
  });
  if (!res.ok) return NextResponse.json({ error: `Envoi IPFS refusé (${res.status})` }, { status: 502 });
  const cid = (await res.json()).data.cid as string;

  const item: PromoItem = {
    id: randomUUID(),
    kind: 'video',
    status: 'proposé',
    createdAt: new Date().toISOString(),
    channel: 'tiktok',
    title,
    text: [postText, hashtags.join(' ')].filter(Boolean).join('\n\n'),
    rationale: 'Vidéo verticale tournée automatiquement (partie de démonstration) : TikTok, Reels, Shorts, Facebook.',
    videoUrl: `https://${GATEWAY}/ipfs/${cid}`,
  };
  await saveItem(item);
  await mailAdmin('[BeamUp] Nouvelle vidéo à valider', `${title}\n\n${item.text}\n\nÀ valider sur ${SITE_URL}/pilotage (onglet Promotion).`).catch(() => {});
  return NextResponse.json({ ok: true, id: item.id, videoUrl: item.videoUrl });
}
