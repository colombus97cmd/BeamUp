import { unzipSync } from 'fflate';

// Inspection d'un jeu web déposé en zip, AVANT toute mise en ligne.
// Principe : liste blanche. Tout ce qui n'est pas explicitement un fichier de jeu web est refusé.
// Cette inspection ne remplace pas l'isolement (domaine séparé + iframe sandbox) : elle le complète.

export const LIMITS = {
  zipBytes: 200 * 1024 * 1024,        // zip déposé
  totalBytes: 400 * 1024 * 1024,      // une fois décompressé
  fileBytes: 200 * 1024 * 1024,       // par fichier
  files: 2000,
  ratio: 200,                         // taux de compression maximal par fichier (bombe zip)
  pathLength: 200,
};

/** Extensions autorisées → type MIME servi. `binary` : contenu binaire attendu ; sinon texte UTF-8. */
export const ALLOWED: Record<string, { type: string; binary: boolean }> = {
  html: { type: 'text/html; charset=utf-8', binary: false },
  htm: { type: 'text/html; charset=utf-8', binary: false },
  js: { type: 'text/javascript; charset=utf-8', binary: false },
  mjs: { type: 'text/javascript; charset=utf-8', binary: false },
  css: { type: 'text/css; charset=utf-8', binary: false },
  json: { type: 'application/json; charset=utf-8', binary: false },
  webmanifest: { type: 'application/manifest+json; charset=utf-8', binary: false },
  txt: { type: 'text/plain; charset=utf-8', binary: false },
  md: { type: 'text/plain; charset=utf-8', binary: false },
  xml: { type: 'application/xml; charset=utf-8', binary: false },
  svg: { type: 'image/svg+xml', binary: false },
  glsl: { type: 'text/plain; charset=utf-8', binary: false },
  png: { type: 'image/png', binary: true },
  jpg: { type: 'image/jpeg', binary: true },
  jpeg: { type: 'image/jpeg', binary: true },
  gif: { type: 'image/gif', binary: true },
  webp: { type: 'image/webp', binary: true },
  avif: { type: 'image/avif', binary: true },
  ico: { type: 'image/x-icon', binary: true },
  ktx2: { type: 'image/ktx2', binary: true },
  basis: { type: 'application/octet-stream', binary: true },
  mp3: { type: 'audio/mpeg', binary: true },
  ogg: { type: 'audio/ogg', binary: true },
  oga: { type: 'audio/ogg', binary: true },
  wav: { type: 'audio/wav', binary: true },
  m4a: { type: 'audio/mp4', binary: true },
  flac: { type: 'audio/flac', binary: true },
  mp4: { type: 'video/mp4', binary: true },
  webm: { type: 'video/webm', binary: true },
  wasm: { type: 'application/wasm', binary: true },
  data: { type: 'application/octet-stream', binary: true },      // Unity WebGL
  unityweb: { type: 'application/octet-stream', binary: true },  // Unity WebGL (anciennes versions)
  pck: { type: 'application/octet-stream', binary: true },       // Godot
  bin: { type: 'application/octet-stream', binary: true },
  glb: { type: 'model/gltf-binary', binary: true },
  gltf: { type: 'model/gltf+json', binary: false },
  obj: { type: 'text/plain; charset=utf-8', binary: false },
  mtl: { type: 'text/plain; charset=utf-8', binary: false },
  ttf: { type: 'font/ttf', binary: true },
  otf: { type: 'font/otf', binary: true },
  woff: { type: 'font/woff', binary: true },
  woff2: { type: 'font/woff2', binary: true },
  atlas: { type: 'text/plain; charset=utf-8', binary: false },
  fnt: { type: 'text/plain; charset=utf-8', binary: false },
  csv: { type: 'text/csv; charset=utf-8', binary: false },
  tmx: { type: 'application/xml; charset=utf-8', binary: false },
  tsx: { type: 'application/xml; charset=utf-8', binary: false },  // tuiles Tiled (pas du TypeScript)
};

