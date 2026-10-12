'use client';
import { useEffect, useState } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { ConnectKitButton } from 'connectkit';
import { walletMessage } from '../lib/walletMessage';
import { Swords, Loader2, CheckCircle2, CalendarDays, Users, Gift, Trophy, Copy } from 'lucide-react';

// Tournoi en cours. Inscription gratuite, réservée aux possesseurs de l'édition complète (ou d'un pass saison) :
// le joueur signe un message avec le wallet de l'achat (aucune transaction, aucun frais), BeamUp vérifie l'achat sur la blockchain.

interface Tournament {
  id: string; name: string; startsAt: string; format: 'suisse' | 'elimination'; rounds: number;
  timeControlMinutes: number; capacity: number; registered: number; description: string;
  prizes: { label: string; sponsor: string }[];
  live: null | { status: 'running' | 'finished' | 'cancelled'; note: string | null; round: number; totalRounds: number; standings: { pseudo: string; score: number; rank: number }[] };
}

const fmt = (iso: string) =>
  new Date(iso).toLocaleString('fr-FR', { timeZone: 'America/Guadeloupe', dateStyle: 'full', timeStyle: 'short' }) + ' (heure de Guadeloupe)';

export default function TournamentPanel() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [t, setT] = useState<Tournament | null | undefined>(undefined);
  const [legal, setLegal] = useState('');
  const [form, setForm] = useState({ pseudo: '', email: '', discord: '', news: false, rules: false });
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [link, setLink] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/tournaments').then((r) => r.json()).then((d) => { setT(d.tournament); setLegal(d.legal || ''); }).catch(() => setT(null));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setStatus(null);
    try {
      const issuedAt = Date.now();
      const signature = await signMessageAsync({ message: walletMessage(address!, issuedAt) });
      const res = await fetch('/api/tournaments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, address, issuedAt, signature }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      setStatus({ ok: true, text: data.already ? 'Vous êtes déjà inscrit. Voici à nouveau votre lien.' : 'Inscription confirmée !' });
      if (data.link) setLink(data.link);
      if (!data.already) setT((x) => (x ? { ...x, registered: x.registered + 1 } : x));
    } catch (err: any) {
      setStatus({ ok: false, text: err?.shortMessage || err?.message || 'Signature refusée.' });
    } finally {
      setBusy(false);
    }
  };

  const input = 'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#bc13fe]';

  return (
    <div id="tournoi" className="scroll-mt-24 bg-[#bc13fe]/5 border border-[#bc13fe]/20 rounded-2xl p-5 md:p-6">
      <Swords className="w-5 h-5 text-[#bc13fe] mb-3" />
      <h3 className="font-black uppercase text-sm mb-2">Tournoi</h3>

      {t === undefined ? (
        <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
      ) : t === null ? (
        <p className="text-gray-400 text-sm leading-relaxed">
          Aucun tournoi ouvert pour le moment. Le prochain sera annoncé ici, sur Discord et par mail aux abonnés des news. Les tournois sont gratuits, réservés aux joueurs de l’édition complète.
        </p>
      ) : (
        <>
          <p className="text-lg font-black mb-1">{t.name}</p>
          <p className="text-gray-400 text-sm leading-relaxed mb-3">{t.description}</p>
          <ul className="text-xs text-gray-300 space-y-1.5 mb-4">
            <li className="flex gap-2"><CalendarDays className="w-4 h-4 text-[#bc13fe] shrink-0" /> {fmt(t.startsAt)}</li>
            <li className="flex gap-2"><Swords className="w-4 h-4 text-[#bc13fe] shrink-0" /> {t.format === 'suisse' ? `Système suisse, ${t.rounds} rondes` : 'Élimination directe'} · {t.timeControlMinutes} min par joueur</li>
            <li className="flex gap-2"><Users className="w-4 h-4 text-[#bc13fe] shrink-0" /> {t.registered} / {t.capacity} inscrits</li>
            {t.prizes.length > 0 && <li className="flex gap-2"><Gift className="w-4 h-4 text-[#bc13fe] shrink-0" /> {t.prizes.map((p) => `${p.label} (offert par ${p.sponsor})`).join(', ')}</li>}
          </ul>

          {t.live ? (
            <div className="space-y-2">
              <p className="text-sm font-bold flex items-center gap-2">
                <Trophy className="w-4 h-4 text-[#bc13fe]" />
                {t.live.status === 'running' ? `En cours : ronde ${t.live.round} / ${t.live.totalRounds}` : t.live.status === 'finished' ? 'Tournoi terminé' : `Annulé. ${t.live.note || ''}`}
              </p>
              {t.live.standings.length > 0 && (
                <ol className="text-xs text-gray-300 space-y-1">
                  {t.live.standings.map((p) => (
                    <li key={p.rank} className="flex justify-between gap-4 border-b border-white/5 pb-1"><span>{p.rank}. {p.pseudo}</span><span className="font-bold">{p.score} pt{p.score > 1 ? 's' : ''}</span></li>
                  ))}
                </ol>
              )}
              {t.live.status === 'running' && <p className="text-[11px] text-gray-500">Joueurs inscrits : ouvrez votre lien personnel pour jouer votre partie.</p>}
            </div>
          ) : (
          !isConnected ? (
            <div className="space-y-2">
              <p className="text-xs text-gray-400 leading-relaxed">Tournois gratuits, réservés aux joueurs de l&apos;édition complète. Connectez le wallet utilisé pour l&apos;achat.</p>
              <ConnectKitButton />
            </div>
          ) : (
          <form className="space-y-3" onSubmit={submit}>
            <input className={input} placeholder="Pseudo de joueur" value={form.pseudo} onChange={(e) => setForm({ ...form, pseudo: e.target.value })} maxLength={20} required />
            <input className={input} type="email" placeholder="Adresse mail" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" />
            <input className={input} placeholder="ou pseudo Discord" value={form.discord} onChange={(e) => setForm({ ...form, discord: e.target.value.toLowerCase() })} />
            <label className="flex items-start gap-2 text-xs text-gray-400 leading-relaxed">
              <input type="checkbox" checked={form.rules} onChange={(e) => setForm({ ...form, rules: e.target.checked })} className="mt-0.5" required />
              J&apos;accepte le <a href="/reglement-tournois" target="_blank" className="underline hover:text-white">règlement</a> : jeu loyal (aucune aide d&apos;un moteur d&apos;échecs ni d&apos;une autre personne), coordonnées utilisées uniquement pour ce tournoi et effacées sous 90 jours (sauf abonnement aux news).
            </label>
            <label className="flex items-start gap-2 text-xs text-gray-400 leading-relaxed">
              <input type="checkbox" checked={form.news} onChange={(e) => setForm({ ...form, news: e.target.checked })} className="mt-0.5" />
              Je souhaite aussi recevoir les news et les prochains tournois (facultatif).
            </label>
            <button disabled={busy || t.registered >= t.capacity} className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#bc13fe] text-white font-black uppercase tracking-widest text-[10px] rounded-full disabled:opacity-40">
              {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} {t.registered >= t.capacity ? 'Complet' : 'M\'inscrire gratuitement'}
            </button>
          </form>
          ))}
          {legal && <p className="text-[11px] text-gray-500 mt-3">{legal}</p>}
        </>
      )}

      {link && (
        <div className="mt-3 p-3 rounded-xl bg-black/40 border border-[#bc13fe]/30 text-xs text-gray-300 space-y-2">
          <p className="font-bold text-white">Votre lien personnel pour jouer</p>
          <p className="break-all text-[#e3a0ff]">{link}</p>
          <p className="text-gray-500">Gardez-le (il vous est aussi envoyé par mail si vous avez donné votre adresse) et ne le partagez pas. Ouvrez-le à l&apos;heure du début.</p>
          <button type="button" onClick={() => { navigator.clipboard?.writeText(link).then(() => setCopied(true)).catch(() => {}); }} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/15 text-[10px] font-black uppercase">
            <Copy className="w-3 h-3" /> {copied ? 'Copié' : 'Copier le lien'}
          </button>
        </div>
      )}

      {status && (
        <p className={`mt-3 text-sm flex items-center gap-2 ${status.ok ? 'text-green-400' : 'text-red-400'}`} role="status">
          {status.ok && <CheckCircle2 className="w-4 h-4" />} {status.text}
        </p>
      )}
    </div>
  );
}
