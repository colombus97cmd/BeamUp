'use client';
import { useCallback, useEffect, useState } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { ConnectKitButton } from 'connectkit';
import { ShieldCheck, Loader2, LogOut, RefreshCw, Megaphone, Swords, MessageSquareWarning, LayoutDashboard, Gamepad2 } from 'lucide-react';
import { adminMessage } from '../../lib/adminMessage';
import Overview from './Overview';
import PromotionPanel from './PromotionPanel';
import TournamentAdmin from './TournamentAdmin';
import ModerationAdmin from './ModerationAdmin';
import GamesAdmin from './GamesAdmin';

export type Data = Record<string, any>;

/** Appel d'API de la page de pilotage (cookie de session envoyé automatiquement). */
export async function api(path: string, method = 'GET', body?: object) {
  const res = await fetch(path, { method, headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);
  return data;
}

const TABS = [
  { id: 'overview', label: 'Vue d\'ensemble', icon: LayoutDashboard },
  { id: 'promo', label: 'Promotion', icon: Megaphone },
  { id: 'jeux', label: 'Jeux', icon: Gamepad2 },
  { id: 'tournois', label: 'Tournois', icon: Swords },
  { id: 'moderation', label: 'Modération', icon: MessageSquareWarning },
] as const;

export default function AdminConsole() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [admin, setAdmin] = useState<string | null | undefined>(undefined);
  const [data, setData] = useState<Data | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('overview');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setBusy(true);
    setError('');
    try { setData(await api('/api/admin/overview')); } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  }, []);

  useEffect(() => {
    api('/api/admin/session').then((d) => setAdmin(d.admin)).catch(() => setAdmin(null));
  }, []);
  useEffect(() => { if (admin) load(); }, [admin, load]);

  const login = async () => {
    setBusy(true);
    setError('');
    try {
      const issuedAt = Date.now();
      const signature = await signMessageAsync({ message: adminMessage(address!, issuedAt) });
      await api('/api/admin/session', 'POST', { address, issuedAt, signature });
      setAdmin(address!.toLowerCase());
    } catch (e: any) {
      setError(e?.shortMessage || e.message);
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    await api('/api/admin/session', 'DELETE').catch(() => {});
    setAdmin(null);
    setData(null);
  };

  if (admin === undefined) return <main className="p-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-gray-500" /></main>;

  if (!admin) {
    return (
      <main className="max-w-md mx-auto px-4 py-20 text-center space-y-6">
        <ShieldCheck className="w-10 h-10 text-[#00f2ff] mx-auto" />
        <h1 className="text-3xl font-black tracking-tight">Pilotage</h1>
        <p className="text-gray-400 text-sm leading-relaxed">Réservé aux signataires du Safe propriétaire de BeamUp. Connectez votre wallet de signataire, puis signez le message de connexion (aucune transaction).</p>
        <div className="flex justify-center"><ConnectKitButton /></div>
        {isConnected && (
          <button onClick={login} disabled={busy} className="inline-flex items-center gap-2 px-6 py-3 bg-[#00f2ff] text-black font-black uppercase tracking-widest text-xs rounded-full disabled:opacity-40">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />} Signer et entrer
          </button>
        )}
        {error && <p className="text-red-400 text-sm" role="alert">{error}</p>}
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 md:py-12 space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#00f2ff] font-black">Pilotage</p>
          <h1 className="text-3xl md:text-4xl font-black tracking-tighter">Agents BeamUp</h1>
          <p className="text-[11px] text-gray-500 font-mono mt-1">Connecté : {admin}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} disabled={busy} className="inline-flex items-center gap-2 px-4 py-2 border border-white/15 rounded-full text-[10px] font-black uppercase tracking-wider hover:bg-white/10">
            <RefreshCw className={`w-3.5 h-3.5 ${busy ? 'animate-spin' : ''}`} /> Actualiser
          </button>
          <button onClick={logout} className="inline-flex items-center gap-2 px-4 py-2 border border-white/15 rounded-full text-[10px] font-black uppercase tracking-wider hover:bg-white/10">
            <LogOut className="w-3.5 h-3.5" /> Déconnexion
          </button>
        </div>
      </header>

      <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="Sections">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} aria-current={tab === t.id}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap ${tab === t.id ? 'bg-[#00f2ff] text-black' : 'bg-white/5 text-gray-400 hover:text-white'}`}>
              <Icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          );
        })}
      </nav>

      {error && <p className="text-red-400 text-sm" role="alert">{error}</p>}
      {!data ? <Loader2 className="w-5 h-5 animate-spin text-gray-500" /> : (
        <>
          {tab === 'overview' && <Overview data={data} reload={load} />}
          {tab === 'promo' && <PromotionPanel data={data} reload={load} />}
          {tab === 'jeux' && <GamesAdmin />}
          {tab === 'tournois' && <TournamentAdmin data={data} reload={load} />}
          {tab === 'moderation' && <ModerationAdmin data={data} reload={load} />}
        </>
      )}
    </main>
  );
}
