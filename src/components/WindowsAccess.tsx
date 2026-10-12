'use client';
import { useState } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { ConnectKitButton } from 'connectkit';
import { Loader2, Monitor, CheckCircle2 } from 'lucide-react';
import { licenceMessage } from '../lib/licenceMessage';

// Version Windows de Chains & Crowns, réservée aux acheteurs.
//  mode « download » (page Jeux) : lien de téléchargement temporaire de l'installateur ;
//  mode « licence » (page /licence, ouverte par l'application) : licence renvoyée à l'application sur cet ordinateur (127.0.0.1).

type Props = { mode: 'download' } | { mode: 'licence'; port: number; state: string };

export default function WindowsAccess(props: Props) {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

  const run = async () => {
    setBusy(true);
    setStatus(null);
    try {
      const issuedAt = Date.now();
      const signature = await signMessageAsync({ message: licenceMessage(address!, issuedAt) });
      const res = await fetch('/api/games/licence', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: props.mode, address, issuedAt, signature }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      if (props.mode === 'licence') {
        setStatus({ ok: true, text: 'Achat vérifié : retour au jeu…' });
        window.location.href = `http://127.0.0.1:${props.port}/licence?state=${encodeURIComponent(props.state)}&licence=${encodeURIComponent(data.licence)}`;
      } else {
        setStatus({ ok: true, text: `Téléchargement de la version ${data.version}…` });
        window.location.href = data.url;
      }
    } catch (e: any) {
      setStatus({ ok: false, text: e?.shortMessage || e?.message || 'Signature refusée.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 md:p-6">
      <Monitor className="w-5 h-5 text-[#7cff4f] mb-3" />
      <h3 className="font-black uppercase text-sm mb-2">{props.mode === 'licence' ? 'Activer Chains & Crowns sur Windows' : 'Chains & Crowns pour Windows'}</h3>
      <p className="text-gray-400 text-sm leading-relaxed mb-4">
        {props.mode === 'licence'
          ? 'Connectez le wallet utilisé pour l’achat et signez : l’application recevra sa licence (valable 45 jours, renouvelable de la même façon). Aucune transaction, aucun frais.'
          : 'Vous avez acheté l’édition complète ? Téléchargez la version installable pour Windows. Elle se joue hors ligne contre l’IA ; au premier lancement, elle vous demandera de vérifier votre achat avec le même wallet.'}
      </p>
      {!isConnected ? <ConnectKitButton /> : (
        <button onClick={run} disabled={busy} className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#7cff4f] text-black font-black uppercase tracking-widest text-[10px] rounded-full disabled:opacity-40">
          {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} {props.mode === 'licence' ? 'Vérifier mon achat' : 'Télécharger pour Windows'}
        </button>
      )}
      {props.mode === 'download' && (
        <p className="text-[11px] text-gray-500 mt-3 leading-relaxed">
          Windows peut afficher « Windows a protégé votre ordinateur » : l’application n’est pas encore signée par un certificat d’éditeur. Cliquez sur « Informations complémentaires », puis « Exécuter quand même ».
        </p>
      )}
      {status && (
        <p className={`mt-3 text-sm flex items-center gap-2 ${status.ok ? 'text-green-400' : 'text-red-400'}`} role="status">
          {status.ok && <CheckCircle2 className="w-4 h-4" />} {status.text}
        </p>
      )}
    </div>
  );
}
