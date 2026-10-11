import { buildGameSubmitMessage } from './gameSubmitMessage';

type SignMessage = (args: { message: string }) => Promise<`0x${string}`>;

/**
 * Soumet un jeu déjà déposé (zip privé) au vérificateur de BeamUp.
 * Renvoie le CID du manifeste à publier sur la blockchain, ou lève une erreur listant les refus.
 */
export async function submitGame(zipCid: string, title: string, address: string, signMessage: SignMessage, chainId: number): Promise<string> {
  const timestamp = Date.now();
  const signature = await signMessage({ message: buildGameSubmitMessage(address, zipCid, timestamp) });
  const res = await fetch('/api/games/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ zipCid, title, address, timestamp, signature, chainId }),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 422) throw new Error(`Jeu refusé par la vérification automatique :\n• ${(data.errors || []).slice(0, 8).join('\n• ')}`);
  if (!res.ok || !data.cid) throw new Error(data.error || `Vérification impossible (${res.status})`);
  return data.cid;
}
