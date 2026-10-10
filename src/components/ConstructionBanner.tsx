'use client';
import { useEffect, useState } from 'react';
import { Construction, ChevronDown } from 'lucide-react';

const STORAGE_KEY = 'beam_construction_banner_minimized';

// Bandeau flottant « Site en construction », affiché sur toutes les pages.
// Le visiteur peut le réduire en pastille ; ce choix est mémorisé dans son navigateur.
export default function ConstructionBanner() {
  const [minimized, setMinimized] = useState(false);

  useEffect(() => {
    try {
      setMinimized(localStorage.getItem(STORAGE_KEY) === '1');
    } catch {}
  }, []);

  const toggle = (value: boolean) => {
    setMinimized(value);
    try {
      localStorage.setItem(STORAGE_KEY, value ? '1' : '0');
    } catch {}
  };

  const stripes = {
    backgroundImage: 'repeating-linear-gradient(-45deg, #facc15 0 12px, #0a0a0a 12px 24px)',
  };

  const floatStyle = (
    <style jsx global>{`
      @keyframes construction-float {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-6px); }
      }
      .animate-construction-float { animation: construction-float 4s ease-in-out infinite; }
      @media (prefers-reduced-motion: reduce) {
        .animate-construction-float { animation: none; }
      }
    `}</style>
  );

  if (minimized) {
    return (
      <>
      <button
        onClick={() => toggle(false)}
        className="fixed bottom-4 right-4 z-[9000] flex items-center gap-2 pl-2 pr-4 py-2 rounded-full bg-[#0a0a0a] border border-yellow-400/60 shadow-[0_0_25px_rgba(250,204,21,0.25)] animate-construction-float"
        aria-label="Afficher le message site en construction"
      >
        <span className="w-7 h-7 rounded-full flex items-center justify-center" style={stripes}>
          <Construction className="w-4 h-4 text-black bg-yellow-400 rounded-full p-0.5" />
        </span>
        <span className="text-[10px] font-black uppercase tracking-widest text-yellow-400">En construction</span>
      </button>
      {floatStyle}
      </>
    );
  }

  return (
    <>
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-[360px] z-[9000] animate-construction-float">
      <div className="rounded-2xl overflow-hidden bg-[#0a0a0a]/95 backdrop-blur-xl border border-yellow-400/40 shadow-[0_0_40px_rgba(250,204,21,0.2)]">
        <div className="h-2.5" style={stripes} />
        <div className="p-4 flex gap-3">
          <div className="w-10 h-10 flex-shrink-0 rounded-xl bg-yellow-400 flex items-center justify-center">
            <Construction className="w-6 h-6 text-black" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black uppercase tracking-widest text-yellow-400 mb-1">Site en construction</p>
            <p className="text-[11px] text-gray-300 leading-relaxed">
              BeamUp évolue chaque semaine. La publication, les pourboires et les achats fonctionnent déjà ; les œuvres en NFT et le streaming payant arrivent bientôt.
            </p>
          </div>
          <button
            onClick={() => toggle(true)}
            className="self-start p-1 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Réduire"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
    {floatStyle}
    </>
  );
}
