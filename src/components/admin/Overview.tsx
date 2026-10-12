'use client';
import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { api, type Data } from './AdminConsole';
import { Card, ActionButton, fmtDate } from './ui';

const AGENTS = [
  { key: 'promotionAgent', path: '/api/agents/promotion', name: 'Agent promotionnel', text: 'Chaque mardi : recherche de créateurs et d\'événements, posts, newsletter, cibles de démarchage, décisions à prendre. Tout passe par l\'onglet Promotion.' },
  { key: 'tournamentAgent', path: '/api/agents/tournament', name: 'Agent des tournois', text: 'Chaque lundi : analyse de l\'audience, création et annonce autonome d\'un tournoi gratuit (Discord + mail), rappels, archivage.' },
  { key: 'moderationAgent', path: '/api/agents/moderation', name: 'Agent modérateur', text: 'Chaque jour : balaie les nouveaux commentaires et masque ceux contraires à la charte. Le conseil avant envoi fonctionne toujours.' },
] as const;

const READINESS: [string, string][] = [
  ['redis', 'Stockage Upstash Redis'],
  ['claude', 'Clé ANTHROPIC_API_KEY'],
  ['mail', 'Envoi de mails (RESEND_API_KEY, NEWS_FROM_EMAIL)'],
  ['discord', 'Salon Discord (DISCORD_WEBHOOK_URL)'],
  ['cron', 'Tâches planifiées (CRON_SECRET)'],
  ['unsubscribe', 'Liens de désinscription (UNSUBSCRIBE_SECRET)'],
];

export default function Overview({ data, reload }: { data: Data; reload: () => void }) {
  const [results, setResults] = useState<Record<string, string>>({});
  const k = data.kpis;
  const r = data.readiness || {};

  const toggle = async (key: string, value: boolean) => { await api('/api/admin/settings', 'POST', { key, value }); reload(); };

  // Œuvres de membres de la Sacem : une autorisation de la Sacem est nécessaire pour les diffuser.
  const [declarations, setDeclarations] = useState<any[] | null>(null);
  useEffect(() => { api('/api/works/declare').then((d) => setDeclarations(d.declarations)).catch(() => setDeclarations([])); }, []);
  const sacemWorks = (declarations || []).filter((d) => d.sacem);

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card title="Indicateurs">
        {k ? (
          <dl className="grid grid-cols-2 gap-4 text-center">
            {[
              ['Œuvres publiées', k.totalWorks],
              ['Vues', k.totalViews],
              ['Lectures complètes', k.totalCompletedReads],
              ['Abonnés aux news', k.newsContacts],
              ['Ventes jeux et pass', (k.gameSales || []).reduce((s: number, p: any) => s + p.sales, 0)],
              ['Tournoi en cours', data.tournament ? `${data.tournament.registered}/${data.tournament.capacity}` : '—'],
            ].map(([label, value]) => (
              <div key={label as string}><dd className="text-2xl font-black text-[#00f2ff]">{value ?? '—'}</dd><dt className="text-[11px] text-gray-500">{label}</dt></div>
            ))}
          </dl>
        ) : <p className="text-sm text-gray-500">Indicateurs indisponibles.</p>}
      </Card>

      <Card title="Configuration">
        <ul className="space-y-2 text-sm">
          {READINESS.map(([key, label]) => (
            <li key={key} className="flex items-center gap-2">
              {r[key] ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <XCircle className="w-4 h-4 text-red-400" />} {label}
            </li>
          ))}
          <li className="flex items-center gap-2">
            {r.gameProducts ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
            Produits du jeu (GAME_PRODUCTS) : {r.gameProducts || 0}
          </li>
        </ul>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <ActionButton onClick={async () => { const d = await api('/api/admin/test-notify', 'POST'); setResults((x) => ({ ...x, test: `Mail : ${d.mail ?? d.error} · Discord : ${d.discord ?? '—'}` })); }}>
            Tester les envois
          </ActionButton>
          {results.test && <span className="text-[11px] text-gray-400">{results.test}</span>}
        </div>
      </Card>

      <Card title="Droits d'auteur (Sacem)">
        {declarations === null ? <p className="text-sm text-gray-500">Chargement…</p> : (
          <>
            <p className="text-xs text-gray-500 leading-relaxed mb-3">
              {declarations.length} œuvre(s) déclarée(s) depuis la mise en place des conditions des créateurs, dont {sacemWorks.length} d&apos;un membre de la Sacem (ou d&apos;une autre société de gestion). Pour celles-ci, une autorisation de la Sacem est nécessaire : à demander dès que le catalogue le justifie.
            </p>
            {sacemWorks.length > 0 && (
              <ul className="text-xs text-gray-300 space-y-1">
                {sacemWorks.slice(0, 20).map((d) => <li key={d.cid}>{d.title} · {d.format} · {d.creator.slice(0, 8)}… · {fmtDate(d.at)}</li>)}
              </ul>
            )}
          </>
        )}
      </Card>

      {AGENTS.map((a) => {
        const on = Boolean(data.settings?.[a.key]);
        return (
          <Card key={a.key} title={a.name}>
            <p className="text-sm text-gray-400 leading-relaxed mb-4">{a.text}</p>
            <div className="flex flex-wrap items-center gap-2">
              <ActionButton variant={on ? 'danger' : 'primary'} onClick={() => toggle(a.key, !on)}>{on ? 'Arrêter' : 'Activer'}</ActionButton>
              <ActionButton onClick={async () => { const d = await api(a.path); setResults((x) => ({ ...x, [a.key]: JSON.stringify(d) })); reload(); }}>
                Lancer maintenant
              </ActionButton>
              <span className={`text-[10px] font-black uppercase ${on ? 'text-green-400' : 'text-gray-500'}`}>{on ? 'Actif' : 'Arrêté'}</span>
            </div>
            {a.key === 'promotionAgent' && (
              <label className="flex items-center gap-2 mt-4 text-xs text-gray-400">
                <input type="checkbox" checked={Boolean(data.settings?.promoAutoDiscord)} onChange={(e) => toggle('promoAutoDiscord', e.target.checked)} />
                Publier sans validation les posts Discord de l&apos;agent (le reste attend toujours votre validation)
              </label>
            )}
            {results[a.key] && <pre className="mt-3 text-[11px] text-gray-400 whitespace-pre-wrap break-all">{results[a.key]}</pre>}
          </Card>
        );
      })}
    </div>
  );
}