/** Signatures de début de fichier attendues pour certains types (le reste est contrôlé par les interdits). */
const MAGIC: Record<string, number[][]> = {
  png: [[0x89, 0x50, 0x4e, 0x47]],
  jpg: [[0xff, 0xd8, 0xff]],
  jpeg: [[0xff, 0xd8, 0xff]],
  gif: [[0x47, 0x49, 0x46, 0x38]],
  webp: [[0x52, 0x49, 0x46, 0x46]],
  wav: [[0x52, 0x49, 0x46, 0x46]],
  ogg: [[0x4f, 0x67, 0x67, 0x53]],
  oga: [[0x4f, 0x67, 0x67, 0x53]],
  flac: [[0x66, 0x4c, 0x61, 0x43]],
  wasm: [[0x00, 0x61, 0x73, 0x6d]],
  glb: [[0x67, 0x6c, 0x54, 0x46]],
  woff: [[0x77, 0x4f, 0x46, 0x46]],
  woff2: [[0x77, 0x4f, 0x46, 0x32]],
  ttf: [[0x00, 0x01, 0x00, 0x00], [0x74, 0x72, 0x75, 0x65]],
  otf: [[0x4f, 0x54, 0x54, 0x4f]],
  mp3: [[0x49, 0x44, 0x33], [0xff, 0xfb], [0xff, 0xf3], [0xff, 0xf2], [0xff, 0xfa]],
  ktx2: [[0xab, 0x4b, 0x54, 0x58]],
};

/** Contenus interdits quel que soit le nom : exécutables, scripts système, archives imbriquées. */
const FORBIDDEN_MAGIC: [string, number[]][] = [
  ['exécutable Windows (PE/MZ)', [0x4d, 0x5a]],
  ['exécutable Linux (ELF)', [0x7f, 0x45, 0x4c, 0x46]],
  ['exécutable macOS (Mach-O)', [0xcf, 0xfa, 0xed, 0xfe]],
  ['exécutable macOS (Mach-O)', [0xfe, 0xed, 0xfa, 0xcf]],
  ['exécutable macOS (universel)', [0xca, 0xfe, 0xba, 0xbe]],
  ['archive zip imbriquée', [0x50, 0x4b, 0x03, 0x04]],
  ['archive RAR', [0x52, 0x61, 0x72, 0x21]],
  ['archive 7z', [0x37, 0x7a, 0xbc, 0xaf]],
  ['document Office (OLE)', [0xd0, 0xcf, 0x11, 0xe0]],
  ['script système', [0x23, 0x21]], // #! en tête d'un fichier censé être binaire
];

const COMPRESSED = { gz: 'gzip', br: 'br' } as const;
const IGNORED = /(^|\/)(__MACOSX\/|\.DS_Store$|Thumbs\.db$|desktop\.ini$)/i;

