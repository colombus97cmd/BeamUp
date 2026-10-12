'use client';
import { useEffect, useRef } from 'react';

// Fusées de lumière en arrière-plan : la fusée du logo BeamUp (découpée dans /icon-512x512.png, fond rendu transparent),
// en plusieurs tailles, orientée dans le sens de sa trajectoire, avec un halo qui respire et une traînée effervescente
// qui part de l'orbe. Mouvement « vivant » : cap qui ondule (sinus superposés à phases aléatoires), légère curiosité
// pour le pointeur, écart entre fusées. Profondeur simulée (« 2,5D ») : chaque fusée avance ou recule (z), avec
// perspective (taille et vitesse apparente), raccourci quand elle plonge vers l'écran ou s'en éloigne, voile des lointaines. Canvas en mode additif, sans interaction ; pause quand l'onglet est caché ;
// une seule image fixe si l'utilisateur préfère réduire les animations.

interface Props {
  /** Couleur de la traînée (ex. couleur du format affiché) ; violet BeamUp par défaut. */
  tint?: string;
  /** Nombre de fusées ; par défaut selon la taille de l'écran. */
  count?: number;
  className?: string;
}

interface Rocket {
  x: number; y: number; z: number; heading: number; pitch: number; speed: number; size: number;
  phase: number[]; freq: number[]; trail: { x: number; y: number; s: number }[]; life: number; pulse: number;
}
interface Spark { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number }

const LOGO_SRC = '/icon-512x512.png';
const CYAN = [0, 242, 255];
const DEFAULT_TINT = [188, 19, 254];

function parseColor(c?: string): number[] {
  if (!c) return DEFAULT_TINT;
  const hex = c.match(/^#([0-9a-f]{6})$/i);
  if (hex) return [0, 2, 4].map((i) => parseInt(hex[1].slice(i, i + 2), 16));
  const rgb = c.match(/rgba?\((\d+)\D+(\d+)\D+(\d+)/i);
  return rgb ? [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])] : DEFAULT_TINT;
}

