// Montage aux couleurs de BeamUp : anneau néon, comète, cyan #00F2FF / violet #BC13FE, police Geist ;
// titre du jeu en Permanent Marker. Mention écrite de l'origine du projet (sans logo d'établissement).
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const DUREE = 45;
const INTRO = 3.8;
const FIN = 40;
const CYAN = '0x00F2FF', VIOLET = '0xBC13FE', ORANGE = '0xE8822A', NOIR = '0x020202';
// Chemins relatifs au dossier de travail (ffmpeg y est lancé) : le « C: » casserait la syntaxe des filtres.
const P = { marker: 'polices/PermanentMarker-Regular.ttf', black: 'polices/Geist-Black.ttf', bold: 'polices/Geist-Bold.ttf', semi: 'polices/Geist-SemiBold.ttf' };

/** Début (en secondes) du passage le plus énergique de `duree` secondes du morceau (volume moyen le plus élevé). */
export function meilleurPassage(musique, duree) {
  const sortie = execFileSync('ffmpeg', ['-v', 'error', '-i', musique, '-af',
    'asetnsamples=44100,astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=-', '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 1 << 24 });
  const v = sortie.split('\n').filter((l) => l.includes('RMS_level')).map((l) => Number(l.split('=')[1])).map((x) => (Number.isFinite(x) ? x : -90));
  let meilleur = 0, score = -Infinity;
  for (let s = 0; s + duree <= v.length; s++) {
    const m = v.slice(s, s + duree).reduce((a, b) => a + b, 0) / duree;
    if (m > score) { score = m; meilleur = s; }
  }
  return meilleur;
}

/** Détoure une fois pour toutes l'anneau néon et la comète : fond sombre rendu transparent selon la luminosité. */
function detourer(dossier) {
  const geq = (seuil, gain, bord) => `format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='clip((max(max(r(X,Y),g(X,Y)),b(X,Y))-${seuil})*${gain},0,255)*min(1,min(min(X,W-X),min(Y,H-Y))/${bord})'`;
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', 'visuels/anneau.png', '-vf', `crop=560:316:40:162,scale=1080:-2,${geq(22, 4, 60)}`, '-frames:v', '1', 'visuels/anneau-detoure.png'], { cwd: dossier });
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', 'visuels/comete.png', '-vf', `crop=424:600:300:200,${geq(75, 3, 40)}`, '-frames:v', '1', 'visuels/comete-detouree.png'], { cwd: dossier });
}

export function monter({ dossier, partie, musique, debutMusique, sousTitres, sortie, crf = 21 }) {
  detourer(dossier);
  rmSync(join(dossier, 'textes'), { recursive: true, force: true });
  mkdirSync(join(dossier, 'textes'), { recursive: true });
  let n = 0;
  const texte = (t, { police = P.bold, taille = 60, couleur = 'white', y, x = '(w-text_w)/2', de, a, extra = '' }) => {
    const f = `textes/l${n++}.txt`;
    writeFileSync(join(dossier, f), t); // fichier UTF-8 : pas d'échappement d'apostrophes ni d'accents
    return `drawtext=fontfile=${police}:textfile=${f}:fontsize=${taille}:fontcolor=${couleur}:x=${x}:y=${y}${extra}:enable='between(t,${de},${a})'`;
  };
  const lignes = (ls, o) => ls.map((l, i) => texte(l, { ...o, y: o.y + i * Math.round((o.taille || 60) * 1.32) }));
  const quand = (a, b) => `enable='between(t,${a},${b})'`;
  const fenetres = [[INTRO, 12], [12, 21], [21, 30.5], [30.5, FIN]];

  const graphe = [
    // Anneau néon (image de partage BeamUp) et comète : fonds sombres rendus transparents selon la luminosité.
    `[2:v]format=rgba,split[anneauA][anneauB]`,
    `[anneauA]colorchannelmixer=aa=0.55[anneauIntro]`,
    `[3:v]format=rgba,split[cometeA][cometeB]`,
    `[cometeA]scale=190:-2[cometeFin]`,
    `[cometeB]scale=46:-2[cometeMini]`,
    `[0:v]trim=0:${DUREE},setpts=PTS-STARTPTS,drawbox=x=0:y=0:w=iw:h=ih:color=${NOIR}@0.86:t=fill:${quand(0, INTRO)},drawbox=x=0:y=0:w=iw:h=ih:color=${NOIR}@0.95:t=fill:${quand(FIN, DUREE)}[base]`,
    `[base][anneauIntro]overlay=x=0:y=(H-h)/2-140:${quand(0, INTRO)}[v1]`,
    `[v1][anneauB]overlay=x=0:y=380:${quand(FIN, DUREE)}[v2]`,
    `[v2][cometeFin]overlay=x=(W-w)/2:y=380+(617-h)/2-10:${quand(FIN + 0.2, DUREE)}[v3]`,
    // Bandeau « cyber-glass » des sous-titres avec liseré dégradé cyan → violet.
    `[v3]drawbox=x=0:y=1490:w=iw:h=340:color=0x050505@0.94:t=fill:${quand(INTRO, FIN)}[v4]`,
    `[v4][4:v]overlay=x=0:y=1490:${quand(INTRO, FIN)}[v5]`,
    `[v5][cometeMini]overlay=x=40:y=36:${quand(INTRO, FIN)}[v6]`,
    `[v6]` + [
      texte('CHAINS', { police: P.marker, taille: 150, couleur: ORANGE, y: 560, de: 0.15, a: INTRO, extra: ':borderw=4:bordercolor=black@0.6' }),
      texte('&', { police: P.marker, taille: 90, couleur: '0xB6A690', y: 735, de: 0.35, a: INTRO }),
      texte('CROWNS', { police: P.marker, taille: 150, y: 820, de: 0.55, a: INTRO, extra: ':borderw=4:bordercolor=black@0.6' }),
      texte('Échecs · Guadeloupe 1802', { police: P.semi, taille: 50, y: 1080, de: 0.9, a: INTRO }),
      texte('sur BeamUp', { police: P.black, taille: 46, couleur: CYAN, y: 1160, de: 1.2, a: INTRO }),
      texte('BEAM UP', { police: P.black, taille: 30, x: '96', y: 58, de: INTRO, a: FIN, extra: ':alpha=0.85' }),
      ...sousTitres.slice(0, 4).flatMap((ls, i) => lignes(ls, { police: P.bold, taille: 62, y: 1572, de: fenetres[i][0], a: fenetres[i][1] })),
      texte('BeamUp', { police: P.black, taille: 150, y: 1040, de: FIN, a: DUREE, extra: `:borderw=3:bordercolor=${CYAN}@0.45` }),
      ...lignes(['Jeux · Musique · Mangas · Films', 'des créateurs indépendants'], { police: P.semi, taille: 52, y: 1240, de: FIN + 0.3, a: DUREE }),
      texte('beamup.beautifull-earthcorp.tech/jeux', { police: P.bold, taille: 44, couleur: CYAN, y: 1420, de: FIN + 0.6, a: DUREE }),
      texte('Projet né au BUT MMI de l’IUT de la Guadeloupe', { police: P.semi, taille: 34, couleur: '0x9CA3AF', y: 1760, de: FIN + 0.9, a: DUREE }),
      `fade=t=in:st=0:d=0.5,fade=t=out:st=${DUREE - 0.8}:d=0.8`,
    ].join(',') + '[v]',
    `[1:a]atrim=0:${DUREE},asetpts=PTS-STARTPTS,afade=t=in:st=0:d=1,afade=t=out:st=${DUREE - 2.5}:d=2.5,volume=0.9[a]`,
  ].join(';');

  execFileSync('ffmpeg', [
    '-v', 'error', '-y',
    '-i', partie,
    '-ss', String(debutMusique), '-i', musique,
    '-loop', '1', '-t', String(DUREE), '-i', 'visuels/anneau-detoure.png',
    '-loop', '1', '-t', String(DUREE), '-i', 'visuels/comete-detouree.png',
    '-f', 'lavfi', '-t', String(DUREE), '-i', `gradients=s=1080x6:c0=${CYAN}:c1=${VIOLET}:x0=0:y0=3:x1=1080:y1=3:r=30`,
    '-filter_complex', graphe,
    '-map', '[v]', '-map', '[a]',
    '-c:v', 'libx264', '-crf', String(crf), '-preset', 'medium', '-pix_fmt', 'yuv420p', '-r', '30',
    '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', '-t', String(DUREE),
    sortie,
  ], { stdio: 'inherit', cwd: dossier });
}