/** Motifs à signaler dans le code (examinés ensuite par l'agent vérificateur et par un humain). */
const SUSPICIOUS: { label: string; re: RegExp; severity: 'élevée' | 'moyenne' }[] = [
  { label: 'accès au wallet du joueur', re: /window\.ethereum|eth_requestAccounts|eth_sendTransaction|eth_sign|personal_sign|wallet_|solana\.connect|phantom/i, severity: 'élevée' },
  { label: 'minage de crypto', re: /coinhive|cryptonight|coin-hive|webminer|minero|stratum\+tcp|CryptoLoot|deepMiner/i, severity: 'élevée' },
  { label: 'code caché décodé puis exécuté', re: /eval\s*\(\s*(atob|unescape|decodeURIComponent)\s*\(|new\s+Function\s*\(\s*atob/i, severity: 'élevée' },
  { label: 'prise de contrôle de la page parente', re: /(window\.)?(top|parent)\.location\s*(=|\.href\s*=|\.replace|\.assign)/i, severity: 'élevée' },
  { label: 'demande d\'identifiants', re: /navigator\.credentials|type\s*=\s*["']password["']/i, severity: 'moyenne' },
  { label: 'service worker', re: /serviceWorker\.register/i, severity: 'moyenne' },
  { label: 'script chargé depuis l\'extérieur', re: /<script[^>]+src\s*=\s*["']?(https?:)?\/\//i, severity: 'moyenne' },
  { label: 'cadre externe', re: /<iframe[^>]+src\s*=\s*["']?(https?:)?\/\//i, severity: 'moyenne' },
  { label: 'notifications ou accès matériel', re: /Notification\.requestPermission|getUserMedia|navigator\.(usb|bluetooth|serial|hid)/i, severity: 'moyenne' },
  { label: 'redirection automatique', re: /<meta[^>]+http-equiv\s*=\s*["']?refresh/i, severity: 'moyenne' },
];

export interface GameFile {
  path: string;
  bytes: Uint8Array;
  ext: string;
  type: string;
  encoding?: 'gzip' | 'br';
}

export interface Finding { file: string; issue: string; severity: 'élevée' | 'moyenne'; excerpt?: string }

export interface Inspection {
  ok: boolean;               // false = refus automatique (erreurs bloquantes)
  errors: string[];
  findings: Finding[];       // motifs suspects (non bloquants, à examiner)
  files: GameFile[];
  entry: string;
  totalBytes: number;
  externalDomains: string[]; // domaines contactés par le code
}

const startsWith = (b: Uint8Array, sig: number[]) => sig.every((v, i) => b[i] === v);

function splitName(path: string) {
  const name = path.split('/').pop() || '';
  const parts = name.toLowerCase().split('.');
  let encoding: 'gzip' | 'br' | undefined;
  if (parts.length > 2 && parts[parts.length - 1] in COMPRESSED) encoding = COMPRESSED[parts.pop() as keyof typeof COMPRESSED];
  return { ext: parts.length > 1 ? parts[parts.length - 1] : '', encoding };
}

function normalize(raw: string): string | null {
  const p = raw.replace(/\\/g, '/');
  if (p.startsWith('/') || /^[a-z]:/i.test(p) || p.length > LIMITS.pathLength) return null;
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1f<>:"|?*]/.test(p)) return null;
  const segments = p.split('/').filter((s) => s !== '' && s !== '.');
  if (segments.some((s) => s === '..')) return null;
  return segments.join('/');
}

const decoder = new TextDecoder('utf-8', { fatal: true });

export function inspectZip(zip: Uint8Array): Inspection {
  const errors: string[] = [];
  const findings: Finding[] = [];
  const domains = new Set<string>();
  if (zip.byteLength > LIMITS.zipBytes) return fail(`Zip trop lourd (${mb(zip.byteLength)}, maximum ${mb(LIMITS.zipBytes)}).`);
  if (!startsWith(zip, [0x50, 0x4b, 0x03, 0x04])) return fail('Le fichier déposé n\'est pas un zip.');

  // 1. Lecture de l'index du zip : on refuse avant de décompresser ce qui dépasse les limites.
  let declared = 0, count = 0;
  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(zip, {
      filter: (f) => {
        if (f.name.endsWith('/') || IGNORED.test(f.name)) return false;
        count++;
        declared += f.originalSize;
        if (count > LIMITS.files) throw new Error(`Trop de fichiers (maximum ${LIMITS.files}).`);
        if (f.originalSize > LIMITS.fileBytes) throw new Error(`Fichier trop lourd : ${f.name} (${mb(f.originalSize)}).`);
        if (declared > LIMITS.totalBytes) throw new Error(`Jeu trop lourd une fois décompressé (maximum ${mb(LIMITS.totalBytes)}).`);
        if (f.size > 0 && f.originalSize / f.size > LIMITS.ratio) throw new Error(`Taux de compression anormal (bombe zip ?) : ${f.name}.`);
        return true;
      },
    });
  } catch (e: any) {
    return fail(e?.message?.startsWith('invalid') ? 'Zip illisible ou corrompu.' : e.message);
  }

  // 2. Chemins : pas de remontée de dossier, pas de chemin absolu ; dossier racine unique retiré.
  const raw = Object.entries(entries);
  const paths: [string, Uint8Array][] = [];
  for (const [name, bytes] of raw) {
    const p = normalize(name);
    if (!p) { errors.push(`Chemin refusé : ${name}`); continue; }
    paths.push([p, bytes]);
  }
  const hasRootIndex = paths.some(([p]) => p.toLowerCase() === 'index.html');
  const tops = new Set(paths.map(([p]) => p.split('/')[0]));
  const prefix = !hasRootIndex && tops.size === 1 && paths.every(([p]) => p.includes('/')) ? [...tops][0] + '/' : '';

  const files: GameFile[] = [];
  let totalBytes = 0;
  for (const [p0, bytes] of paths) {
    const path = prefix ? p0.slice(prefix.length) : p0;
    totalBytes += bytes.byteLength;
    if (bytes.byteLength > LIMITS.fileBytes) { errors.push(`Fichier trop lourd : ${path}`); continue; }
    if (totalBytes > LIMITS.totalBytes) { errors.push('Jeu trop lourd une fois décompressé.'); break; }

    const { ext, encoding } = splitName(path);
    const allowed = ALLOWED[ext];
    if (!allowed) { errors.push(`Type de fichier non autorisé : ${path}`); continue; }

    // 3. Contenu réel : jamais d'exécutable, même renommé (sauf fichier compressé, contrôlé par son en-tête).
    if (encoding === 'gzip' && !startsWith(bytes, [0x1f, 0x8b])) { errors.push(`Faux fichier compressé : ${path}`); continue; }
    if (!encoding) {
      // Fichiers binaires : signatures d'exécutables et d'archives. Fichiers texte : le contrôle UTF-8 sans octet nul
      // ci-dessous écarte déjà tout exécutable (qui contient forcément des octets nuls).
      const bad = allowed.binary ? FORBIDDEN_MAGIC.find(([, sig]) => startsWith(bytes, sig)) : undefined;
      if (bad) { errors.push(`Contenu interdit (${bad[0]}) : ${path}`); continue; }
      const magic = MAGIC[ext];
      if (magic && bytes.byteLength > 0 && !magic.some((sig) => startsWith(bytes, sig))) { errors.push(`Le contenu ne correspond pas à l'extension .${ext} : ${path}`); continue; }
      if (!allowed.binary) {
        let text = '';
        try { text = decoder.decode(bytes); } catch { errors.push(`Fichier texte invalide (pas de l'UTF-8) : ${path}`); continue; }
        if (text.includes('\u0000')) { errors.push(`Fichier texte contenant des données binaires : ${path}`); continue; }
        if (['html', 'htm', 'js', 'mjs', 'svg', 'json'].includes(ext)) scan(path, text, findings, domains);
      }
    }
    files.push({ path, bytes, ext, type: allowed.type, encoding });
  }

  const entry = files.find((f) => f.path.toLowerCase() === 'index.html')?.path;
  if (!entry) errors.push('Aucun fichier index.html à la racine du jeu.');
  if (!files.length) errors.push('Le zip ne contient aucun fichier de jeu.');

  return { ok: errors.length === 0, errors, findings, files, entry: entry || 'index.html', totalBytes, externalDomains: [...domains].sort() };

  function fail(message: string): Inspection {
    return { ok: false, errors: [message], findings: [], files: [], entry: 'index.html', totalBytes: 0, externalDomains: [] };
  }
}

function scan(file: string, text: string, findings: Finding[], domains: Set<string>) {
  for (const s of SUSPICIOUS) {
    const m = s.re.exec(text);
    if (m) {
      const at = Math.max(0, m.index - 80);
      findings.push({ file, issue: s.label, severity: s.severity, excerpt: text.slice(at, m.index + m[0].length + 80).replace(/\s+/g, ' ') });
    }
  }
  for (const m of text.matchAll(/https?:\/\/([a-z0-9.-]+\.[a-z]{2,})/gi)) {
    const host = m[1].toLowerCase();
    if (!/(^|\.)(w3\.org|schemas\.|xmlns|example\.com)/.test(host)) domains.add(host);
  }
}

const mb = (n: number) => `${Math.round(n / 1024 / 1024)} Mo`;
