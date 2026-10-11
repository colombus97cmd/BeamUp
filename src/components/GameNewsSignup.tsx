'use client';
import { useState } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { ConnectKitButton } from 'connectkit';
import { Mail, Loader2, CheckCircle2, Trash2 } from 'lucide-react';
import { walletMessage } from '../lib/walletMessage';

// Inscription des acheteurs (jeu ou pass saison) aux news et annonces de tournois.
// L'achat est vérifié sur la blockchain : le joueur signe un message avec son wallet (aucune transaction, aucun frais).

const DISCORD_INVITE = process.env.NEXT_PUBLIC_DISCORD_INVITE_URL;

export default function GameNewsSignup() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [email, setEmail] = useState('');
  const [discord, setDiscord] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

  const signed = async () => {
    const issuedAt = Date.now();
    const signature = await signMessageAsync({ message: walletMessage(address!, issuedAt) });
    return { address, issuedAt, signature };
  };

  const call = async (method: 'POST' | 'DELETE', extra: object = {}) => {
    setBusy(true);
    setStatus(null);
    try {
      const proof = await signed();
      const res = await fetch('/api/contacts', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...proof, ...extra }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      setStatus({ ok: true, text: method === 'DELETE' ? 'Vos coordonnées ont été supprimées.' : data.updated ? 'Préférences mises à jour.' : 'Inscription confirmée. Bienvenue !' });
    } catch (e: any) {
      setStatus({ ok: false, text: e?.shortMessage || e?.message || 'Signature refusée.' });
    } finally {
      setBusy(false);
    }
  };

  const input = 'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#00f2ff]';

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 md:p-6">
      <Mail className="w-5 h-5 text-[#00f2ff] mb-3" />
      <h3 className="font-black uppercase text-sm mb-2">News des joueurs</h3>
      <p className="text-gray-400 text-sm leading-relaxed mb-4">
        Vous avez acheté le jeu ou un pass saison ? Recevez les news et les annonces de tournois par mail ou sur Discord.
      </p>

      {!isConnected ? (
        <div className="space-y-2">
          <p className="text-xs text-gray-500">Connectez le wallet utilisé pour l&apos;achat.</p>
          <ConnectKitButton />
        </div>
      ) : (
        <form
          className="space-y-3"
          onSubmit={(e) => { e.preventDefault(); call('POST', { email, discord, consent }); }}
        >
          <input className={input} type="email" placeholder="Adresse mail" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          <input className={input} placeholder="Pseudo Discord (facultatif)" value={discord} onChange={(e) => setDiscord(e.target.value.toLowerCase())} />
          <label className="flex items-start gap-2 text-xs text-gray-400 leading-relaxed">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" />
            J&apos;accepte de recevoir les news et annonces de tournois de BeamUp. Désinscription possible à tout moment ; aucune autre utilisation de mes coordonnées.
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <button disabled={busy || !consent || (!email && !discord)} className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#00f2ff] text-black font-black uppercase tracking-widest text-[10px] rounded-full disabled:opacity-40">
              {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} S&apos;inscrire
            </button>
            <button type="button" disabled={busy} onClick={() => call('DELETE')} className="inline-flex items-center gap-1.5 text-[10px] uppercase font-black tracking-wider text-gray-500 hover:text-red-400">
              <Trash2 className="w-3.5 h-3.5" /> Supprimer mes données
            </button>
          </div>
          <p className="text-[11px] text-gray-500">La signature prouve que le wallet vous appartient. Elle ne déclenche aucune transaction ni aucun frais.</p>
        </form>
      )}

      {status && (
        <p className={`mt-3 text-sm flex items-center gap-2 ${status.ok ? 'text-green-400' : 'text-red-400'}`} role="status">
          {status.ok && <CheckCircle2 className="w-4 h-4" />} {status.text}
        </p>
      )}
      {DISCORD_INVITE && (
        <a href={DISCORD_INVITE} target="_blank" rel="noopener noreferrer" className="inline-block mt-4 text-xs text-[#bc13fe] hover:underline">
          Rejoindre le serveur Discord de BeamUp →
        </a>
      )}
    </div>
  );
}
