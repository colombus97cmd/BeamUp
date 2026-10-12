'use client';
import { useEffect, useRef, useState } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { Loader2, ShieldAlert, ShieldCheck, ShieldQuestion, Upload } from 'lucide-react';
import { uploadToIPFS } from '../../services/pinata';
import { submitGame } from '../../services/gameSubmit';
import { useActiveChainId } from '../../hooks/useActiveChainId';
import { api } from './AdminConsole';
import { Card, ActionButton, Badge, fmtDate } from './ui';

// Validation des jeux soumis : rapport de la vérification automatique + avis de l'agent vérificateur.
// Seul un jeu approuvé ici peut être joué sur BeamUp.
// « Mettre à jour » : nouveau zip pour un jeu déjà publié (même œuvre sur la blockchain, achats conservés) ;
// la mise à jour passe par la même vérification et ne remplace la version servie qu'une fois approuvée.

const STATUS_TONE: Record<string, 'gray' | 'green' | 'yellow' | 'red'> = { en_attente: 'yellow', approuvé: 'green', rejeté: 'red', refusé: 'red' };
const VERDICT = {
  sûr: { icon: ShieldCheck, color: 'text-green-400' },
  à_surveiller: { icon: ShieldQuestion, color: 'text-yellow-400' },
  dangereux: { icon: ShieldAlert, color: 'text-red-400' },
} as const;

