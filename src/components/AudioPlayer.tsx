'use client';
import { useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, RotateCw, Music } from 'lucide-react';
import { setMediaSession } from '../lib/mediaSession';

interface AudioPlayerProps {
  src: string;
  title: string;
  artist: string;
  color: string;
  audioRef?: (el: HTMLAudioElement | null) => void;
  onPlay?: () => void;
  onTimeUpdate?: (e: React.SyntheticEvent<HTMLAudioElement, Event>) => void;
}

const fmt = (s: number) => {
  if (!isFinite(s) || s < 0) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

/**
 * Lecteur audio façon Spotify / YouTube Music : clic sur la pochette ou le bouton pour lecture/pause,
 * barre de progression cliquable, ±10 s. Commandes casque / écran verrouillé via Media Session.
 */
export default function AudioPlayer({ src, title, artist, color, audioRef, onPlay, onTimeUpdate }: AudioPlayerProps) {
  const ref = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setPlaying(false);
    setCurrent(0);
  }, [src]);

  const toggle = () => {
    const a = ref.current;
    if (!a) return;
    if (a.paused) {
      setLoading(true);
      a.play().catch(() => setLoading(false));
    } else {
      a.pause();
    }
  };

  const seekBy = (delta: number) => {
    const a = ref.current;
    if (!a) return;
    a.currentTime = Math.min(Math.max(0, a.currentTime + delta), a.duration || a.currentTime + delta);
  };

  const progress = duration ? (current / duration) * 100 : 0;

  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-4 md:gap-7 pl-5 pr-20 md:px-6 pb-10 md:pb-24 pt-6">
      <audio
        ref={(el) => {
          ref.current = el;
          audioRef?.(el);
        }}
        src={src}
        preload="metadata"
        onPlay={(e) => {
          setPlaying(true);
          setLoading(false);
          setMediaSession(e.currentTarget, { title, artist });
          onPlay?.();
        }}
        onPause={() => setPlaying(false)}
        onWaiting={() => setLoading(true)}
        onPlaying={() => setLoading(false)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onTimeUpdate={(e) => {
          setCurrent(e.currentTarget.currentTime);
          onTimeUpdate?.(e);
        }}
        onEnded={() => setPlaying(false)}
      />

      {/* Pochette : un clic = lecture / pause */}
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? 'Mettre en pause' : 'Lire'}
        className="relative w-[min(58vw,15rem)] md:w-[min(26vh,16rem)] aspect-square rounded-3xl overflow-hidden border border-white/10 shadow-2xl group/cover focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        style={{ background: `radial-gradient(circle at 30% 30%, ${color}, #0a0a0a 75%)` }}
      >
        <Music className={`absolute inset-0 m-auto w-1/3 h-1/3 text-white/25 ${playing ? 'animate-pulse' : ''}`} />
        <span className={`absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity ${playing ? 'opacity-0 group-hover/cover:opacity-100' : 'opacity-100'}`}>
          <span className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-white text-black flex items-center justify-center shadow-xl">
            {playing ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
          </span>
        </span>
      </button>

      <div className="text-center max-w-md w-full">
        <h3 className="text-xl md:text-2xl font-black tracking-tight text-white truncate">{title}</h3>
        <p className="text-xs text-gray-400 truncate mt-1">{artist}</p>
      </div>

      {/* Barre de progression */}
      <div className="w-full max-w-md">
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={current}
          onChange={(e) => {
            if (ref.current) ref.current.currentTime = Number(e.target.value);
          }}
          aria-label="Position de lecture"
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-white/15 accent-white"
          style={{ background: `linear-gradient(to right, #fff ${progress}%, rgba(255,255,255,0.15) ${progress}%)` }}
        />
        <div className="flex justify-between text-[10px] font-mono text-gray-500 mt-1.5">
          <span>{fmt(current)}</span>
          <span>{fmt(duration)}</span>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <button type="button" onClick={() => seekBy(-10)} aria-label="Reculer de 10 secondes" className="p-2 text-gray-300 hover:text-white">
          <RotateCcw className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? 'Mettre en pause' : 'Lire'}
          className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
        >
          {loading && !playing ? (
            <span className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
          ) : playing ? (
            <Pause className="w-6 h-6 fill-current" />
          ) : (
            <Play className="w-6 h-6 fill-current ml-0.5" />
          )}
        </button>
        <button type="button" onClick={() => seekBy(10)} aria-label="Avancer de 10 secondes" className="p-2 text-gray-300 hover:text-white">
          <RotateCw className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
