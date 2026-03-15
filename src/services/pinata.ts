export const uploadToIPFS = async (file: File) => {
  try {
    console.log("Envoi du fichier au serveur relais local...");

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch("/api/upload", {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Erreur lors de l upload');
    }

    const result = await response.json();
    console.log("Relais réussi ! CID:", result.IpfsHash);
    return result.IpfsHash;

  } catch (error) {
    console.error('Erreur Upload via Relais:', error);
    throw error;
  }
};