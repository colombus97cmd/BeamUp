'use client';
import { useState } from 'react';
import { useSignMessage } from 'wagmi';
import { ExternalLink, Loader2, X } from 'lucide-react';
import { workLinksMessage, MAX_LINKS, KNOWN_SITES, type WorkLink } from '../lib/workInfo';

// Liens externes d'une œuvre (écoute sur les plateformes, achat ailleurs) : visibles par tous,
// modifiables par le créateur (signature de son wallet, sans transaction).

interface Props {
  work: { ipfsCID: string; creator: string; chainId: number; workId: number };
  links: WorkLink[];
  address?: string;
  onSaved: (cid: string, links: WorkLink[]) => void;
}

export default function WorkLinks({ work, links, address, onSaved }: Props) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { signMessageAsync } = useSignMessage();
  const isCreator = Boolean(address && address.toLowerCase() === work.creator?.toLowerCase());
  if (!links.length && !isCreator) return null;

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      const issuedAt = Date.now();
      const signature = await signMessageAsync({ message: workLinksMessage(address!, work.ipfsCID, issuedAt) });
      const res = await fetch('/api/works/links', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chainId: work.chainId, workId: work.workId, links: draft.split('\n'), address, issuedAt, signature }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      onSaved(work.ipfsCID, data.links);
      setEditing(false);
    } catch (e: any) {
      setError(e?.shortMessage || e?.message || 'Signature refusée');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="flex flex-col items-center gap-2 group" aria-expanded={open} aria-label="Écouter ailleurs">
        <div className={`p-3 md:p-4 rounded-2xl border transition-all group-active:scale-90 shadow-2xl backdrop-blur-xl ${open ? 'bg-white text-black border-white' : 'bg-black/40 text-white border-white/10 hover:bg-white/10'}`}>
          <ExternalLink className="w-5 h-5 md:w-6 md:h-6" />
        </div>
        <span className="hidden md:block text-[9px] font-black uppercase tracking-widest text-gray-500">{links.length ? 'Ailleurs' : 'Liens'}</span>
      </button>

      {open && (
        <div className="absolute right-full mr-3 bottom-0 w-64 p-4 rounded-2xl bg-black/90 border border-white/15 backdrop-blur-xl text-left space-y-2 z-30">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Écouter ailleurs</p>
            <button onClick={() => { setOpen(false); setEditing(false); }} aria-label="Fermer" className="text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
          </div>
          {!editing && (links.length ? (
            <ul className="space-y-1.5">
              {links.map((l) => (
                <li key={l.url}><a href={l.url} target="_blank" rel="noopener noreferrer nofollow" className="flex items-center gap-2 text-sm text-[#00f2ff] hover:underline"><ExternalLink className="w-3.5 h-3.5" /> {l.label}</a></li>
              ))}
            </ul>
          ) : <p className="text-xs text-gray-500">Aucun lien pour l&apos;instant.</p>)}
          {isCreator && !editing && (
            <button onClick={() => { setDraft(links.map((l) => l.url).join('\n')); setEditing(true); }} className="text-[10px] font-black uppercase tracking-wider text-gray-400 hover:text-white">
              Modifier mes liens
            </button>
          )}
          {editing && (
            <div className="space-y-2">
              <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={4} placeholder="Un lien par ligne (https://distrokid.com/hyperfollow/…)" className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs outline-none focus:border-[#00f2ff]" />
              <p className="text-[10px] text-gray-500 leading-relaxed">{MAX_LINKS} liens maximum. Sites acceptés : {KNOWN_SITES.join(', ')}.</p>
              {error && <p className="text-[10px] text-red-400">{error}</p>}
              <button onClick={save} disabled={busy} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#00f2ff] text-black text-[10px] font-black uppercase disabled:opacity-40">
                {busy && <Loader2 className="w-3 h-3 animate-spin" />} Enregistrer (signature)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
