import { askJSON, hasClaude } from './claude';
import { BEAMUP_FACTS } from './promotion';

// Textes des vidéos promotionnelles tournées chaque semaine par le robot de tournage (tools/video).
// L'agent rédige les sous-titres incrustés et le texte du post ; le code borne la longueur des lignes
// pour qu'elles tiennent à l'écran (1080 px de large).

export interface VideoScript {
  captions: [string, string][];  // 4 sous-titres de deux lignes, affichés successivement pendant la partie
  postText: string;              // texte du post (TikTok, Reels, Facebook)
  hashtags: string[];
}

const MAX_LINE = 30;

export const DEFAULT_SCRIPT: VideoScript = {
  captions: [
    ['La Résistance de 1802', 'contre l’Empire'],
    ['Affronte l’IA impériale', 'ou un joueur en ligne'],
    ['Édition complète', 'sur BeamUp'],
    ['Prix fixe : 4,99 € ou 5 $', 'Installable sur PC et mobile'],
  ],
  postText: "Chains & Crowns : un jeu d'échecs inspiré de la résistance guadeloupéenne de 1802. Démo gratuite, édition complète sur BeamUp.",
  hashtags: ['ChainsAndCrowns', 'Guadeloupe', 'JeuIndé', 'Échecs', 'BeamUp'],
};

const SCHEMA = {
  type: 'object',
  properties: {
    captions: { type: 'array', items: { type: 'object', properties: { line1: { type: 'string' }, line2: { type: 'string' } }, required: ['line1', 'line2'], additionalProperties: false } },
    postText: { type: 'string' },
    hashtags: { type: 'array', items: { type: 'string' } },
  },
  required: ['captions', 'postText', 'hashtags'],
  additionalProperties: false,
};

const fits = (s: string) => s.trim().length > 0 && s.trim().length <= MAX_LINE;

/** Textes de la vidéo de la semaine. En cas d'échec ou de texte trop long, les textes par défaut sont utilisés. */
export async function weeklyVideoScript(previous: string[]): Promise<{ script: VideoScript; source: 'agent' | 'défaut' }> {
  if (!hasClaude()) return { script: DEFAULT_SCRIPT, source: 'défaut' };
  try {
    const r = await askJSON<{ captions: { line1: string; line2: string }[]; postText: string; hashtags: string[] }>({
      system: `Tu es l'agent promotionnel de BeamUp. Tu écris les textes d'une courte vidéo verticale (45 s) montrant une partie de Chains & Crowns.\n\n${BEAMUP_FACTS}\n\nRègles : honnêteté stricte (seulement les faits fournis), aucun NFT présenté comme un placement, aucune promesse de gain, ton fier et chaleureux, français simple. Les prix de l'édition complète sont fixes : 4,99 € (EURI) ou 5 $ (USDC).`,
      prompt:
        `Écris exactement 4 sous-titres de deux lignes (chaque ligne : ${MAX_LINE} caractères au maximum, espaces compris), affichés l'un après l'autre pendant la partie : ` +
        `1) l'histoire (1802, Résistance contre Empire), 2) ce que l'on fait dans le jeu, 3) l'édition complète sur BeamUp (prix fixe), 4) un appel à l'action vers BeamUp. ` +
        `Attention : la démo gratuite n'existe que sur le portfolio de David ; sur BeamUp, seule l'édition complète payante est proposée. N'écris jamais « démo gratuite sur BeamUp ». ` +
        `Puis le texte du post (2 phrases au plus) et 4 à 6 hashtags sans le signe #.\n` +
        `Varie par rapport aux vidéos précédentes :\n${previous.slice(0, 6).map((p) => `- ${p}`).join('\n') || '(aucune)'}`,
      schema: SCHEMA,
      effort: 'medium',
    });
    const captions = r.captions.slice(0, 4).map((c) => [c.line1.trim(), c.line2.trim()] as [string, string]);
    if (captions.length !== 4 || !captions.every(([a, b]) => fits(a) && fits(b))) return { script: DEFAULT_SCRIPT, source: 'défaut' };
    const hashtags = r.hashtags.map((h) => h.replace(/^#/, '').replace(/\s+/g, '')).filter(Boolean).slice(0, 6);
    return { script: { captions, postText: r.postText.trim().slice(0, 500), hashtags }, source: 'agent' };
  } catch {
    return { script: DEFAULT_SCRIPT, source: 'défaut' };
  }
}
