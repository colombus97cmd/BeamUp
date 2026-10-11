'use client';
import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { api, type Data } from './AdminConsole';
import { Card, ActionButton, fmtDate } from './ui';

interface Prize { id: string; label: string; sponsor: string }

export default function TournamentAdmin({ data, reload }: { data: Data; reload: () => void }) {
  const t = data.tournament;
  const [prizes, setPrizes] = useState<Prize[]>(data.prizes || []);
  const input = 'bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#bc13fe] min-w-0';

  const cancel = async () => {
    const message = window.prompt('Message envoyé aux inscrits :', 'Le tournoi est annulé. Toutes nos excuses, un nouveau tournoi sera annoncé bientôt.');
    if (message === null) return;
    await api('/api/tournaments/admin', 'POST', { action: 'cancel', message });
    reload();
  };

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card title="Tournoi en cours">
        {t ? (
          <div className="space-y-2 text-sm text-gray-300">
            <p className="text-lg font-black text-white">{t.name}</p>
            <p>{fmtDate(t.startsAt)} · {t.format === 'suisse' ? `suisse, ${t.rounds} rondes` : 'élimination directe'} · {t.timeControlMinutes} min</p>
            <p>{t.registered} / {t.capacity} inscrits · créé par {t.createdBy === 'agent' ? 'l\'agent' : 'un administrateur'}</p>
            <p className="text-gray-400">{t.description}</p>
            <div className="pt-2"><ActionButton variant="danger" onClick={cancel}>Annuler le tournoi</ActionButton></div>
          </div>
        ) : <p className="text-sm text-gray-500">Aucun tournoi en cours. L&apos;agent en proposera un lundi prochain s&apos;il est actif.</p>}
      </Card>

      <Card title="Lots des partenaires">
        <p className="text-xs text-gray-500 mb-3 leading-relaxed">L&apos;agent ne peut promettre que ces lots. Ils doivent être offerts par un partenaire, jamais financés par les joueurs.</p>
        <div className="space-y-2">
          {prizes.map((p, i) => (
            <div key={i} className="flex gap-2">
              <input className={`${input} flex-1`} placeholder="Lot" value={p.label} onChange={(e) => setPrizes(prizes.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
              <input className={`${input} w-32`} placeholder="Partenaire" value={p.sponsor} onChange={(e) => setPrizes(prizes.map((x, j) => (j === i ? { ...x, sponsor: e.target.value } : x)))} />
              <button onClick={() => setPrizes(prizes.filter((_, j) => j !== i))} aria-label="Retirer ce lot" className="text-gray-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-3">
          <ActionButton onClick={async () => setPrizes([...prizes, { id: `lot-${Date.now().toString(36)}`, label: '', sponsor: '' }])}><Plus className="w-3 h-3" /> Ajouter</ActionButton>
          <ActionButton variant="primary" onClick={async () => { await api('/api/tournaments/admin', 'POST', { action: 'setPrizes', prizes }); reload(); }}>Enregistrer</ActionButton>
        </div>
      </Card>

      <Card title="Rapports de l'agent des tournois" className="md:col-span-2">
        {(data.tournamentReports || []).length === 0 ? <p className="text-sm text-gray-500">Pas encore de rapport.</p> : (
          <div className="space-y-4">
            {data.tournamentReports.map((r: any) => (
              <article key={r.at} className="border-b border-white/5 pb-4 last:border-0">
                <p className="text-[11px] text-gray-500 mb-1">{fmtDate(r.at)} · {r.create ? 'création proposée' : 'pas de création'}{r.rejected ? ` · rejetée : ${r.rejected.join(', ')}` : ''}</p>
                <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{r.analysis}</p>
                {r.log?.length > 0 && <p className="text-xs text-gray-500 mt-2">{r.log.join(' · ')}</p>}
              </article>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
