'use client';
import { api, type Data } from './AdminConsole';
import { Card, ActionButton, Badge, fmtDate } from './ui';

const TONE: Record<string, 'gray' | 'yellow' | 'red' | 'green'> = { ok: 'green', reformuler: 'yellow', masquer: 'red' };

export default function ModerationAdmin({ data, reload }: { data: Data; reload: () => void }) {
  const log: any[] = data.moderationLog || [];
  const act = (e: any, action: 'hide' | 'unhide', illegal = false) =>
    api('/api/moderation/admin', 'POST', { action, chainId: e.chainId, workId: e.workId, index: e.index, reason: e.reason, illegal }).then(reload);

  return (
    <Card title="Journal de modération (50 dernières entrées)">
      <p className="text-xs text-gray-500 mb-4 leading-relaxed">
        Les commentaires sont sur la blockchain : « masquer » les cache seulement sur BeamUp, le texte original restant consultable au survol ; « masquer (illégal) » le rend inaccessible. Vous avez le dernier mot sur chaque décision de l&apos;agent.
      </p>
      {log.length === 0 ? <p className="text-sm text-gray-500">Rien à signaler.</p> : (
        <ul className="space-y-3">
          {log.map((e, i) => (
            <li key={i} className="border border-white/10 rounded-xl p-3 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge>{e.type}</Badge>
                {e.decision && <Badge tone={TONE[e.decision] || 'gray'}>{e.decision}</Badge>}
                {e.action && <Badge>{e.action}</Badge>}
                {e.workId !== undefined && <span className="text-[11px] text-gray-500">œuvre {e.workId} · commentaire {e.index} · réseau {e.chainId}</span>}
                <span className="text-[10px] text-gray-500 ml-auto">{fmtDate(e.at)}</span>
              </div>
              {e.text && <p className="text-sm text-gray-300 break-words">« {e.text} »</p>}
              {e.reason && <p className="text-xs text-gray-400">Raison : {e.reason}</p>}
              {e.motive && <p className="text-xs text-gray-400">Motif du signalement : {e.motive}</p>}
              {e.type === 'réglage' && <p className="text-xs text-gray-400">{e.key} → {String(e.value)} par {String(e.by).slice(0, 10)}…</p>}
              {e.workId !== undefined && e.type !== 'admin' && (
                <div className="flex gap-2">
                  <ActionButton onClick={() => act(e, 'unhide')}>Rétablir</ActionButton>
                  <ActionButton variant="danger" onClick={() => act(e, 'hide')}>Masquer</ActionButton>
                  <ActionButton variant="danger" confirm="Contenu illégal : le texte original ne sera plus consultable par les lecteurs. Confirmer ?" onClick={() => act(e, 'hide', true)}>Masquer (illégal)</ActionButton>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
