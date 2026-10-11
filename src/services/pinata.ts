import { buildUploadMessage } from './uploadMessage';

type SignMessage = (args: { message: string }) => Promise<`0x${string}`>;

interface UploadOptions {
  /** Œuvre premium : envoi sur le réseau IPFS privé de Pinata (non lisible par un lien public). */
  private?: boolean;
  /** Réseau du wallet, pour vérifier la signature des smart wallets. */
  chainId?: number;
}

// 1. L'utilisateur signe un message avec son wallet (aucun frais, aucune transaction).
// 2. Le serveur vérifie la signature et renvoie soit une clé Pinata valable pour un seul upload,
//    soit (œuvre premium) une URL d'envoi signée vers le réseau privé.
// 3. Le fichier part directement du navigateur vers Pinata.
const authorizeUpload = async (address: string, signMessage: SignMessage, isPrivate: boolean, chainId?: number): Promise<{ jwt?: string; uploadUrl?: string }> => {
  const timestamp = Date.now();
  const signature = await signMessage({ message: buildUploadMessage(address, timestamp) });

  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, timestamp, signature, private: isPrivate, chainId }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || (!data.jwt && !data.uploadUrl)) {
    throw new Error(data.error || `Autorisation d'upload refusée (${res.status})`);
  }
  return data;
};

const send = (url: string, formData: FormData, headers: Record<string, string>, onProgress?: (percent: number) => void) =>
  new Promise<any>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        let errData;
        try { errData = JSON.parse(xhr.responseText); } catch { errData = { error: xhr.responseText }; }
        reject(new Error(errData.error?.reason || errData.error || `Erreur IPFS (${xhr.status})`));
      }
    };

    xhr.onerror = () => reject(new Error("Erreur réseau lors de l'upload Pinata."));
    xhr.send(formData);
  });

export const uploadToIPFS = async (
  file: File,
  address: string,
  signMessage: SignMessage,
  onProgress?: (percent: number) => void,
  options: UploadOptions = {}
): Promise<string> => {
  const auth = await authorizeUpload(address, signMessage, !!options.private, options.chainId);
  const formData = new FormData();
  formData.append('file', file);

  if (auth.uploadUrl) {
    formData.append('network', 'private');
    formData.append('name', file.name);
    const result = await send(auth.uploadUrl, formData, {}, onProgress);
    return result.data.cid;
  }

  formData.append('pinataMetadata', JSON.stringify({ name: file.name, keyvalues: { uploader: address } }));
  formData.append('pinataOptions', JSON.stringify({ cidVersion: 0 }));
  const result = await send('https://api.pinata.cloud/pinning/pinFileToIPFS', formData, { Authorization: `Bearer ${auth.jwt}` }, onProgress);
  return result.IpfsHash;
};