/** Halo radial pré-dessiné (bien plus rapide que shadowBlur à chaque image). */
function glowSprite(rgb: number[], core = 0.9) {
  const s = document.createElement('canvas');
  s.width = s.height = 64;
  const g = s.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, `rgba(255,255,255,${core})`);
  grad.addColorStop(0.18, `rgba(${rgb.join(',')},0.85)`);
  grad.addColorStop(0.5, `rgba(${rgb.join(',')},0.22)`);
  grad.addColorStop(1, `rgba(${rgb.join(',')},0)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return s;
}

/**
 * Fusée du logo, fond retiré : l'opacité suit la luminosité (le fond nuit violet est sombre, la fusée cyan est lumineuse),
 * puis l'image est recadrée au plus près de la fusée. Renvoie aussi la position de l'orbe (fraction de la hauteur).
 */
function keyLogo(img: HTMLImageElement) {
  const src = document.createElement('canvas');
  src.width = img.naturalWidth; src.height = img.naturalHeight;
  const g = src.getContext('2d', { willReadFrequently: true })!;
  g.drawImage(img, 0, 0);
  const data = g.getImageData(0, 0, src.width, src.height);
  const px = data.data;
  let minX = src.width, minY = src.height, maxX = 0, maxY = 0;
  // La fusée occupe le centre de l'icône : on ignore le pourtour (marges claires et coins arrondis de l'icône).
  const x0 = src.width * 0.26, x1 = src.width * 0.74, y0 = src.height * 0.2, y1 = src.height * 0.805;
  for (let i = 0; i < px.length; i += 4) {
    const p = i / 4, px_ = p % src.width, py = (p / src.width) | 0;
    const inside = px_ > x0 && px_ < x1 && py > y0 && py < y1;
    const lum = 0.3 * px[i] + 0.59 * px[i + 1] + 0.11 * px[i + 2];
    const a = inside ? Math.max(0, Math.min(1, (lum - 48) / 110)) : 0;
    px[i + 3] = Math.round(a * 255);
    if (a > 0.08) {
      const x = px_, y = py;
      if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
  }
  g.putImageData(data, 0, 0);
  const pad = 6;
  minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad); maxX = Math.min(src.width - 1, maxX + pad); maxY = Math.min(src.height - 1, maxY + pad);
  const out = document.createElement('canvas');
  out.width = maxX - minX + 1; out.height = maxY - minY + 1;
  out.getContext('2d')!.drawImage(src, minX, minY, out.width, out.height, 0, 0, out.width, out.height);
  return out;
}

export default function CometField({ tint, count, className = '' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tintRef = useRef(parseColor(tint));
  const spritesRef = useRef<{ glow: HTMLCanvasElement; trail: HTMLCanvasElement; spark: HTMLCanvasElement; rocket: HTMLCanvasElement | null } | null>(null);

  // Œuvre suivante dans le fil : la traînée prend la couleur de son format.
  useEffect(() => {
    tintRef.current = parseColor(tint);
    if (spritesRef.current) spritesRef.current.trail = glowSprite(tintRef.current, 0.3);
  }, [tint]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    spritesRef.current = { glow: glowSprite(CYAN, 0.6), trail: glowSprite(tintRef.current, 0.3), spark: glowSprite([200, 250, 255], 1), rocket: null };

    let w = 0, h = 0, raf = 0, last = performance.now(), t = 0, stopped = false;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const pointer = { x: -9999, y: -9999, active: false };
    const rockets: Rocket[] = [];
    const sparks: Spark[] = [];
    const rand = (a: number, b: number) => a + Math.random() * (b - a);
    const ROCKET_H = 92; // hauteur d'une fusée de taille 1 à la profondeur 1, en pixels
    const Z_MIN = 0.4, Z_MAX = 2;
    /** Échelle à l'écran : taille propre × profondeur (proche = grand). */
    const scaleOf = (r: Rocket) => r.size * r.z;
    /** Raccourci de perspective : une fusée qui plonge vers l'écran ou s'en éloigne paraît plus courte. */
    const foreshorten = (r: Rocket) => 0.32 + 0.68 * Math.abs(Math.cos(r.pitch));

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      w = r.width; h = r.height;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const spawn = (anywhere = false): Rocket => {
      // Tailles variées, avec davantage de petites fusées que de grandes.
      const size = 0.45 + Math.pow(Math.random(), 1.5) * 1.15;
      const z = rand(Z_MIN + 0.1, Z_MAX - 0.3);
      let x: number, y: number, heading: number;
      if (anywhere) { x = rand(0, w); y = rand(0, h); heading = rand(0, Math.PI * 2); }
      else {
        const side = Math.floor(rand(0, 4));
        x = side === 0 ? -80 : side === 1 ? w + 80 : rand(0, w);
        y = side === 2 ? -80 : side === 3 ? h + 80 : rand(0, h);
        heading = Math.atan2(h / 2 + rand(-h / 3, h / 3) - y, w / 2 + rand(-w / 3, w / 3) - x);
      }
      return {
        x, y, z, heading, pitch: 0, size, speed: rand(22, 48) * (0.55 + size * 0.45),
        phase: [rand(0, 6.3), rand(0, 6.3), rand(0, 6.3), rand(0, 6.3)], freq: [rand(0.15, 0.35), rand(0.5, 0.9), rand(1.3, 2.1), rand(0.08, 0.2)],
        trail: [], life: 0, pulse: rand(0, 6.3),
      };
    };

    /** Position de l'orbe (arrière de la fusée), d'où part la traînée. */
    const tailOf = (r: Rocket) => {
      const off = ROCKET_H * scaleOf(r) * foreshorten(r) * 0.42;
      return { x: r.x - Math.cos(r.heading) * off, y: r.y - Math.sin(r.heading) * off, s: scaleOf(r) };
    };

    const n = count ?? Math.max(5, Math.min(10, Math.round((window.innerWidth * window.innerHeight) / 150000)));

    const step = (dt: number) => {
      t += dt;
      for (const r of rockets) {
        r.life += dt;
        const turn = Math.sin(t * r.freq[0] + r.phase[0]) * 0.55 + Math.sin(t * r.freq[1] + r.phase[1]) * 0.3 + Math.sin(t * r.freq[2] + r.phase[2]) * 0.12;
        r.heading += turn * dt;
        // Tangage lent : la fusée monte vers l'écran ou s'enfonce dans le fond ; rappel doux aux limites de profondeur.
        r.pitch = Math.sin(t * r.freq[3] + r.phase[3]) * 0.95;
        r.z += Math.sin(r.pitch) * dt * 0.16 * (0.6 + r.size * 0.4);
        if (r.z > Z_MAX) r.z -= (r.z - Z_MAX) * dt * 2;
        if (r.z < Z_MIN) r.z += (Z_MIN - r.z) * dt * 2;
        if (pointer.active && r.z > 0.8) {
          const dx = pointer.x - r.x, dy = pointer.y - r.y, d = Math.hypot(dx, dy);
          if (d < 280 && d > 1) {
            const toward = Math.atan2(dy, dx);
            const diff = Math.atan2(Math.sin(toward - r.heading), Math.cos(toward - r.heading));
            r.heading += diff * dt * (d > 110 ? 0.8 : -1.6); // curiosité, puis esquive
          }
        }
        for (const o of rockets) {
          if (o === r) continue;
          if (Math.abs(r.z - o.z) > 0.35) continue; // à des profondeurs différentes, elles se croisent sans se gêner
          const dx = r.x - o.x, dy = r.y - o.y, d = Math.hypot(dx, dy);
          if (d < 110 * r.z && d > 0.1) {
            const away = Math.atan2(dy, dx);
            r.heading += Math.atan2(Math.sin(away - r.heading), Math.cos(away - r.heading)) * dt * 0.6;
          }
        }
        // Parallaxe : à vitesse égale, une fusée proche traverse l'écran plus vite qu'une lointaine.
        const v = r.speed * r.z * Math.cos(r.pitch) * (0.85 + 0.15 * Math.sin(t * 0.7 + r.pulse));
        r.x += Math.cos(r.heading) * v * dt;
        r.y += Math.sin(r.heading) * v * dt;
        // Traîne échantillonnée à distance régulière depuis l'orbe : longueur stable quelle que soit la vitesse.
        const tail = tailOf(r);
        const lastPt = r.trail[0];
        if (!lastPt || Math.hypot(tail.x - lastPt.x, tail.y - lastPt.y) > 4 * scaleOf(r) + 1.5) r.trail.unshift(tail);
        const maxLen = Math.round(22 + 20 * r.size);
        if (r.trail.length > maxLen) r.trail.length = maxLen;
        // Étincelles effervescentes qui se détachent de l'orbe.
        if (Math.random() < dt * 6 * Math.min(1.6, scaleOf(r))) {
          const back = r.heading + Math.PI + rand(-0.8, 0.8);
          sparks.push({ x: tail.x, y: tail.y, vx: Math.cos(back) * rand(8, 28), vy: Math.sin(back) * rand(8, 28), life: 0, max: rand(0.6, 1.5), size: rand(2, 5) * scaleOf(r) });
        }
        if (r.x < -200 || r.x > w + 200 || r.y < -200 || r.y > h + 200) Object.assign(r, spawn());
      }
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.life += dt;
        s.x += s.vx * dt; s.y += s.vy * dt;
        s.vx *= 0.97; s.vy *= 0.97;
        if (s.life > s.max) sparks.splice(i, 1);
      }
      if (sparks.length > 220) sparks.splice(0, sparks.length - 220);
    };

    const draw = () => {
      const sp = spritesRef.current!;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      // Des plus lointaines aux plus proches, pour que les proches passent devant.
      for (const r of [...rockets].sort((a, b) => a.z - b.z)) {
        const breath = 0.75 + 0.25 * Math.sin(t * 1.6 + r.pulse);
        const sc = scaleOf(r);
        // Voile de profondeur : les lointaines sont plus pâles, comme noyées dans la nébuleuse.
        const depth = Math.min(1, Math.max(0, (r.z - Z_MIN) / (1.2 - Z_MIN)));
        const fadeIn = Math.min(1, r.life / 1.5) * (0.45 + 0.55 * depth);
        // Traînée de halo derrière l'orbe.
        const L = r.trail.length;
        for (let i = L - 1; i >= 0; i--) {
          const p = r.trail[i];
          const k = 1 - i / L;
          const rad = (3 + 16 * k) * p.s * (0.75 + 0.25 * breath);
          ctx.globalAlpha = 0.28 * k * k * fadeIn;
          ctx.drawImage(sp.trail, p.x - rad, p.y - rad, rad * 2, rad * 2);
        }
        // Halo autour de la fusée, qui respire.
        const gr = ROCKET_H * 0.75 * sc * (0.9 + 0.2 * breath);
        ctx.globalAlpha = 0.22 * fadeIn * breath;
        ctx.drawImage(sp.glow, r.x - gr, r.y - gr, gr * 2, gr * 2);
        // Très proches : halo élargi et diffus, comme hors de la zone de netteté.
        if (r.z > 1.35) {
          const br = gr * 1.8;
          ctx.globalAlpha = 0.1 * fadeIn * (r.z - 1.35) * 2;
          ctx.drawImage(sp.glow, r.x - br, r.y - br, br * 2, br * 2);
        }
        // La fusée du logo, pointe vers l'avant ; léger roulis vivant.
        if (sp.rocket) {
          const full = ROCKET_H * sc * (0.96 + 0.08 * breath);
          const hgt = full * foreshorten(r);
          const wid = full * (sp.rocket.width / sp.rocket.height);
          ctx.save();
          ctx.translate(r.x, r.y);
          ctx.rotate(r.heading + Math.PI / 2 + Math.sin(t * 2.3 + r.pulse) * 0.05);
          ctx.globalAlpha = (0.75 + 0.25 * breath) * fadeIn;
          ctx.drawImage(sp.rocket, -wid / 2, -hgt / 2, wid, hgt);
          ctx.restore();
        } else {
          // Logo pas encore chargé : simple orbe.
          const hr = 14 * sc;
          ctx.globalAlpha = 0.8 * fadeIn;
          ctx.drawImage(sp.glow, r.x - hr, r.y - hr, hr * 2, hr * 2);
        }
      }
      for (const s of sparks) {
        const a = 1 - s.life / s.max;
        ctx.globalAlpha = 0.7 * a * a;
        ctx.drawImage(sp.spark, s.x - s.size, s.y - s.size, s.size * 2, s.size * 2);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    };

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      step(dt);
      draw();
      raf = requestAnimationFrame(loop);
    };

    resize();
    for (let i = 0; i < n; i++) rockets.push(spawn(true));
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const img = new Image();
    img.onload = () => {
      if (stopped || !spritesRef.current) return;
      try { spritesRef.current.rocket = keyLogo(img); } catch { /* image illisible : orbes seules */ }
      if (reduced) { for (let i = 0; i < 90; i++) step(1 / 30); draw(); }
    };
    img.src = LOGO_SRC;

    if (reduced) {
      draw();
      return () => { stopped = true; ro.disconnect(); };
    }

    const onMove = (e: PointerEvent) => {
      const b = canvas.getBoundingClientRect();
      pointer.x = e.clientX - b.left; pointer.y = e.clientY - b.top; pointer.active = true;
    };
    const onLeave = () => { pointer.active = false; };
    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) { last = performance.now(); raf = requestAnimationFrame(loop); }
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    document.addEventListener('visibilitychange', onVisibility);
    raf = requestAnimationFrame(loop);
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [count]);

  return <canvas ref={canvasRef} aria-hidden="true" className={`pointer-events-none ${className}`} />;
}
