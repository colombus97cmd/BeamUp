// Message que le wallet signe pour prouver qu'il appartient au joueur (valable 10 minutes côté serveur).
// Partagé entre le navigateur (signature) et le serveur (vérification) : ne pas modifier l'un sans l'autre.
export const walletMessage = (address: string, issuedAt: number) =>
  `BeamUp — je confirme être le propriétaire de ${address.toLowerCase()} pour gérer mes préférences de contact.\nDate : ${issuedAt}`;
