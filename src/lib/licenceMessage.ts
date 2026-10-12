// Message signé par le wallet pour obtenir une licence ou télécharger la version Windows de Chains & Crowns.
// Partagé entre le navigateur (signature) et le serveur (vérification) : ne pas modifier l'un sans l'autre.
export const licenceMessage = (address: string, issuedAt: number) =>
  `BeamUp : vérifier mon achat de Chains & Crowns (version Windows)\nWallet : ${address.toLowerCase()}\nDate : ${issuedAt}`;
