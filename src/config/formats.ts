import { Music, Clapperboard, BookOpen, Film, Sparkles, Image as ImageIcon, Gamepad2, type LucideIcon } from 'lucide-react';

// Formats d'œuvres proposés aux créateurs.
// `id` est la valeur enregistrée on-chain dans `category` : ne pas la renommer
// une fois des œuvres publiées, sinon elles ne seraient plus reconnues.
export type MediaKind = 'audio' | 'video' | 'scroll' | 'image' | 'game';

export interface WorkFormat {
  id: string;
  label: string;
  tagline: string;
  kind: MediaKind;
  accept: string;
  hex: string;
  glow: string;
  icon: LucideIcon;
}

export const FORMATS: WorkFormat[] = [
  { id: 'Musique', label: 'Musique', tagline: 'Singles, EP, beats, podcasts', kind: 'audio', accept: 'audio/*', hex: '#bc13fe', glow: 'rgba(188, 19, 254, 0.4)', icon: Music },
  { id: 'Clip', label: 'Clip musical', tagline: 'Vos clips en streaming', kind: 'video', accept: 'video/*', hex: '#ff2d95', glow: 'rgba(255, 45, 149, 0.4)', icon: Clapperboard },
  { id: 'Manga', label: 'Manga & Webtoon', tagline: 'Lecture verticale, chapitre par chapitre', kind: 'scroll', accept: 'image/*', hex: '#ffd700', glow: 'rgba(255, 215, 0, 0.4)', icon: BookOpen },
  { id: 'Court-metrage', label: 'Court métrage', tagline: 'Films, docs, séries courtes', kind: 'video', accept: 'video/*', hex: '#00f2ff', glow: 'rgba(0, 242, 255, 0.4)', icon: Film },
  { id: 'Animation', label: 'Animation', tagline: '2D, 3D, motion design', kind: 'video', accept: 'video/*', hex: '#00ff9d', glow: 'rgba(0, 255, 157, 0.4)', icon: Sparkles },
  // Jeu web (HTML5, Unity WebGL, Godot…) déposé en zip : vérifié, validé par un signataire du Safe,
  // puis servi isolé depuis le domaine des jeux (voir src/lib/games/).
  { id: 'Jeu', label: 'Jeu vidéo', tagline: 'Jeux web : HTML5, Unity WebGL, Godot (zip)', kind: 'game', accept: '.zip,application/zip', hex: '#7cff4f', glow: 'rgba(124, 255, 79, 0.4)', icon: Gamepad2 },
  { id: 'GIF', label: 'GIF & Loops', tagline: 'Boucles, stickers, art animé', kind: 'image', accept: 'image/gif,image/webp,image/png', hex: '#ff8a00', glow: 'rgba(255, 138, 0, 0.4)', icon: ImageIcon },
];

// Anciennes catégories déjà enregistrées on-chain avant l'ajout des formats.
const LEGACY: Record<string, string> = {
  video: 'Court-metrage',
  'vidéo': 'Court-metrage',
  comic: 'Manga',
  bd: 'Manga',
  webtoon: 'Manga',
};

export const getFormat = (category?: string): WorkFormat => {
  const c = (category || '').trim();
  const direct = FORMATS.find((f) => f.id.toLowerCase() === c.toLowerCase());
  if (direct) return direct;
  const legacy = LEGACY[c.toLowerCase()] || (c.toLowerCase().includes('vid') ? 'Court-metrage' : undefined);
  return FORMATS.find((f) => f.id === legacy) || FORMATS.find((f) => f.id === 'GIF')!;
};