export default function GamesAdmin() {
  const [subs, setSubs] = useState<any[] | null>(null);
  const [filter, setFilter] = useState<'en_attente' | 'tout'>('en_attente');
  const [error, setError] = useState('');
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const chainId = useActiveChainId();
  const fileInput = useRef<HTMLInputElement>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [progress, setProgress] = useState('');

  const sendUpdate = async (originalCid: string, file: File) => {
    setUpdating(originalCid);
    setError('');
    try {
      if (!address) throw new Error('Connectez votre wallet.');
      setProgress('Envoi du zip…');
      const zipCid = await uploadToIPFS(file, address, signMessageAsync, (p) => setProgress(`Envoi du zip… ${p} %`), { private: true, chainId });
      setProgress('Vérification…');
      await submitGame(zipCid, '', address, signMessageAsync, chainId, originalCid);
      setProgress('Mise à jour soumise : elle apparaît dans « À valider ».');
      setFilter('en_attente');
      await load();
    } catch (e: any) {
      setProgress('');
      setError(e?.shortMessage || e?.message || 'Échec de la mise à jour');
    } finally {
      setUpdating(null);
    }
  };

  const load = () => api('/api/games/admin').then((d) => setSubs(d.submissions)).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const decide = async (cid: string, action: 'approve' | 'reject', warn: boolean) => {
    const note = window.prompt(action === 'approve'
      ? (warn ? 'L\'agent a signalé des risques. Note de validation (obligatoire) :' : 'Note de validation (facultative) :')
      : 'Raison du rejet :', '');
    if (note === null || (warn && action === 'approve' && !note.trim())) return;
    await api('/api/games/admin', 'POST', { cid, action, note });
    await load();
  };

  if (error && !subs) return <p className="text-red-400 text-sm">{error}</p>;
  if (!subs) return <Loader2 className="w-5 h-5 animate-spin text-gray-500" />;
  const shown = subs.filter((s) => filter === 'tout' || s.status === 'en_attente');

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500 leading-relaxed max-w-3xl">
        Chaque jeu est inspecté automatiquement (types de fichiers, contenu réel, bombes zip, chemins piégés), puis relu par l&apos;agent vérificateur.
        Approuvé, il tourne isolé sur le domaine des jeux, sans accès à BeamUp ni au wallet des joueurs.
      </p>
      {error && <p className="text-red-400 text-sm whitespace-pre-wrap">{error}</p>}
      {progress && <p className="text-sm text-[#7ff8ff]">{progress}</p>}
      <input ref={fileInput} type="file" accept=".zip,application/zip" className="hidden" onChange={(e) => {
        const f = e.target.files?.[0];
        const target = fileInput.current?.dataset.target;
        e.target.value = '';
        if (f && target) sendUpdate(target, f);
      }} />
      <div className="flex gap-2">
        {(['en_attente', 'tout'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider ${filter === f ? 'bg-white text-black' : 'bg-white/5 text-gray-400'}`}>
            {f === 'en_attente' ? 'À valider' : 'Historique'}
          </button>
        ))}
      </div>

      {shown.length === 0 ? <p className="text-sm text-gray-500">Aucun jeu à valider.</p> : shown.map((s) => {
        const v = s.review ? VERDICT[s.review.verdict as keyof typeof VERDICT] : null;
        const VIcon = v?.icon;
        const risky = s.review?.verdict !== 'sûr' || s.findings?.some((f: any) => f.severity === 'élevée');
        return (
          <Card key={s.id} title={<span className="flex flex-wrap items-center gap-2">{s.title} <Badge tone={STATUS_TONE[s.status]}>{s.status.replace('_', ' ')}</Badge>{s.updateOf && <Badge tone="cyan">mise à jour</Badge>}</span>}>
            <p className="text-[11px] text-gray-500 font-mono break-all mb-3">
              {fmtDate(s.createdAt)} · créateur {s.creator} · {s.files} fichiers · {Math.round(s.totalBytes / 1024)} Ko{s.cid ? ` · ${s.cid}` : ''}
            </p>

            {s.errors?.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-bold text-red-300 mb-1">Refus automatique</p>
                <ul className="text-xs text-red-200/80 list-disc pl-5 space-y-0.5">{s.errors.slice(0, 15).map((e: string) => <li key={e}>{e}</li>)}</ul>
              </div>
            )}

            {s.review && VIcon && (
              <div className="mb-3 p-3 rounded-xl bg-black/30 border border-white/10">
                <p className={`text-xs font-bold flex items-center gap-2 ${v!.color}`}><VIcon className="w-4 h-4" /> Agent vérificateur : {s.review.verdict.replace('_', ' ')}</p>
                <p className="text-sm text-gray-300 mt-2 leading-relaxed">{s.review.summary}</p>
                {s.review.concerns?.length > 0 && (
                  <ul className="text-xs text-gray-400 list-disc pl-5 mt-2 space-y-1">
                    {s.review.concerns.map((c: any, i: number) => <li key={i}><strong>[{c.severity}]</strong> {c.file} : {c.issue}</li>)}
                  </ul>
                )}
              </div>
            )}

            {s.findings?.length > 0 && (
              <details className="mb-3">
                <summary className="text-xs text-gray-400 cursor-pointer">{s.findings.length} motif(s) repéré(s) par l&apos;analyse automatique</summary>
                <ul className="text-xs text-gray-400 mt-2 space-y-2">
                  {s.findings.map((f: any, i: number) => (
                    <li key={i}><Badge tone={f.severity === 'élevée' ? 'red' : 'yellow'}>{f.severity}</Badge> {f.issue} — {f.file}<br /><code className="text-[10px] text-gray-500 break-all">…{f.excerpt}…</code></li>
                  ))}
                </ul>
              </details>
            )}
            {s.externalDomains?.length > 0 && <p className="text-xs text-gray-500 mb-3">Domaines contactés : {s.externalDomains.join(', ')}</p>}
            {s.note && <p className="text-xs text-gray-400 mb-3">Note : {s.note} {s.decidedBy ? `(${String(s.decidedBy).slice(0, 10)}…)` : ''}</p>}

            {s.cid && s.status !== 'refusé' && (
              <div className="flex flex-wrap gap-2">
                {s.status !== 'approuvé' && <ActionButton variant="primary" onClick={() => decide(s.cid, 'approve', risky)}>Approuver</ActionButton>}
                {s.status !== 'rejeté' && <ActionButton variant="danger" onClick={() => decide(s.cid, 'reject', false)}>{s.status === 'approuvé' ? 'Retirer' : 'Rejeter'}</ActionButton>}
                {s.status === 'approuvé' && !s.updateOf && (
                  <ActionButton onClick={async () => { if (fileInput.current) { fileInput.current.dataset.target = s.cid; fileInput.current.click(); } }}>
                    {updating === s.cid ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />} Mettre à jour (nouveau zip)
                  </ActionButton>
                )}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
