'use client';
import { useEffect, useState } from 'react';
import { Swords, Loader2, CheckCircle2, CalendarDays, Users, Gift } from 'lucide-react';

// Tournoi en cours, organisé par l'agent des tournois. Inscription gratuite et ouverte à tous.

interface Tournament {
  id: string; name: string; startsAt: string; format: 'suisse' | 'elimination'; rounds: number;
  timeControlMinutes: number; capacity: number; registered: number; description: string;
  prizes: { label: string; sponsor: string }[];
}

const fmt = (iso: string) =>
  new Date(iso).toLocaleString('fr-FR', { timeZone: 'America/Guadeloupe', dateStyle: 'full', timeStyle: 'short' }) + ' (heure de Guadeloupe)';

export default function TournamentPanel() {
  const [t, setT] = useState<Tournament | null | undefined>(undefined);
  const [legal, setLegal] = useState('');
  const [form, setForm] = useState({ pseudo: '', email: '', discord: '', news: false, rules: false });
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    fetch('/api/tournaments').then((r) => r.json()).then((d) => { setT(d.tournament); setLegal(d.legal || ''); }).catch(() => setT(null));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch('/api/tournaments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      setStatus({ ok: true, text: data.already ? 'Vous êtes déjà inscrit.' : 'Inscription confirmée !' });
      if (!data.already) setT((x) => (x ? { ...x, registered: x.registered + 1 } : x));
    } catch (err: any) {
      setStatus({ ok: false, text: err.message });
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
          Aucun tournoi ouvert pour le moment. Le prochain sera annoncé ici, sur Discord et par mail aux abonnés des news. Les tournois sont toujours gratuits et ouverts à tous.
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

          <form className="space-y-3" onSubmit={submit}>
            <input className={input} placeholder="Pseudo de joueur" value={form.pseudo} onChange={(e) => setForm({ ...form, pseudo: e.target.value })} maxLength={20} required />
            <input className={input} type="email" placeholder="Adresse mail" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" />
            <input className={input} placeholder="ou pseudo Discord" value={form.discord} onChange={(e) => setForm({ ...form, discord: e.target.value.toLowerCase() })} />
            <label className="flex items-start gap-2 text-xs text-gray-400 leading-relaxed">
              <input type="checkbox" checked={form.rules} onChange={(e) => setForm({ ...form, rules: e.target.checked })} className="mt-0.5" required />
              J&apos;accepte le règlement : jeu loyal (aucune aide d&apos;un moteur d&apos;échecs ni d&apos;une autre personne), coordonnées utilisées uniquement pour ce tournoi et effacées sous 90 jours.
            </label>
            <label className="flex items-start gap-2 text-xs text-gray-400 leading-relaxed">
              <input type="checkbox" checked={form.news} onChange={(e) => setForm({ ...form, news: e.target.checked })} className="mt-0.5" />
              Je souhaite aussi recevoir les news et les prochains tournois (facultatif).
            </label>
            <button disabled={busy || t.registered >= t.capacity} className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#bc13fe] text-white font-black uppercase tracking-widest text-[10px] rounded-full disabled:opacity-40">
              {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} {t.registered >= t.capacity ? 'Complet' : 'M\'inscrire gratuitement'}
            </button>
          </form>
          {legal && <p className="text-[11px] text-gray-500 mt-3">{legal}</p>}
        </>
      )}

      {status && (
        <p className={`mt-3 text-sm flex items-center gap-2 ${status.ok ? 'text-green-400' : 'text-red-400'}`} role="status">
          {status.ok && <CheckCircle2 className="w-4 h-4" />} {status.text}
        </p>
      )}
    </div>
  );
}
