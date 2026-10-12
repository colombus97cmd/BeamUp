'use client';
import { useEffect, useState } from 'react';
import { ExternalLink, Copy } from 'lucide-react';
import { api, type Data } from './AdminConsole';
import { Card, ActionButton, Badge, fmtDate } from './ui';

const KIND_LABEL: Record<string, string> = { post: 'Post', newsletter: 'Newsletter', outreach: 'Démarchage', event: 'Événement', decision: 'Décision', video: 'Vidéo' };
const STATUS_TONE: Record<string, 'gray' | 'green' | 'yellow' | 'red' | 'cyan'> = { proposé: 'yellow', approuvé: 'cyan', publié: 'green', envoyé: 'green', rejeté: 'red' };

function Item({ item, reload, subscribers, meta }: { item: any; reload: () => void; subscribers: number; meta: boolean }) {
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

      {item.social && (
        <div className="flex flex-wrap gap-3 text-xs">
          {Object.entries(item.social).map(([net, link]) => (
            <a key={net} href={link as string} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-green-300 hover:underline"><ExternalLink className="w-3 h-3" /> Publié sur {net === 'facebook' ? 'Facebook' : 'Instagram'}</a>
          ))}
        </div>
      )}
      {meta && item.status !== 'rejeté' && !edited && (item.kind === 'video' || (item.kind === 'post' && ['facebook', 'instagram'].includes(item.channel))) && (
        <div className="flex flex-wrap gap-2">
          {!item.social?.facebook && (item.kind === 'video' || item.channel === 'facebook') && (
            <ActionButton variant="primary" confirm="Publier sur la page Facebook de BeamUp ?" onClick={() => api('/api/admin/meta/publish', 'POST', { id: item.id, target: 'facebook' }).then(reload)}>Publier sur Facebook</ActionButton>
          )}
          {!item.social?.instagram && item.videoUrl && (
            <ActionButton variant="primary" confirm="Publier en Reel sur l'Instagram de BeamUp ? (jusqu'à 4 minutes de traitement)" onClick={() => api('/api/admin/meta/publish', 'POST', { id: item.id, target: 'instagram' }).then(reload)}>Publier sur Instagram</ActionButton>
          )}
        </div>
      )}

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

/** Connexion à la page Facebook et au compte Instagram professionnel de BeamUp (jetons conservés chiffrés côté serveur). */
function MetaCard({ onState }: { onState: (connected: boolean) => void }) {
  const [state, setState] = useState<any>(null);
  const [token, setToken] = useState('');
  const load = () => api('/api/admin/meta').then((d) => { setState(d); onState(Boolean(d.connection)); }).catch(() => setState({ error: true }));
  useEffect(() => { load(); }, []);
  if (!state) return null;
  const c = state.connection;
  const page = c?.pages.find((p: any) => p.id === c.selected);
  return (
    <Card title="Facebook et Instagram">
      {!state.configured ? (
        <p className="text-sm text-gray-400">Ajoutez META_APP_ID et META_APP_SECRET dans Vercel, puis redéployez.</p>
      ) : c ? (
        <div className="space-y-3 text-sm text-gray-300">
          <p>Connecté : page <strong>{page?.name}</strong>{page?.instagram ? <> · Instagram <strong>@{page.instagram}</strong></> : ' · aucun compte Instagram relié à cette page'}</p>
          {c.pages.length > 1 && (
            <select className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm" value={c.selected} onChange={(e) => api('/api/admin/meta', 'POST', { action: 'select', pageId: e.target.value }).then(load)}>
              {c.pages.map((p: any) => <option key={p.id} value={p.id}>{p.name}{p.instagram ? ` (@${p.instagram})` : ''}</option>)}
            </select>
          )}
          <div className="flex flex-wrap gap-2">
            <ActionButton variant="danger" confirm="Effacer l'accès à Facebook et Instagram ?" onClick={() => api('/api/admin/meta', 'POST', { action: 'disconnect' }).then(load)}>Déconnecter</ActionButton>
          </div>
        </div>
      ) : (
        <div className="space-y-3 text-sm text-gray-400">
          <p>Autorisez BeamUp à publier sur votre page Facebook et votre Instagram professionnel, une seule fois. Rien n&apos;est publié sans votre clic.</p>
          <ol className="list-decimal pl-5 space-y-1 text-xs leading-relaxed">
            <li>Ouvrez l&apos;<a className="text-[#00f2ff] underline" href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noopener noreferrer">explorateur de l&apos;API Graph</a> et choisissez l&apos;app « BeamUp Publication ».</li>
            <li>« Utilisateur ou Page » : jeton d&apos;accès utilisateur. Ajoutez les autorisations pages_show_list, pages_read_engagement, pages_manage_posts, instagram_basic, instagram_content_publish, business_management.</li>
            <li>« Generate Access Token », autorisez votre page et votre Instagram, puis copiez le jeton et collez-le ici.</li>
          </ol>
          <input type="password" autoComplete="off" value={token} onChange={(e) => setToken(e.target.value)} placeholder="Jeton d'accès (EAA…)" className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#00f2ff]" />
          <ActionButton variant="primary" onClick={async () => { await api('/api/admin/meta', 'POST', { action: 'token', userToken: token }); setToken(''); await load(); }}>Connecter</ActionButton>
          <p className="text-[11px] text-gray-500">Le jeton collé est échangé aussitôt contre un accès permanent à la page, conservé chiffré ; il n&apos;est ni affiché ni enregistré tel quel.</p>
        </div>
      )}
    </Card>
  );
}

/** Créateurs qui refusent d'être mis en avant (demande reçue par mail). */
function OptOutCard() {
  const [list, setList] = useState<string[] | null>(null);
  const [addr, setAddr] = useState('');
  const load = () => api('/api/admin/promo-optout').then((d) => setList(d.optout)).catch(() => setList([]));
  useEffect(() => { load(); }, []);
  return (
    <Card title="Créateurs exclus de la promotion">
      <p className="text-xs text-gray-500 mb-3 leading-relaxed">L&apos;agent met en avant les œuvres de tous les créateurs, à tour de rôle. Ajoutez ici le wallet d&apos;un créateur qui a demandé à ne pas être mis en avant.</p>
      <div className="flex gap-2 mb-3">
        <input value={addr} onChange={(e) => setAddr(e.target.value)} placeholder="0x…" className="flex-1 min-w-0 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:border-[#00f2ff]" />
        <ActionButton onClick={async () => { await api('/api/admin/promo-optout', 'POST', { address: addr, refuse: true }); setAddr(''); await load(); }}>Exclure</ActionButton>
      </div>
      {list && list.length > 0 && (
        <ul className="space-y-1 text-xs font-mono text-gray-400">
          {list.map((a) => (
            <li key={a} className="flex items-center justify-between gap-2">{a}
              <button className="text-[10px] font-sans uppercase font-black text-gray-500 hover:text-white" onClick={() => api('/api/admin/promo-optout', 'POST', { address: a, refuse: false }).then(load)}>Retirer</button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export default function PromotionPanel({ data, reload }: { data: Data; reload: () => void }) {
  const [meta, setMeta] = useState(false);
  const [filter, setFilter] = useState<'ouvert' | 'tout'>('ouvert');
  const items: any[] = (data.promoItems || []).filter((i: any) => filter === 'tout' || i.status === 'proposé' || i.status === 'approuvé');
  const report = data.promoReports?.[0];
  const subscribers = data.kpis?.newsContacts ?? 0;

  return (
    <div className="space-y-4">
      <MetaCard onState={setMeta} />
      <OptOutCard />
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
          {items.map((i) => <Item key={`${i.id}-${i.status}-${i.text.length}`} item={i} reload={reload} subscribers={subscribers} meta={meta} />)}
        </div>
      )}
    </div>
  );
}
