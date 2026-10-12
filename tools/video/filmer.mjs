// Filme une page web en 1080 × 1920 : écran de téléphone (432 × 768 points, densité 2,5),
// images capturées en pleine définition par le protocole de débogage du navigateur, assemblées par ffmpeg.
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import puppeteer from 'puppeteer-core';

export async function filmerPartie({ navigateur, url, secondes, sortie, travail }) {
  const images = join(travail, 'images');
  rmSync(images, { recursive: true, force: true });
  mkdirSync(images, { recursive: true });

  const browser = await puppeteer.launch({ executablePath: navigateur, headless: true, args: ['--hide-scrollbars', '--mute-audio'] });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 432, height: 768, deviceScaleFactor: 2.5, isMobile: true, hasTouch: true });
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 60_000 });
    await page.addStyleTag({ content: '.back-link{display:none!important}' });

    const cdp = await page.createCDPSession();
    const frames = [];
    cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
      const file = join(images, `${String(frames.length).padStart(5, '0')}.jpg`);
      writeFileSync(file, Buffer.from(data, 'base64'));
      frames.push({ file, t: metadata.timestamp });
      await cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
    });
    await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 1080, maxHeight: 1920, everyNthFrame: 1 });
    await new Promise((r) => setTimeout(r, secondes * 1000));
    await cdp.send('Page.stopScreencast');
    if (!frames.length) throw new Error('Aucune image capturée');

    // Le navigateur n'envoie une image que lorsque l'écran change : on reconstitue la durée de chaque image.
    const liste = frames.map((f, i) => `file '${f.file.replace(/\\/g, '/')}'\nduration ${Math.max(0.001, (frames[i + 1]?.t ?? f.t + 0.1) - f.t).toFixed(3)}`).join('\n')
      + `\nfile '${frames.at(-1).file.replace(/\\/g, '/')}'\n`;
    writeFileSync(join(images, 'liste.txt'), liste);
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', join(images, 'liste.txt'),
      '-vf', 'scale=1080:1920:flags=lanczos,fps=30,format=yuv420p', '-c:v', 'libx264', '-crf', '18', '-preset', 'medium', sortie]);
  } finally {
    await browser.close();
    rmSync(images, { recursive: true, force: true });
  }
}
