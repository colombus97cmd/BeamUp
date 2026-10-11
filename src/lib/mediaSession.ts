// Commandes système (écran verrouillé, casque Bluetooth, kit mains libres, notification Android)
// via l'API Media Session. Sans effet sur les navigateurs qui ne la gèrent pas.
export function setMediaSession(media: HTMLMediaElement, info: { title: string; artist: string }) {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
  const ms = navigator.mediaSession;
  try {
    ms.metadata = new MediaMetadata({
      title: info.title,
      artist: info.artist,
      album: 'BeamUp',
      artwork: [
        { src: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
      ],
    });
    ms.setActionHandler('play', () => media.play());
    ms.setActionHandler('pause', () => media.pause());
    ms.setActionHandler('seekbackward', (d) => { media.currentTime = Math.max(0, media.currentTime - (d.seekOffset || 10)); });
    ms.setActionHandler('seekforward', (d) => { media.currentTime = Math.min(media.duration || Infinity, media.currentTime + (d.seekOffset || 10)); });
    ms.setActionHandler('seekto', (d) => { if (d.seekTime !== undefined) media.currentTime = d.seekTime; });
  } catch {
    // Certaines actions ne sont pas prises en charge selon le navigateur.
  }
}
