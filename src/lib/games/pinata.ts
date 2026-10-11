// Accès serveur au réseau IPFS privé de Pinata pour les jeux.
// Pinata ne gère pas les dossiers privés : chaque fichier du jeu est envoyé séparément,
// et un manifeste (lui aussi privé) relie chaque chemin à son CID.

const jwt = () => {
  const j = process.env.PINATA_JWT;
  if (!j) throw new Error('PINATA_JWT manquant');
  return j;
};
const gateway = () => process.env.PINATA_GATEWAY || 'coffee-tremendous-crayfish-424.mypinata.cloud';

/** Envoie un fichier sur le réseau privé. Renvoie son CID. */
export async function uploadPrivate(bytes: Uint8Array, rawName: string, keyvalues: Record<string, string> = {}): Promise<string> {
  // Une barre oblique dans le nom ferait créer un dossier par Pinata (le CID serait celui du dossier) : on la remplace.
  const name = rawName.replace(/[\/]/g, '__');
  const form = new FormData();
  form.append('file', new Blob([bytes as BlobPart]), name);
  form.append('network', 'private');
  form.append('name', name);
  if (Object.keys(keyvalues).length) form.append('keyvalues', JSON.stringify(keyvalues));
  const res = await fetch('https://uploads.pinata.cloud/v3/files', {
    method: 'POST',
    headers: { Authorization: `Bearer ${jwt()}` },
    body: form,
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) throw new Error(`Pinata upload ${res.status}: ${await res.text()}`);
  return (await res.json()).data.cid;
}

/** Lien de téléchargement temporaire vers un fichier privé. */
export async function privateLink(cid: string, seconds: number): Promise<string> {
  const res = await fetch('https://api.pinata.cloud/v3/files/private/download_link', {
    method: 'POST',
    headers: { Authorization: `Bearer ${jwt()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: `https://${gateway()}/files/${cid}`, expires: seconds, date: Math.floor(Date.now() / 1000), method: 'GET' }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Pinata lien ${res.status}`);
  return (await res.json()).data;
}

/** Télécharge un fichier privé en mémoire, en refusant ce qui dépasse `maxBytes`. */
export async function downloadPrivate(cid: string, maxBytes: number): Promise<Uint8Array> {
  const res = await fetch(await privateLink(cid, 600), { signal: AbortSignal.timeout(120_000) });
  if (!res.ok || !res.body) throw new Error(`Téléchargement impossible (${res.status})`);
  const declared = Number(res.headers.get('content-length') || 0);
  if (declared > maxBytes) throw new Error('Fichier trop lourd');
  const chunks: Uint8Array[] = [];
  let total = 0;
  const reader = res.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) { await reader.cancel(); throw new Error('Fichier trop lourd'); }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) { out.set(c, offset); offset += c.byteLength; }
  return out;
}

/** Supprime un fichier privé à partir de son CID (zip déposé, une fois traité). */
export async function deletePrivateByCid(cid: string) {
  const lookup = await fetch(`https://api.pinata.cloud/v3/files/private?cid=${encodeURIComponent(cid)}&limit=10`, {
    headers: { Authorization: `Bearer ${jwt()}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (!lookup.ok) return;
  const files: { id: string }[] = (await lookup.json())?.data?.files || [];
  await Promise.all(files.map((f) => fetch(`https://api.pinata.cloud/v3/files/private/${f.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${jwt()}` },
  }).catch(() => null)));
}
