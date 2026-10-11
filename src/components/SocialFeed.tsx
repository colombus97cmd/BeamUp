'use client';
import { useState, useRef, useEffect } from 'react';
import { Heart, MessageCircle, Zap, Play, Share2, User, Lock, ShieldCheck, ShoppingCart, Eye, Bookmark, ChevronDown, MoreHorizontal } from 'lucide-react';
import AudioPlayer from './AudioPlayer';
import { setMediaSession } from '../lib/mediaSession';
import { getFormat } from '../config/formats';
import GameFrame from './GameFrame';
import { useAccount, useSignMessage } from 'wagmi';
import { useActiveChainId } from '../hooks/useActiveChainId';
import { requestPremiumMedia, type MediaStep } from '../services/mediaAccess';
import CommentDrawer from './CommentDrawer';

interface SocialFeedProps {
  works: (any & { id: number, isPremium: boolean, price: bigint, hasPaid: boolean, priceLabel: string, soldOut: boolean })[];
  onTip: (id: number) => void;
  onLike: (id: number) => void;
  onComment: (id: number) => void;
  onBuy: (id: number, price: bigint) => void;
  getViewCount: (id: number) => number;
  onView: (id: number) => void;
  onTrackProgress: (id: number, progress: number) => void;
  isSaved?: (id: number) => boolean;
  onToggleSave?: (id: number) => void;
  /** Laisse de la place en haut (barre de filtres de la bibliothèque). */
  topInset?: boolean;
}

