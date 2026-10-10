import { buildUploadMessage } from './uploadMessage';

type SignMessage = (args: { message: string }) => Promise<`0x${string}`>;

// 1. L'utilisateur signe un message avec son wallet (aucun frais, aucune transaction).
// 2. Le serveur vérifie la signature et renvoie une clé Pinata valable pour un seul upload.
// 3. Le fichier part directement du navigateur vers Pinata avec cette clé.
const getUploadKey = async (address: string, signMessage: SignMessage): Promise<string> => {
  const timestamp = Date.now();
  const signature = await signMessage({ message: buildUploadMessage(address, timestamp) });

  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, timestamp, signature }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.jwt) {
    throw new Error(data.error || `Autorisation d'upload refusée (${res.status})`);
  }
  return data.jwt;
};

export const uploadToIPFS = async (
  file: File,
  address: string,
  signMessage: SignMessage,
  onProgress?: (percent: number) => void
): Promise<string> => {
  const jwt = await getUploadKey(address, signMessage);

  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('pinataMetadata', JSON.stringify({ name: file.name, keyvalues: { uploader: address } }));
    formData.append('pinataOptions', JSON.stringify({ cidVersion: 0 }));

    const xhr = new XMLHttpRequest();
    xhr.open('POST', "https://api.pinata.cloud/pinning/pinFileToIPFS");
    xhr.setRequestHeader('Authorization', `Bearer ${jwt}`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const result = JSON.parse(xhr.responseText);
        resolve(result.IpfsHash);
      } else {
        let errData;
        try { errData = JSON.parse(xhr.responseText); } catch { errData = { error: xhr.responseText }; }
        reject(new Error(errData.error?.reason || errData.error || `Erreur IPFS (${xhr.status})`));
      }
    };

    xhr.onerror = () => reject(new Error("Erreur réseau lors de l'upload Pinata."));
    xhr.send(formData);
  });
};
