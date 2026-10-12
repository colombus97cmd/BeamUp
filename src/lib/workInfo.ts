// Informations hors blockchain attachées à une œuvre, repérée par son CID (partagé par ses éditions euro et dollar) :
//  - liens d'écoute ou d'achat externes (DistroKid HyperFollow, Spotify, Steam…), modifiables par le créateur seul ;
//  - déclaration faite à la publication : acceptation des conditions des créateurs, adhésion à une société de gestion (Sacem…).
// Partagé entre le navigateur et le serveur : pas d'import serveur ici.

export interface WorkLink { label: string; url: string }

export const MAX_LINKS = 6;

/** Sites autorisés pour les liens externes (aucun raccourcisseur, aucun site inconnu : pas de phishing). */
const HOSTS: [RegExp, string][] = [
  [/(^|\.)distrokid\.com$/, 'DistroKid'],
  [/^open\.spotify\.com$/, 'Spotify'],
  [/^music\.apple\.com$/, 'Apple Music'],
  [/(^|\.)deezer\.com$/, 'Deezer'],
  [/^music\.youtube\.com$/, 'YouTube Music'],
  [/^(www\.)?youtube\.com$|^youtu\.be$/, 'YouTube'],
  [/(^|\.)soundcloud\.com$/, 'SoundCloud'],
  [/(^|\.)bandcamp\.com$/, 'Bandcamp'],
  [/(^|\.)tidal\.com$/, 'Tidal'],
  [/^music\.amazon\.[a-z.]+$/, 'Amazon Music'],
  [/(^|\.)qobuz\.com$/, 'Qobuz'],
  [/^store\.steampowered\.com$/, 'Steam'],
  [/(^|\.)itch\.io$/, 'itch.io'],
  [/(^|\.)webtoons\.com$/, 'Webtoon'],
  [/(^|\.)vimeo\.com$/, 'Vimeo'],
];

/** Lien accepté (https, site connu) avec son libellé, sinon null. */
export function checkLink(raw: string): WorkLink | null {
  try {
    const u = new URL(String(raw).trim());
    if (u.protocol !== 'https:' || u.username || u.password) return null;
    const host = u.hostname.toLowerCase();
    const known = HOSTS.find(([re]) => re.test(host));
    return known ? { label: known[1], url: u.toString().slice(0, 300) } : null;
  } catch {
    return null;
  }
}

export const KNOWN_SITES = HOSTS.map(([, label]) => label).filter((l, i, a) => a.indexOf(l) === i);

/** Message signé par le créateur pour modifier les liens d'une œuvre (vérifié côté serveur, valable 10 minutes). */
export const workLinksMessage = (address: string, cid: string, issuedAt: number) =>
  `BeamUp : modifier les liens de mon œuvre\nWallet : ${address.toLowerCase()}\nŒuvre : ${cid}\nDate : ${issuedAt}`;

/** Version des conditions des créateurs (page /conditions) acceptée à la publication. */
export const CREATOR_TERMS_VERSION = '2026-10-12';