export default function SocialFeed({ works, onTip, onLike, onComment, onBuy, getViewCount, onView, onTrackProgress, isSaved, onToggleSave, topInset }: SocialFeedProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [commentWorkId, setCommentWorkId] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { address } = useAccount();

  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const audioRefs = useRef<(HTMLAudioElement | null)[]>([]);
  const lastPlayedWorkId = useRef<number | null>(null);

  const getMediaUrl = (ipfsCid: string) => `https://gateway.pinata.cloud/ipfs/${ipfsCid}`;

  // Œuvres premium : fichier privé, lien temporaire obtenu après vérification on-chain du NFT.
  const chainId = useActiveChainId();
  const { signMessageAsync } = useSignMessage();
  const [premiumUrls, setPremiumUrls] = useState<Record<number, string>>({});
  const [openingId, setOpeningId] = useState<number | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [openingStep, setOpeningStep] = useState<MediaStep>('sign');

  const openPremium = async (id: number) => {
    const work = works.find((w: any) => w.id === id);
    if (!address) return;
    setOpeningId(id);
    setMediaError(null);
    try {
      setOpeningStep('sign');
      const url = await requestPremiumMedia(work?.chainId ?? chainId, work?.workId ?? id, address, signMessageAsync, setOpeningStep);
      setPremiumUrls((prev) => ({ ...prev, [id]: url }));
    } catch (e: any) {
      setMediaError(e?.shortMessage || e?.message || "Impossible d'ouvrir l'œuvre");
    } finally {
      setOpeningId(null);
    }
  };

  // Jeu gratuit : lien de jeu délivré par /api/games/play (jeu approuvé uniquement). Les jeux premium passent par openPremium.
  const [gameErrors, setGameErrors] = useState<Record<number, string>>({});
  const openFreeGame = async (id: number) => {
    const work = works.find((w: any) => w.id === id);
    setOpeningId(id);
    setGameErrors((e) => ({ ...e, [id]: '' }));
    try {
      const res = await fetch('/api/games/play', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chainId: work?.chainId ?? chainId, workId: work?.workId ?? id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) throw new Error(data.error || `Jeu indisponible (${res.status})`);
      setPremiumUrls((prev) => ({ ...prev, [id]: data.url }));
      countView(id);
    } catch (e: any) {
      setGameErrors((errs) => ({ ...errs, [id]: e.message }));
    } finally {
      setOpeningId(null);
    }
  };

  // Boutons sociaux repliables : repliés par défaut sur mobile, ouverts sur ordinateur ; choix mémorisé.
  const [actionsOpen, setActionsOpen] = useState(true);
  useEffect(() => {
    try {
      const saved = localStorage.getItem('beam_actions_open');
      setActionsOpen(saved !== null ? saved === '1' : window.innerWidth >= 768);
    } catch {
      setActionsOpen(window.innerWidth >= 768);
    }
  }, []);
  const toggleActions = () => {
    setActionsOpen((v) => {
      try { localStorage.setItem('beam_actions_open', v ? '0' : '1'); } catch {}
      return !v;
    });
  };

  const mediaSrc = (work: any) => (work.isPremium ? premiumUrls[work.id] : getMediaUrl(work.ipfsCID));

  const handleScroll = () => {
    if (containerRef.current) {
      const scrollPos = containerRef.current.scrollTop;
      const height = containerRef.current.clientHeight;
      const newIndex = Math.round(scrollPos / height);
      if (newIndex !== activeIndex) {
        setActiveIndex(newIndex);
      }
    }
  };

  // Vues réelles uniquement : une vue compte après au moins 5 s réellement lues (ou la moitié
  // d'un média plus court), une lecture complète après 90 % réellement lus. Avancer la barre
  // de lecture ne compte pas : on additionne les plages effectivement jouées.
  const countedViews = useRef<Set<number>>(new Set());
  const isLockedFor = (work: any) =>
    work.isPremium && !work.hasPaid && address?.toLowerCase() !== work.creator?.toLowerCase();

  const countView = (id: number) => {
    if (countedViews.current.has(id)) return;
    countedViews.current.add(id);
    onView(id);
  };

  const handleMediaPlay = (id: number) => {
    lastPlayedWorkId.current = id;
  };

  const handleTimeUpdate = (id: number, e: React.SyntheticEvent<HTMLMediaElement, Event>) => {
    const media = e.currentTarget;
    const duration = media.duration;
    if (!duration || !isFinite(duration)) return;
    let played = 0;
    for (let i = 0; i < media.played.length; i++) played += media.played.end(i) - media.played.start(i);
    if (played >= Math.min(5, duration * 0.5)) countView(id);
    onTrackProgress(id, (played / duration) * 100);
  };

  const handleFullscreenChange = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    const video = e.currentTarget;
    const isFullscreen = document.fullscreenElement === video || 
                         (video as any).webkitDisplayingFullscreen;
    if (!isFullscreen) {
      video.pause();
    }
  };

  // Images et GIF : une vue après 3 s réellement affichés à l'écran (œuvre non verrouillée).
  useEffect(() => {
    const activeWork = works[activeIndex];
    if (!activeWork || isLockedFor(activeWork) || getFormat(activeWork.category).kind !== 'image') return;
    const timer = setTimeout(() => countView(activeWork.id), 3000);
    return () => clearTimeout(timer);
  }, [activeIndex, works]);

  useEffect(() => {
    // Reset play session tracker when activeIndex changes
    lastPlayedWorkId.current = null;

    // Pause all video/audio that are NOT the activeIndex
    videoRefs.current.forEach((video, idx) => {
      if (video && idx !== activeIndex) {
        video.pause();
      }
    });
    audioRefs.current.forEach((audio, idx) => {
      if (audio && idx !== activeIndex) {
        audio.pause();
      }
    });

    if (commentWorkId !== null) {
      // Pause active media if comment drawer opens
      if (videoRefs.current[activeIndex]) videoRefs.current[activeIndex]?.pause();
      if (audioRefs.current[activeIndex]) audioRefs.current[activeIndex]?.pause();
    }
  }, [activeIndex, commentWorkId]);


  const getThemeColor = (cat: string) => getFormat(cat).glow;

  return (
    <div className="relative h-full w-full bg-[#020202] overflow-hidden">
      <style jsx global>{`
        @keyframes nebula-pulse {
          0% { transform: scale(1) translate(0, 0); opacity: 0.3; }
          50% { transform: scale(1.2) translate(5%, 5%); opacity: 0.5; }
          100% { transform: scale(1) translate(0, 0); opacity: 0.3; }
        }
        @keyframes particle-flow {
          0% { transform: translateY(0) rotate(0deg); opacity: 0; }
          50% { opacity: 0.5; }
          100% { transform: translateY(-100vh) rotate(360deg); opacity: 0; }
        }
        .animate-nebula { animation: nebula-pulse 10s infinite ease-in-out; }
        .animate-particle { animation: particle-flow 8s infinite linear; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* Dynamic Background Layer */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div 
          className="absolute inset-0 animate-nebula transition-all duration-1000"
          style={{ 
            background: `radial-gradient(circle at 50% 50%, ${getThemeColor(works[activeIndex]?.category)}, transparent 70%)`,
            filter: 'blur(100px)'
          }} 
        />
        
        {[...Array(20)].map((_, i) => (
          <div 
            key={i}
            className="absolute bottom-0 w-1 h-1 bg-white rounded-full animate-particle"
            style={{ 
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 8}s`,
              backgroundColor: getThemeColor(works[activeIndex]?.category),
              boxShadow: `0 0 10px ${getThemeColor(works[activeIndex]?.category)}`
            }}
          />
        ))}

        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] z-10 bg-[length:100%_2px,3px_100%] pointer-events-none" />
      </div>

      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="h-[calc(100vh-64px)] w-full overflow-y-scroll snap-y snap-mandatory scroll-smooth no-scrollbar relative z-10"
      >
        {works.map((work, i) => {
          const isLocked = work.isPremium && !work.hasPaid && address?.toLowerCase() !== work.creator?.toLowerCase();

          return (
            <div key={i} className="h-full w-full snap-start relative flex items-center justify-center overflow-hidden">
              <div className={`relative z-10 w-full h-full flex flex-col items-center justify-start md:justify-center px-3 md:p-6 ${topInset ? 'pt-14 md:pt-16' : 'pt-3'}`}>
                <div className="w-full max-w-3xl h-[calc(100%-6.5rem)] md:h-[76vh] rounded-3xl md:rounded-[40px] overflow-hidden relative shadow-[0_0_120px_rgba(0,0,0,1)] border border-white/10 group bg-black/40 backdrop-blur-sm">
                  
                  {isLocked ? (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-black/60 backdrop-blur-3xl relative overflow-hidden group">
                      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_50%_50%,#bc13fe,transparent_70%)] animate-pulse" />
                      <div className="relative z-10 flex flex-col items-center gap-5 md:gap-7 p-6 md:p-10 text-center">
                        <div className="relative">
                          <div className="absolute inset-0 bg-amber-500 blur-2xl opacity-20 animate-ping" />
                          <div className="w-16 h-16 md:w-20 md:h-20 bg-amber-500/10 border border-amber-500/40 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(245,158,11,0.2)]">
                            <Lock className="w-7 h-7 md:w-8 md:h-8 text-amber-500" />
                          </div>
                        </div>
                        <div className="space-y-4">
                          <h3 className="text-xl md:text-3xl font-black uppercase tracking-tight text-white">Œuvre Premium</h3>
                          <p className="text-[10px] md:text-xs text-gray-400 uppercase tracking-widest leading-relaxed max-w-xs mx-auto">
                            Achetez le NFT d'accès pour soutenir l'artiste et en profiter sans limite. Le NFT est à vous : vous pouvez le revendre.
                          </p>
                        </div>
                        <button 
                          onClick={() => onBuy(work.id, work.price)}
                          disabled={work.soldOut}
                          className="disabled:opacity-40 disabled:hover:scale-100 px-6 md:px-8 py-3.5 md:py-4 bg-gradient-to-r from-amber-500 to-amber-700 text-black font-black uppercase tracking-widest text-[10px] rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-[0_20px_50px_rgba(245,158,11,0.3)] flex items-center gap-3"
                        >
                          <ShoppingCart className="w-4 h-4" /> {work.soldOut ? "Édition épuisée" : `Obtenir le NFT · ${work.priceLabel}`}
                        </button>
                        <div className="flex items-center gap-2 mt-4 opacity-40">
                          <ShieldCheck className="w-3 h-3 text-amber-500" />
                          <span className="text-[8px] font-black uppercase tracking-widest text-amber-500">Paiement Sécurisé Blockchain</span>
                        </div>
                      </div>
                    </div>
                  ) : work.isPremium && !premiumUrls[work.id] ? (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-6 p-10 text-center bg-black/60">
                      <ShieldCheck className="w-10 h-10 md:w-12 md:h-12 text-amber-500" />
                      <h3 className="text-lg md:text-2xl font-black uppercase tracking-tight text-white line-clamp-2">{work.title}</h3>
                      <p className="text-[10px] md:text-xs text-gray-400 uppercase tracking-widest max-w-xs">
                        Vous détenez l'accès. Signez une fois avec votre wallet (gratuit) pour ouvrir vos œuvres premium.
                      </p>
                      {openingId === work.id ? (
                        <div className="w-full max-w-xs space-y-3 text-left">
                          {([
                            ['sign', 'Signature dans votre wallet'],
                            ['verify', "Vérification du NFT sur la blockchain"],
                            ['ready', "Préparation de la lecture"],
                          ] as [MediaStep, string][]).map(([step, label], idx) => {
                            const order: MediaStep[] = ['sign', 'verify', 'ready'];
                            const current = order.indexOf(openingStep);
                            const state = idx < current ? 'done' : idx === current ? 'active' : 'todo';
                            return (
                              <div key={step} className="flex items-center gap-3">
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black ${state === 'done' ? 'bg-emerald-500 text-black' : state === 'active' ? 'border-2 border-amber-500 border-t-transparent animate-spin' : 'border border-white/20'}`}>
                                  {state === 'done' ? '✓' : ''}
                                </span>
                                <span className={`text-[11px] font-bold ${state === 'todo' ? 'text-gray-600' : 'text-gray-200'}`}>{label}</span>
                              </div>
                            );
                          })}
                          {openingStep === 'sign' && <p className="text-[10px] text-gray-500 pt-1">Ouvrez votre wallet pour valider la signature (gratuite).</p>}
                        </div>
                      ) : (
                        <button
                          onClick={() => openPremium(work.id)}
                          className="px-6 md:px-8 py-3.5 md:py-4 bg-gradient-to-r from-amber-500 to-amber-700 text-black font-black uppercase tracking-widest text-[10px] rounded-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
                        >
                          <Play className="w-4 h-4" /> {mediaError ? 'Réessayer' : "Ouvrir l'œuvre"}
                        </button>
                      )}
                      {mediaError && openingId === null && <p className="text-xs text-red-400 max-w-xs">{mediaError}</p>}
                    </div>
                  ) : (
                    <>
                      {getFormat(work.category).kind === 'game' ? (
                        <GameFrame
                          title={work.title}
                          color={getFormat(work.category).hex}
                          url={premiumUrls[work.id]}
                          loading={openingId === work.id}
                          error={openingId === null && gameErrors[work.id] ? gameErrors[work.id] : null}
                          onPlay={() => openFreeGame(work.id)}
                        />
                      ) : getFormat(work.category).kind === 'scroll' ? (
                        <div 
                          ref={(el) => {
                            if (el) {
                              const savedProgress = localStorage.getItem(`beam_read_progress_${address || 'guest'}_${work.id}`);
                              if (savedProgress && !el.dataset.scrolled) {
                                el.dataset.scrolled = 'true';
                                setTimeout(() => {
                                  const progress = parseFloat(savedProgress);
                                  el.scrollTop = progress * (el.scrollHeight - el.clientHeight);
                                }, 150);
                              }
                            }
                          }}
                          onScroll={(e) => {
                            const target = e.currentTarget;
                            const progress = target.scrollTop / (target.scrollHeight - target.clientHeight);
                            localStorage.setItem(`beam_read_progress_${address || 'guest'}_${work.id}`, progress.toString());
                            if (progress >= 0.1) countView(work.id);
                            onTrackProgress(work.id, progress * 100);
                          }}
                          className="w-full h-full overflow-y-auto no-scrollbar scroll-smooth relative"
                        >
                          <img src={mediaSrc(work)} className="w-full h-auto block bg-black" alt={work.title} />
                        </div>
                      ) : getFormat(work.category).kind === 'video' ? (
                        <video
                          ref={(el) => { videoRefs.current[i] = el; }}
                          src={mediaSrc(work)}
                          className="w-full h-full object-contain bg-black"
                          autoPlay={false}
                          controls
                          loop
                          playsInline
                          preload="auto"
                          onPlay={(e) => { handleMediaPlay(work.id); setMediaSession(e.currentTarget, { title: work.title, artist: `@${work.creator.slice(0, 6)}…${work.creator.slice(-4)}` }); }}
                          onTimeUpdate={(e) => handleTimeUpdate(work.id, e)}
                          onFullscreenChange={handleFullscreenChange}
                          {...({ onWebkitEndFullscreen: handleFullscreenChange } as any)}
                        />
                      ) : getFormat(work.category).kind === 'audio' ? (
                        <AudioPlayer
                          src={mediaSrc(work)}
                          title={work.title}
                          artist={`@${work.creator.slice(0, 6)}…${work.creator.slice(-4)} · ${getViewCount(work.id)} vues${work.chainName ? ` · ${work.chainName}` : ''}`}
                          color={getFormat(work.category).hex}
                          audioRef={(el) => { audioRefs.current[i] = el; }}
                          onPlay={() => handleMediaPlay(work.id)}
                          onTimeUpdate={(e) => handleTimeUpdate(work.id, e)}
                          reserveRight={actionsOpen}
                        />
                      ) : (
                        <img src={mediaSrc(work)} className="w-full h-full object-contain bg-black" alt={work.title} />
                      )}
                    </>
                  )}

                  {getFormat(work.category).kind !== 'audio' && (
                  <div className={`absolute left-0 right-0 p-4 pr-20 md:p-8 md:pr-8 from-black via-black/40 to-transparent pointer-events-none ${getFormat(work.category).kind === 'video' ? 'top-0 bg-gradient-to-b' : 'bottom-0 bg-gradient-to-t'}`}>
                    <div className="flex items-center gap-3 md:gap-4">
                      <div className="w-10 h-10 md:w-12 md:h-12 bg-white/5 rounded-xl flex items-center justify-center border border-white/10 shadow-inner group-hover:border-[#00f2ff]/40 transition-colors shrink-0">
                        <User className="w-5 h-5 md:w-6 md:h-6 text-gray-400 group-hover:text-[#00f2ff] transition-colors" />
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#00f2ff] drop-shadow-[0_0_10px_rgba(0,242,255,0.5)]">
                            @{work.creator.slice(0,6)}...{work.creator.slice(-4)}
                          </p>
                          {work.chainName && (
                            <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/10 border border-white/15 text-gray-200">{work.chainName}</span>
                          )}
                          <div className="flex items-center gap-1.5 text-gray-400">
                            <Eye className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-mono font-bold">{getViewCount(work.id)}</span>
                          </div>
                        </div>
                        <h3 className="text-base md:text-xl font-black uppercase tracking-tight text-white leading-tight line-clamp-2">{work.title}</h3>
                      </div>
                    </div>
                  </div>
                  )}
                </div>
              </div>

              <div className="absolute right-3 md:right-8 bottom-44 md:bottom-24 z-20 flex flex-col gap-3 md:gap-4 items-center">
                {actionsOpen && (<>
                <button 
                  onClick={() => onLike(work.id)}
                  className="flex flex-col items-center gap-2 group"
                >
                  <div className="p-3 md:p-4 bg-black/40 hover:bg-pink-500/20 rounded-2xl border border-white/10 transition-all group-active:scale-90 shadow-2xl backdrop-blur-xl group-hover:border-pink-500/40 relative">
                    <Heart className="w-5 h-5 md:w-6 md:h-6 text-white group-hover:text-pink-500 transition-colors group-hover:fill-pink-500" />
                    {work.likesCount > 0 && (
                      <span className="absolute -top-2 -right-2 bg-pink-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-[0_0_15px_rgba(236,72,153,0.5)]">
                        {Number(work.likesCount)}
                      </span>
                    )}
                  </div>
                  <span className="hidden md:block text-[9px] font-black uppercase tracking-widest text-gray-500 group-hover:text-pink-500 transition-colors">Beam Heart</span>
                </button>

                <button 
                  onClick={() => setCommentWorkId(work.id)}
                  className="flex flex-col items-center gap-2 group"
                >
                  <div className={`p-3 md:p-4 ${commentWorkId === work.id ? 'bg-[#00f2ff] text-black border-[#00f2ff]' : 'bg-black/40 text-white border-white/10 hover:bg-[#00f2ff]/20'} rounded-2xl border transition-all group-active:scale-90 shadow-2xl backdrop-blur-xl group-hover:border-[#00f2ff]/40`}>
                    <MessageCircle className="w-5 h-5 md:w-6 md:h-6 transition-colors group-hover:scale-110" />
                  </div>
                  <span className="hidden md:block text-[9px] font-black uppercase tracking-widest text-gray-500 group-hover:text-[#00f2ff] transition-colors">Beam Talk</span>
                </button>

                <button 
                  onClick={() => onTip(work.id)}
                  className="flex flex-col items-center gap-2 group"
                >
                  <div className="p-3 md:p-4 bg-gradient-to-tr from-[#bc13fe] to-[#00f2ff] rounded-2xl transition-all group-active:scale-90 shadow-[0_0_50px_rgba(0,242,255,0.4)] animate-pulse hover:shadow-[0_0_80px_rgba(0,242,255,0.6)]">
                    <Zap className="w-5 h-5 md:w-6 md:h-6 text-black fill-current" />
                  </div>
                  <span className="hidden md:block text-[9px] font-black uppercase tracking-widest text-[#00f2ff] animate-pulse">Beam Tip</span>
                </button>

                {onToggleSave && (
                  <button
                    onClick={() => onToggleSave(work.id)}
                    className="flex flex-col items-center gap-2 group"
                    aria-label={isSaved?.(work.id) ? 'Retirer de ma bibliothèque' : 'Ajouter à ma bibliothèque'}
                  >
                    <div className={`p-3 md:p-4 rounded-2xl border transition-all group-active:scale-90 shadow-2xl backdrop-blur-xl ${isSaved?.(work.id) ? 'bg-white text-black border-white' : 'bg-black/40 text-white border-white/10 hover:bg-white/10'}`}>
                      <Bookmark className={`w-5 h-5 md:w-6 md:h-6 ${isSaved?.(work.id) ? 'fill-current' : ''}`} />
                    </div>
                    <span className="hidden md:block text-[9px] font-black uppercase tracking-widest text-gray-500">{isSaved?.(work.id) ? 'Ajouté' : 'Biblio'}</span>
                  </button>
                )}

                <button className="flex flex-col items-center gap-2 group">
                  <div className="p-3 md:p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-all group-active:scale-90 shadow-2xl backdrop-blur-xl">
                    <Share2 className="w-5 h-5 md:w-6 md:h-6 text-white" />
                  </div>
                  <span className="hidden md:block text-[9px] font-black uppercase tracking-widest text-gray-600">Viralize</span>
                </button>
                </>)}

                <button
                  onClick={toggleActions}
                  aria-label={actionsOpen ? 'Masquer les actions' : 'Afficher les actions'}
                  aria-expanded={actionsOpen}
                  className="p-2 md:p-2.5 rounded-full bg-black/50 border border-white/10 text-gray-300 hover:text-white backdrop-blur-xl transition-all active:scale-90"
                >
                  {actionsOpen ? <ChevronDown className="w-4 h-4" /> : <MoreHorizontal className="w-4 h-4" />}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {commentWorkId !== null && (
        <CommentDrawer 
          workId={works.find((w: any) => w.id === commentWorkId)?.workId ?? (commentWorkId as number)}
          chainId={works.find((w: any) => w.id === commentWorkId)?.chainId}
          isOpen={commentWorkId !== null} 
          onClose={() => setCommentWorkId(null)} 
        />
      )}
    </div>
  );
}
