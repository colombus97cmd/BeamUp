'use client';
import { useRef, useState } from 'react';
import { Gamepad2, Play, Maximize2, X, Loader2 } from 'lucide-react';

// Lecteur de jeu : le jeu s'exécute dans une iframe « sandbox », chargée depuis le domaine des jeux
// (jamais celui de BeamUp) : il n'a accès ni aux cookies, ni au stockage, ni à la session de BeamUp,
// ne peut pas ouvrir de fenêtre ni changer la page de BeamUp.

interface Props {
  title: string;
  color: string;
  url?: string;
  loading?: boolean;
  error?: string | null;
  onPlay: () => void;
  onClose?: () => void;
}

export default function GameFrame({ title, color, url, loading, error, onPlay, onClose }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);

  if (!url || !started) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-5 p-8 text-center bg-black/70">
        <Gamepad2 className="w-14 h-14" style={{ color }} />
        <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight text-white line-clamp-2">{title}</h3>
        <button
          onClick={() => { if (url) setStarted(true); else onPlay(); }}
          disabled={loading}
          className="px-8 py-4 rounded-2xl text-black font-black uppercase tracking-widest text-[11px] flex items-center gap-3 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
          style={{ background: color }}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />} {url ? 'Lancer le jeu' : 'Jouer'}
        </button>
        {error && <p className="text-xs text-red-400 max-w-xs">{error}</p>}
        <p className="text-[10px] text-gray-500 max-w-xs leading-relaxed">Jeu vérifié par BeamUp, exécuté dans un espace isolé : il n&apos;a aucun accès à votre wallet ni à votre compte.</p>
      </div>
    );
  }

  return (
    <div ref={wrapRef} className="w-full h-full relative bg-black">
      <iframe
        src={url}
        title={title}
        className="w-full h-full border-0"
        sandbox="allow-scripts allow-same-origin allow-pointer-lock allow-modals allow-forms"
        allow="fullscreen; gamepad; autoplay"
        referrerPolicy="no-referrer"
      />
      <div className="absolute top-2 right-2 flex gap-2">
        <button onClick={() => wrapRef.current?.requestFullscreen?.()} aria-label="Plein écran" className="p-2 rounded-full bg-black/70 border border-white/20 text-white hover:bg-black">
          <Maximize2 className="w-4 h-4" />
        </button>
        <button onClick={() => { setStarted(false); onClose?.(); }} aria-label="Quitter le jeu" className="p-2 rounded-full bg-black/70 border border-white/20 text-white hover:bg-black">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
