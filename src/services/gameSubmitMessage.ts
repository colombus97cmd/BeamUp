// Message signé par le créateur pour soumettre un jeu à la vérification (voir src/app/api/games/submit/route.ts).
// Partagé entre le navigateur et le serveur : ne pas modifier l'un sans l'autre.
export const buildGameSubmitMessage = (address: string, zipCid: string, timestamp: number) =>
  `BeamUp : soumettre un jeu à la vérification\nWallet : ${address}\nFichier : ${zipCid}\nHorodatage : ${timestamp}`;
