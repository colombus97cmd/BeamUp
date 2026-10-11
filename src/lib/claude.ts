import Anthropic from '@anthropic-ai/sdk';

// Appel à Claude qui renvoie un JSON conforme à un schéma (sorties structurées).
// Clé : ANTHROPIC_API_KEY (variable d'environnement Vercel, jamais côté navigateur).
// Repli serveur : si le modèle décline une demande, l'API la relance sur le modèle de secours recommandé.

const MODEL = 'claude-opus-5-5';

let client: Anthropic | null = null;
const getClient = () => (client ??= new Anthropic());

export const hasClaude = () => Boolean(process.env.ANTHROPIC_API_KEY);

export class ClaudeRefusal extends Error {}

export async function askJSON<T>(opts: {
  system: string;
  prompt: string;
  schema: Record<string, unknown>;
  effort: 'low' | 'medium' | 'high';
  maxTokens?: number;
}): Promise<T> {
  const response = await getClient().beta.messages.create({
    model: MODEL,
    max_tokens: opts.maxTokens ?? 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: opts.effort, format: { type: 'json_schema', schema: opts.schema } },
    system: opts.system,
    messages: [{ role: 'user', content: opts.prompt }],
  });

  if (response.stop_reason === 'refusal') throw new ClaudeRefusal(response.stop_details?.explanation || 'Demande déclinée');
  if (response.stop_reason === 'max_tokens') throw new Error('Réponse tronquée (max_tokens)');

  const text = response.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('');
  return JSON.parse(text) as T;
}

/**
 * Recherche sur le web (outil serveur web_search) et renvoie la synthèse rédigée par Claude, sources comprises.
 * Les tours mis en pause par le serveur (pause_turn) sont repris automatiquement, 4 fois au plus.
 */
export async function research(opts: { system: string; prompt: string; maxSearches: number }): Promise<string> {
  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: 'user', content: opts.prompt }];
  let text = '';
  for (let turn = 0; turn < 5; turn++) {
    const response = await getClient().beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'medium' },
      system: opts.system,
      tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: opts.maxSearches }],
      messages,
    });
    if (response.stop_reason === 'refusal') throw new ClaudeRefusal(response.stop_details?.explanation || 'Demande déclinée');
    text += response.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('');
    if (response.stop_reason !== 'pause_turn') break;
    messages.push({ role: 'assistant', content: response.content });
  }
  return text;
}
