'use client';
import { useState } from 'react';
import { ExternalLink, Copy } from 'lucide-react';
import { api, type Data } from './AdminConsole';
import { Card, ActionButton, Badge, fmtDate } from './ui';

const KIND_LABEL: Record<string, string> = { post: 'Post', newsletter: 'Newsletter', outreach: 'Démarchage', event: 'Événement', decision: 'Décision', video: 'Vidéo' };
const STATUS_TONE: Record<string, 'gray' | 'green' | 'yellow' | 'red' | 'cyan'> = { proposé: 'yellow', approuvé: 'cyan', publié: 'green', envoyé: 'green', rejeté: 'red' };

function Item({ item, reload, subscribers }: { item: any; reload: () => void; subscribers: number }) {
  const [text, setText] = useState(item.text);
  const act = (action: string, extra: object = {}) => api('/api/admin/promo', 'POST', { id: item.id, action, ...extra }).then(reload);
  const open = item.status === 'proposé' || item.status === 'approuvé';
  const edited = text !== item.text;

  return (
    <article className="border border-white/10 rounded-xl p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="purple">{KIND_LABEL[item.kind]}</Badge>
        {item.channel && <Badge>{item.channel}</Badge>}
        {item.region && <Badge>{item.region}</Badge>}
        <Badge tone={STATUS_TONE[item.status]}>{item.status}</Badge>
        <span className="text-[10px] text-gray-500 ml-auto">{fmtDate(item.createdAt)}{item.updatedBy ? ` · ${item.updatedBy.slice(0, 8)}…` : ''}</span>
      </div>
      <h3 className="font-bold">{item.title}{item.date ? ` — ${item.date}` : ''}</h3>
      {item.url && (
        <a href={item.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-[#00f2ff] hover:underline break-all">
          <ExternalLink className="w-3 h-3 shrink-0" /> {item.url}
        </a>
      )}
      {item.videoUrl && (
        <div className="flex flex-wrap items-start gap-3">
          <video src={item.videoUrl} controls playsInline preload="metadata" className="w-40 aspect-[9/16] rounded-lg bg-black border border-white/10" />
          <a href={item.videoUrl} download target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-[#00f2ff] hover:underline">
            <ExternalLink className="w-3 h-3" /> Télécharger la vidéo (TikTok, Reels, Shorts)
          </a>
        </div>
      )}
      {item.kind === 'decision' ? (
        <div className="text-sm text-gray-300 space-y-2">
          <p>Recommandation de l&apos;agent : <strong>{item.recommendation}</strong></p>
          {open && (
            <div className="flex flex-wrap gap-2">
              {(item.options || []).map((o: string) => <ActionButton key={o} onClick={() => act('approve', { choice: o })}>{o}</ActionButton>)}
            </div>
          )}
        </div>
      ) : (
        <textarea value={text} onChange={(e) => setText(e.target.value)} disabled={!open} rows={Math.min(14, Math.max(4, text.split('\n').length + 1))}
          className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-sm leading-relaxed outline-none focus:border-[#00f2ff] disabled:opacity-70" />
      )}
      {item.rationale && <p className="text-[11px] text-gray-500 italic">Pourquoi : {item.rationale}</p>}

      {open && (
        <div className="flex flex-wrap gap-2">
          {edited && <ActionButton variant="primary" onClick={() => act('edit', { text })}>Enregistrer le texte</ActionButton>}
          {!edited && item.kind === 'post' && item.channel === 'discord' && <ActionButton variant="primary" onClick={() => act('publish')}>Publier sur Discord</ActionButton>}
          {!edited && item.kind === 'newsletter' && (
            <ActionButton variant="primary" confirm={`Envoyer cette newsletter à ${subscribers} abonné(s) ?`} onClick={() => act('publish')}>Envoyer aux abonnés</ActionButton>
          )}
          {(item.kind === 'outreach' || item.kind === 'video' || (item.kind === 'post' && item.channel !== 'discord')) && (
            <>
              <ActionButton onClick={() => navigator.clipboard.writeText(text)}><Copy className="w-3 h-3" /> Copier</ActionButton>
              <ActionButton onClick={() => act('sent')}>{item.kind === 'outreach' ? 'Marquer comme envoyé' : 'Marquer comme publié'}</ActionButton>
            </>
          )}
          {item.kind === 'event' && item.status === 'proposé' && <ActionButton onClick={() => act('approve')}>Retenir</ActionButton>}
          <ActionButton variant="danger" onClick={() => act('reject')}>Écarter</ActionButton>
        </div>
      )}
    </article>
  );
}

export default function PromotionPanel({ data, reload }: { data: Data; reload: () => void }) {
  const [filter, setFilter] = useState<'ouvert' | 'tout'>('ouvert');
  const items: any[] = (data.promoItems || []).filter((i: any) => filter === 'tout' || i.status === 'proposé' || i.status === 'approuvé');
  const report = data.promoReports?.[0];
  const subscribers = data.kpis?.newsContacts ?? 0;

  return (
    <div className="space-y-4">
      <Card title="Dernière analyse de l'agent promotionnel">
        {report ? (
          <>
            <p className="text-[11px] text-gray-500 mb-2">{fmtDate(report.at)}</p>
            <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{report.analysis}</p>
          </>
        ) : <p className="text-sm text-gray-500">Pas encore de rapport. Activez l&apos;agent ou lancez-le depuis la vue d&apos;ensemble.</p>}
        <p className="text-[11px] text-gray-500 mt-4 leading-relaxed">
          Règles : l&apos;agent ne publie seul que sur Discord (si vous l&apos;avez autorisé). Newsletter, réseaux sociaux et démarchage attendent votre geste : le démarchage s&apos;envoie toujours à la main, depuis le formulaire ou la page publique de l&apos;organisation.
        </p>
      </Card>

      <div className="flex gap-2">
        {(['ouvert', 'tout'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider ${filter === f ? 'bg-white text-black' : 'bg-white/5 text-gray-400'}`}>
            {f === 'ouvert' ? 'À traiter' : 'Historique'}
          </button>
        ))}
      </div>

      {items.length === 0 ? <p className="text-sm text-gray-500">Aucune proposition.</p> : (
        <div className="grid lg:grid-cols-2 gap-3">
          {items.map((i) => <Item key={`${i.id}-${i.status}-${i.text.length}`} item={i} reload={reload} subscribers={subscribers} />)}
        </div>
      )}
    </div>
  );
}
