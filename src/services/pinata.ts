export const uploadToIPFS = (file: File, onProgress?: (percent: number) => void): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      console.log("Transmission directe vers le réseau IPFS via XHR...");
      const jwt = process.env.NEXT_PUBLIC_PINATA_JWT;
      if (!jwt) throw new Error("Clé d'API Pinata manquante dans l'environnement client.");

      const formData = new FormData();
      formData.append('file', file);
      formData.append('pinataMetadata', JSON.stringify({ name: file.name }));
      formData.append('pinataOptions', JSON.stringify({ cidVersion: 0 }));

      const xhr = new XMLHttpRequest();
      xhr.open('POST', "https://api.pinata.cloud/pinning/pinFileToIPFS");
      xhr.setRequestHeader('Authorization', `Bearer ${jwt}`);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          onProgress(percentComplete);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const result = JSON.parse(xhr.responseText);
          console.log("Sauvegarde IPFS réussie ! CID:", result.IpfsHash);
          resolve(result.IpfsHash);
        } else {
          let errData;
          try { errData = JSON.parse(xhr.responseText); } catch(e) { errData = { error: xhr.responseText }; }
          reject(new Error(errData.error || `Erreur IPFS (${xhr.status})`));
        }
      };

      xhr.onerror = () => reject(new Error("Erreur réseau XHR lors de l'upload Pinata."));
      xhr.send(formData);

    } catch (error) {
      console.error('Erreur Upload IPFS Direct:', error);
      reject(error);
    }
  });
};