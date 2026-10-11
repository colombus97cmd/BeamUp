// Accès aux œuvres premium : le lecteur signe une fois par session (gratuit, sans transaction),
// puis le serveur vérifie on-chain qu'il détient le NFT avant de donner un lien temporaire.
export const SESSION_MAX_AGE_MS = 12 * 60 * 60 * 1000;

export const buildMediaSessionMessage = (address: string, timestamp: number) =>
  `BeamUp : ouvrir mes œuvres premium\nWallet : ${address}\nHorodatage : ${timestamp}`;

type SignMessage = (args: { message: string }) => Promise<`0x${string}`>;

const storageKey = (address: string) => `beam_media_session_${address.toLowerCase()}`;

async function getSession(address: string, signMessage: SignMessage) {
  try {
    const saved = JSON.parse(sessionStorage.getItem(storageKey(address)) || 'null');
    if (saved && Date.now() - saved.timestamp < SESSION_MAX_AGE_MS - 5 * 60 * 1000) return saved;
  } catch {}
  const timestamp = Date.now();
  const signature = await signMessage({ message: buildMediaSessionMessage(address, timestamp) });
  const session = { timestamp, signature };
  try { sessionStorage.setItem(storageKey(address), JSON.stringify(session)); } catch {}
  return session;
}

export async function requestPremiumMedia(chainId: number, workId: number, address: string, signMessage: SignMessage): Promise<string> {
  const session = await getSession(address, signMessage);
  const res = await fetch('/api/media', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chainId, workId, address, ...session }),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    try { sessionStorage.removeItem(storageKey(address)); } catch {}
  }
  if (!res.ok || !data.url) throw new Error(data.error || `Accès refusé (${res.status})`);
  return data.url;
}
