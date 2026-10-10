// Message signé par le wallet pour obtenir une clé d'upload temporaire (voir src/app/api/upload/route.ts).
export const buildUploadMessage = (address: string, timestamp: number) =>
  `BeamUp : autoriser l'envoi d'un fichier sur IPFS\nWallet : ${address}\nHorodatage : ${timestamp}`;
