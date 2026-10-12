'use client';
import { useEffect, useState } from 'react';
import { Plus, Trash2, RefreshCw } from 'lucide-react';
import { api, type Data } from './AdminConsole';
import { Card, ActionButton, Badge, fmtDate } from './ui';

interface Prize { id: string; label: string; sponsor: string }
interface Rep { result: 'win' | 'loss' | 'draw'; reason: string; moves: string[] }
interface BoardView {
  n: number; white: string; black: string; result: string | null; how: string | null;
  present: { w: boolean; b: boolean }; reports: { w: Rep | null; b: Rep | null };
}
interface RoundView { n: number; startedAt: number; deadline: number; closed: boolean; bye: string | null; boards: BoardView[] }
interface Play {
  status: 'registration' | 'running' | 'finished' | 'cancelled'; note: string | null; totalRounds: number;
  standings: { id: string; pseudo: string; score: number; buchholz: number; played: number; withdrawn: boolean; rank: number }[];
  rounds: RoundView[];
}

const STATUS: Record<Play['status'], [string, 'gray' | 'green' | 'yellow' | 'red' | 'cyan' | 'purple']> = {
  registration: ['Inscriptions', 'cyan'], running: ['En cours', 'green'], finished: ['Terminé', 'purple'], cancelled: ['Annulé', 'red'],
};
const REP: Record<Rep['result'], string> = { win: 'victoire', loss: 'défaite', draw: 'nulle' };

