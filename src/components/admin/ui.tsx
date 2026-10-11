'use client';
import { useState, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

// Petits composants partagés de la page de pilotage.

export const Card = ({ title, children, className = '' }: { title?: ReactNode; children: ReactNode; className?: string }) => (
  <section className={`bg-white/5 border border-white/10 rounded-2xl p-5 ${className}`}>
    {title && <h2 className="font-black uppercase text-xs tracking-wider mb-4 text-gray-300">{title}</h2>}
    {children}
  </section>
);

/** Bouton qui exécute une action asynchrone, affiche l'attente puis l'erreur éventuelle. */
export function ActionButton({ onClick, children, variant = 'ghost', confirm }: {
  onClick: () => Promise<unknown>; children: ReactNode; variant?: 'primary' | 'ghost' | 'danger'; confirm?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const styles = {
    primary: 'bg-[#00f2ff] text-black',
    ghost: 'border border-white/15 text-white hover:bg-white/10',
    danger: 'border border-red-400/40 text-red-300 hover:bg-red-400/10',
  }[variant];
  return (
    <span className="inline-flex flex-col">
      <button
        disabled={busy}
        onClick={async () => {
          if (confirm && !window.confirm(confirm)) return;
          setBusy(true);
          setError('');
          try { await onClick(); } catch (e: any) { setError(e.message); } finally { setBusy(false); }
        }}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider disabled:opacity-40 ${styles}`}
      >
        {busy && <Loader2 className="w-3 h-3 animate-spin" />} {children}
      </button>
      {error && <span className="text-[10px] text-red-400 mt-1 max-w-[220px]">{error}</span>}
    </span>
  );
}

export const Badge = ({ children, tone = 'gray' }: { children: ReactNode; tone?: 'gray' | 'green' | 'yellow' | 'red' | 'cyan' | 'purple' }) => {
  const tones = {
    gray: 'bg-white/10 text-gray-300', green: 'bg-green-500/15 text-green-300', yellow: 'bg-yellow-400/15 text-yellow-200',
    red: 'bg-red-500/15 text-red-300', cyan: 'bg-[#00f2ff]/15 text-[#7ff8ff]', purple: 'bg-[#bc13fe]/15 text-[#e3a0ff]',
  };
  return <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${tones[tone]}`}>{children}</span>;
};

export const fmtDate = (iso?: string) => (iso ? new Date(iso).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }) : '');
