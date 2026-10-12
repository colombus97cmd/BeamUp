import { createHmac, createPrivateKey, createPublicKey, sign } from 'crypto';

// Licences de la version Windows de Chains & Crowns (édition complète).
// Une licence est délivrée à un wallet qui a acheté le jeu (vérifié sur la blockchain) ; elle est signée en Ed25519 :
// l'application la vérifie HORS LIGNE avec la clé publique intégrée, sans pouvoir en fabriquer.
// La clé privée n'est stockée nulle part : elle est dérivée de GAME_TOKEN_SECRET (séparation de domaine « licence »).

export const LICENCE_PRODUCT = 'chains-and-crowns-windows';
export const LICENCE_DAYS = 45;
/** Installateur Windows en cours : { cid (fichier privé Pinata), version, size, fileName, at }. */
export const WINDOWS_KEY = 'beam:v1:game:windows';

export { licenceMessage } from './licenceMessage';

const PKCS8_ED25519_PREFIX = Buffer.from('302e020100300506032b657004220420', 'hex');

function privateKey() {
  const s = process.env.GAME_TOKEN_SECRET;
  if (!s || s.length < 32) throw new Error('GAME_TOKEN_SECRET manquant');
  const seed = createHmac('sha256', s).update('licence-ed25519:v1').digest();
  return createPrivateKey({ key: Buffer.concat([PKCS8_ED25519_PREFIX, seed]), format: 'der', type: 'pkcs8' });
}

/** Clé publique (SPKI DER, base64) à intégrer dans l'application. */
export const licencePublicKey = () => (createPublicKey(privateKey()).export({ format: 'der', type: 'spki' }) as Buffer).toString('base64');

export function issueLicence(wallet: string) {
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({ v: 1, p: LICENCE_PRODUCT, w: wallet.toLowerCase(), iat: now, exp: now + LICENCE_DAYS * 86400 })).toString('base64url');
  const sig = sign(null, Buffer.from(payload), privateKey()).toString('base64url');
  return `${payload}.${sig}`;
}