/** Date locale pour le champ datetime-local (prochain samedi 16 h par défaut). */
function defaultStart() {
  const d = new Date();
  d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7));
  d.setHours(16, 0, 0, 0);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export default function TournamentAdmin({ data, reload }: { data: Data; reload: () => void }) {
  const [live, setLive] = useState<{ tournament: any; play: Play | null } | null>(null);
  const [prizes, setPrizes] = useState<Prize[]>(data.prizes || []);
  const [form, setForm] = useState({ name: 'Tournoi de la Résistance', startsAt: defaultStart(), rounds: 4, timeControlMinutes: 10, capacity: 32, description: '', prizeIds: [] as string[], announce: true });
  const [openMoves, setOpenMoves] = useState<string | null>(null);
  const input = 'bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#bc13fe] min-w-0';

  const refresh = async () => setLive(await api('/api/tournaments/admin'));
  useEffect(() => { refresh().catch(() => {}); }, []);

  const t = live?.tournament ?? data.tournament;
  const play = live?.play ?? null;
  const after = async () => { await refresh(); reload(); };

  const cancel = async () => {
    const message = window.prompt('Message envoyé aux inscrits :', 'Le tournoi est annulé. Toutes nos excuses, un nouveau tournoi sera annoncé bientôt.');
    if (message === null) return;
    await api('/api/tournaments/admin', 'POST', { action: 'cancel', message });
    await after();
  };

  const create = async () => {
    await api('/api/tournaments/admin', 'POST', { action: 'create', ...form, startsAt: new Date(form.startsAt).toISOString() });
    await after();
  };

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card title="Tournoi en cours">
        {t ? (
          <div className="space-y-2 text-sm text-gray-300">
            <p className="text-lg font-black text-white flex items-center gap-2 flex-wrap">{t.name} {play && <Badge tone={STATUS[play.status][1]}>{STATUS[play.status][0]}</Badge>}</p>
            <p>{fmtDate(t.startsAt)} · suisse, {play?.totalRounds || t.rounds} rondes · {t.timeControlMinutes} min par joueur</p>
            <p>{data.tournament?.registered ?? '—'} / {t.capacity} inscrits · créé par {t.createdBy === 'agent' ? 'l\'agent' : 'un administrateur'}</p>
            {t.description && <p className="text-gray-400">{t.description}</p>}
            {play?.note && <p className="text-yellow-200 text-xs">{play.note}</p>}
            <div className="pt-2 flex flex-wrap gap-2">
              <ActionButton onClick={refresh}><RefreshCw className="w-3 h-3" /> Actualiser</ActionButton>
              {play && (play.status === 'finished' || play.status === 'cancelled')
                ? <ActionButton variant="primary" onClick={async () => { await api('/api/tournaments/admin', 'POST', { action: 'archive' }); await after(); }}>Archiver</ActionButton>
                : <ActionButton variant="danger" onClick={cancel}>Annuler le tournoi</ActionButton>}
            </div>
          </div>
        ) : (
          <div className="space-y-3 text-sm">
            <p className="text-gray-500 text-xs leading-relaxed">Aucun tournoi en cours. Créez-en un ici, ou laissez l&apos;agent le proposer le lundi s&apos;il est actif. Inscription gratuite et ouverte à tous ; les parties se jouent dans la démo gratuite du jeu.</p>
            <input className={`${input} w-full`} placeholder="Nom" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <label className="block text-xs text-gray-400">Début (heure de cet appareil)
              <input type="datetime-local" className={`${input} w-full mt-1`} value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
            </label>
            <div className="grid grid-cols-3 gap-2 text-xs text-gray-400">
              <label>Rondes<input type="number" min={1} max={9} className={`${input} w-full mt-1`} value={form.rounds} onChange={(e) => setForm({ ...form, rounds: Number(e.target.value) })} /></label>
              <label>Minutes / joueur<input type="number" min={3} max={60} className={`${input} w-full mt-1`} value={form.timeControlMinutes} onChange={(e) => setForm({ ...form, timeControlMinutes: Number(e.target.value) })} /></label>
              <label>Places<input type="number" min={2} max={256} className={`${input} w-full mt-1`} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} /></label>
            </div>
            <textarea className={`${input} w-full`} rows={3} placeholder="Annonce (facultatif)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            {(data.prizes || []).length > 0 && (
              <div className="text-xs text-gray-400 space-y-1">
                <p>Lots des partenaires :</p>
                {data.prizes.map((p: Prize) => (
                  <label key={p.id} className="flex items-center gap-2">
                    <input type="checkbox" checked={form.prizeIds.includes(p.id)} onChange={(e) => setForm({ ...form, prizeIds: e.target.checked ? [...form.prizeIds, p.id] : form.prizeIds.filter((x) => x !== p.id) })} />
                    {p.label} ({p.sponsor})
                  </label>
                ))}
              </div>
            )}
            <label className="flex items-center gap-2 text-xs text-gray-400">
              <input type="checkbox" checked={form.announce} onChange={(e) => setForm({ ...form, announce: e.target.checked })} /> Annoncer sur Discord
            </label>
            <ActionButton variant="primary" onClick={create}>Créer le tournoi</ActionButton>
          </div>
        )}
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

      {play && play.standings.length > 0 && (
        <Card title="Classement">
          <table className="w-full text-xs text-gray-300">
            <thead><tr className="text-gray-500 text-left"><th className="py-1">#</th><th>Joueur</th><th className="text-right">Points</th><th className="text-right">Départage</th></tr></thead>
            <tbody>
              {play.standings.map((p) => (
                <tr key={p.id} className="border-t border-white/5">
                  <td className="py-1">{p.rank}</td>
                  <td>{p.pseudo} {p.withdrawn && <span className="text-gray-500">(retiré)</span>}</td>
                  <td className="text-right font-bold">{p.score}</td>
                  <td className="text-right">{p.buchholz}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {play && play.rounds.length > 0 && (
        <Card title="Rondes et parties" className={play.standings.length ? '' : 'md:col-span-2'}>
          <div className="space-y-5">
            {[...play.rounds].reverse().map((r) => (
              <div key={r.n}>
                <p className="text-xs text-gray-400 mb-2">
                  Ronde {r.n} · début {fmtDate(new Date(r.startedAt).toISOString())} · {r.closed ? 'close' : `délai ${fmtDate(new Date(r.deadline).toISOString())}`}{r.bye ? ` · exempté : ${r.bye}` : ''}
                </p>
                <ul className="space-y-2">
                  {r.boards.map((b) => {
                    const key = `${r.n}-${b.n}`;
                    const moves = b.reports.w?.moves?.length ? b.reports.w.moves : b.reports.b?.moves || [];
                    return (
                      <li key={key} className="text-xs border border-white/5 rounded-lg p-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-white">{b.n}. {b.white} – {b.black}</span>
                          {b.result ? <Badge tone={b.how === 'litige' ? 'yellow' : 'gray'}>{b.result} · {b.how}</Badge> : <Badge tone="cyan">en jeu</Badge>}
                        </div>
                        <p className="text-gray-500 mt-1">
                          Blancs : {b.present.w ? 'présent' : 'absent'}{b.reports.w ? `, déclare ${REP[b.reports.w.result]} (${b.reports.w.reason || '—'})` : ''} ·
                          Noirs : {b.present.b ? 'présent' : 'absent'}{b.reports.b ? `, déclare ${REP[b.reports.b.result]} (${b.reports.b.reason || '—'})` : ''}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          {moves.length > 0 && <button className="underline text-gray-400" onClick={() => setOpenMoves(openMoves === key ? null : key)}>{openMoves === key ? 'Masquer les coups' : `Voir les ${moves.length} coups`}</button>}
                          {play.status !== 'cancelled' && (
                            <select className={`${input} py-1 text-xs`} defaultValue="" onChange={async (e) => {
                              const result = e.target.value;
                              e.target.value = '';
                              if (!result || !window.confirm(`Fixer le résultat de la table ${b.n} (ronde ${r.n}) à ${result} ?`)) return;
                              await api('/api/tournaments/admin', 'POST', { action: 'arbitrate', round: r.n, board: b.n, result });
                              await refresh();
                            }}>
                              <option value="">Arbitrer…</option>
                              <option value="1-0">1-0 (Blancs gagnent)</option>
                              <option value="0-1">0-1 (Noirs gagnent)</option>
                              <option value="1/2-1/2">½-½ (nulle)</option>
                              <option value="0-0">0-0 (double défaite)</option>
                            </select>
                          )}
                        </div>
                        {openMoves === key && <p className="mt-2 text-gray-400 font-mono leading-relaxed">{moves.map((m, i) => (i % 2 ? `${m} ` : `${i / 2 + 1}. ${m} `)).join('')}</p>}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </Card>
      )}

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
