export const uploadToIPFS = async (file: File) => {
  try {
    console.log("Transmission directe vers le réseau IPFS (Contournement Proxy Vercel)...");

    const jwt = process.env.NEXT_PUBLIC_PINATA_JWT;
    if (!jwt) throw new Error("Clé d'API Pinata manquante dans l'environnement client.");

    const formData = new FormData();
    formData.append('file', file);
    formData.append('pinataMetadata', JSON.stringify({ name: file.name }));
    formData.append('pinataOptions', JSON.stringify({ cidVersion: 0 }));

    const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwt}`
      },
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try { errorData = JSON.parse(errorText); } catch(e) { errorData = { error: errorText }; }
      throw new Error(errorData.error || `Erreur IPFS (${response.status}) : ${errorText.substring(0, 50)}`);
    }

    const result = await response.json();
    console.log("Sauvegarde IPFS réussie ! CID:", result.IpfsHash);
    return result.IpfsHash;

  } catch (error) {
    console.error('Erreur Upload IPFS Direct:', error);
    throw error;
  }
};