import { redis, hashToObject } from './redis';

// Réglages des agents, modifiables depuis la page de pilotage. Tous désactivés par défaut.

export interface AgentSettings {
  tournamentAgent: boolean;   // l'agent des tournois crée et annonce seul les tournois
  moderationAgent: boolean;   // l'agent modérateur balaie et masque les commentaires
  promotionAgent: boolean;    // l'agent promotionnel prépare ses propositions chaque semaine
  promoAutoDiscord: boolean;  // publier sans validation les posts Discord de l'agent promotionnel
}

export const SETTINGS_KEY = 'beam:v1:settings:agents';
export const SETTING_KEYS: (keyof AgentSettings)[] = ['tournamentAgent', 'moderationAgent', 'promotionAgent', 'promoAutoDiscord'];

export async function getSettings(): Promise<AgentSettings> {
  const [flat] = await redis([['HGETALL', SETTINGS_KEY]]);
  const s = hashToObject(flat);
  return Object.fromEntries(SETTING_KEYS.map((k) => [k, s[k] === '1'])) as unknown as AgentSettings;
}

export async function setSetting(key: keyof AgentSettings, value: boolean) {
  await redis([['HSET', SETTINGS_KEY, key, value ? '1' : '0']]);
}
