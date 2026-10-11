'use client';
import { useState } from 'react';
import Link from 'next/link';
import { EyeOff, Eye } from 'lucide-react';

// Commentaire masqué par la modération. Par transparence, le texte original reste consultable :
// au survol (souris), au toucher (mobile) ou au focus (clavier). Seule exception : un contenu illégal,
// que la loi impose à BeamUp de rendre inaccessible.

interface Props { reason: string; revealable: boolean; text: string }

export default function HiddenComment({ reason, revealable, text }: Props) {
  const [shown, setShown] = useState(false);

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-gray-500 italic flex items-start gap-2">
        <EyeOff className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <span>
          Commentaire masqué par la modération : {reason}{' '}
          <Link href="/charte" className="underline hover:text-gray-300">Charte</Link>
        </span>
      </p>
      {revealable ? (
        <div onMouseEnter={() => setShown(true)} onMouseLeave={() => setShown(false)}>
          <button
            type="button"
            onClick={() => setShown((v) => !v)}
            onFocus={() => setShown(true)}
            onBlur={() => setShown(false)}
            aria-expanded={shown}
            className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-gray-500 hover:text-gray-300"
          >
            <Eye className="w-3.5 h-3.5" /> Voir l&apos;original
          </button>
          {shown && (
            <p className="mt-2 text-xs text-gray-300 leading-relaxed border-l-2 border-white/10 pl-3" role="note">
              {text}
            </p>
          )}
        </div>
      ) : (
        <p className="text-[10px] text-gray-600">Contenu illégal : texte original non consultable.</p>
      )}
    </div>
  );
}
