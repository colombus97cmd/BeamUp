// Message signé pour se connecter à la page de pilotage.
// Partagé entre le navigateur (signature) et le serveur (vérification) : ne pas modifier l'un sans l'autre.
export const adminMessage = (address: string, issuedAt: number) =>
  `BeamUp — connexion à la page de pilotage pour ${address.toLowerCase()}.\nDate : ${issuedAt}`;
