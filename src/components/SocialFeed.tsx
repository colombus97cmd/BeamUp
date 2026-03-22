'use client';
import { useState, useRef, useEffect } from 'react';
import { Heart, MessageCircle, Zap, Play, Pause, Music, Video, ImageIcon, Share2, User, Sparkles, Disc } from 'lucide-react';
import { formatEther } from 'viem';
import CommentDrawer from './CommentDrawer';

interface SocialFeedProps {
  works: any[];
  onTip: (index: number) => void;
  onLike: (index: number) => void;
  onComment: (index: number) => void;
}

export default function SocialFeed({ works, onTip, onLike, onComment }: SocialFeedProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [commentWorkId, setCommentWorkId] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const IPFS_GATEWAYS = ['https://ipfs.io/ipfs/', 'https://cloudflare-ipfs.com/ipfs/', 'https://gateway.pinata.cloud/ipfs/'];
  const getMediaUrl = (ipfsCid: string) => `${IPFS_GATEWAYS[0]}${ipfsCid}`;

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

  const getThemeColor = (cat: string) => {
    if (cat === 'Musique') return 'rgba(188, 19, 254, 0.4)';
    if (cat === 'Vidéo') return 'rgba(0, 242, 255, 0.4)';
    return 'rgba(255, 215, 0, 0.4)';
  };

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
        {/* Main Nebula */}
        <div 
          className="absolute inset-0 animate-nebula transition-all duration-1000"
          style={{ 
            background: `radial-gradient(circle at 50% 50%, ${getThemeColor(works[activeIndex]?.category)}, transparent 70%)`,
            filter: 'blur(100px)'
          }} 
        />
        
        {/* Floating Particles (Simulated Audio Reaction) */}
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

        {/* Scanlines Effect */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] z-10 bg-[length:100%_2px,3px_100%] pointer-events-none" />
      </div>

      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="h-[calc(100vh-64px)] w-full overflow-y-scroll snap-y snap-mandatory scroll-smooth no-scrollbar relative z-10"
      >
        {works.map((work, i) => (
          <div key={i} className="h-full w-full snap-start relative flex items-center justify-center overflow-hidden">
            
            {/* Main Content Area */}
            <div className="relative z-10 w-full h-full flex flex-col items-center justify-center p-4 md:p-8">
              <div className="w-full max-w-4xl h-[75vh] md:h-[80vh] rounded-[48px] overflow-hidden relative shadow-[0_0_150px_rgba(0,0,0,1)] border border-white/10 group bg-black/40 backdrop-blur-sm">
                
                {work.category === 'Vidéo' ? (
                  <video 
                    src={getMediaUrl(work.ipfsCID)} 
                    className="w-full h-full object-contain bg-black" 
                    autoPlay={i === activeIndex && !commentWorkId}
                    controls
                    loop 
                    playsInline
                  />
                ) : work.category === 'Musique' ? (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-12 bg-gradient-to-b from-transparent via-black/80 to-transparent">
                    <div className="relative w-64 h-64 group-hover:scale-105 transition-all duration-1000">
                      <div 
                        className="absolute inset-0 rounded-[56px] animate-spin-slow opacity-30 blur-3xl"
                        style={{ backgroundColor: getThemeColor(work.category) }}
                      />
                      <div className="w-full h-full bg-white/5 rounded-[56px] flex items-center justify-center border border-white/10 shadow-2xl relative z-10 backdrop-blur-2xl">
                        <Disc className="w-24 h-24 text-white/20 absolute animate-spin-slow" />
                        <Music className="w-16 h-16 text-[#bc13fe] animate-bounce" />
                      </div>
                      
                      {/* Musical Pulse Rings */}
                      {[...Array(3)].map((_, j) => (
                        <div 
                          key={j}
                          className="absolute inset-0 border border-[#bc13fe]/20 rounded-[56px] animate-ping"
                          style={{ animationDelay: `${j * 0.5}s`, animationDuration: '3s' }}
                        />
                      ))}
                    </div>
                    <div className="text-center space-y-6">
                      <h3 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-white animate-in zoom-in duration-700 drop-shadow-[0_0_20px_rgba(188,19,254,0.5)]">{work.title}</h3>
                      <audio src={getMediaUrl(work.ipfsCID)} controls className="w-full max-w-md opacity-40 hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                ) : (
                  <img src={getMediaUrl(work.ipfsCID)} className="w-full h-full object-contain bg-black" alt={work.title} />
                )}
                
                {/* Info Overlay (Bottom Left) */}
                <div className="absolute bottom-0 left-0 right-0 p-10 md:p-14 bg-gradient-to-t from-black via-black/40 to-transparent pointer-events-none">
                  <div className="flex items-center gap-5 mb-6">
                    <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 shadow-inner group-hover:border-[#00f2ff]/40 transition-colors">
                      <User className="w-7 h-7 text-gray-400 group-hover:text-[#00f2ff] transition-colors" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#00f2ff] mb-2 drop-shadow-[0_0_10px_rgba(0,242,255,0.5)]">
                        @{work.creator.slice(0,6)}...{work.creator.slice(-4)}
                      </p>
                      <h3 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-white leading-none group-hover:scale-105 transition-transform origin-left">{work.title}</h3>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Social Interactions (Right Sidebar) */}
            <div className="absolute right-4 md:right-10 bottom-24 z-20 flex flex-col gap-6 md:gap-8 items-center">
              <button 
                  onClick={() => onLike(i)}
                  className="flex flex-col items-center gap-2 group"
              >
                <div className="p-4 md:p-5 bg-black/40 hover:bg-pink-500/20 rounded-[28px] border border-white/10 transition-all group-active:scale-90 shadow-2xl backdrop-blur-xl group-hover:border-pink-500/40">
                  <Heart className="w-6 h-6 md:w-8 md:h-8 text-white group-hover:text-pink-500 transition-colors group-hover:fill-pink-500" />
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 group-hover:text-pink-500 transition-colors">Beam Heart</span>
              </button>

              <button 
                  onClick={() => setCommentWorkId(i)}
                  className="flex flex-col items-center gap-2 group"
              >
                <div className={`p-4 md:p-5 ${commentWorkId === i ? 'bg-[#00f2ff] text-black border-[#00f2ff]' : 'bg-black/40 text-white border-white/10 hover:bg-[#00f2ff]/20'} rounded-[28px] border transition-all group-active:scale-90 shadow-2xl backdrop-blur-xl group-hover:border-[#00f2ff]/40`}>
                  <MessageCircle className="w-6 h-6 md:w-8 md:h-8 transition-colors group-hover:scale-110" />
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 group-hover:text-[#00f2ff] transition-colors">Beam Talk</span>
              </button>

              <button 
                  onClick={() => onTip(i)}
                  className="flex flex-col items-center gap-2 group"
              >
                <div className="p-4 md:p-5 bg-gradient-to-tr from-[#bc13fe] to-[#00f2ff] rounded-[28px] transition-all group-active:scale-90 shadow-[0_0_50px_rgba(0,242,255,0.4)] animate-pulse hover:shadow-[0_0_80px_rgba(0,242,255,0.6)]">
                  <Zap className="w-6 h-6 md:w-8 md:h-8 text-black fill-current" />
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest text-[#00f2ff] animate-pulse">Beam BNB</span>
              </button>

              <button className="flex flex-col items-center gap-2 group mt-4">
                <div className="p-4 md:p-5 bg-white/5 hover:bg-white/10 rounded-[28px] border border-white/10 transition-all group-active:scale-90 shadow-2xl backdrop-blur-xl">
                  <Share2 className="w-6 h-6 md:w-8 md:h-8 text-white" />
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest text-gray-600">Viralize</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Comment Drawer Overlay */}
      {commentWorkId !== null && (
        <CommentDrawer 
          workId={commentWorkId} 
          isOpen={commentWorkId !== null} 
          onClose={() => setCommentWorkId(null)} 
        />
      )}
    </div>
  );
}
