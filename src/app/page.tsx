'use client';
import { useState } from 'react';
import { useReadContract, useWriteContract } from 'wagmi';
import { formatEther, parseEther } from 'viem';
import { Rocket, Disc, LayoutGrid, Music, Video, ImageIcon, FileText, Play, X, Heart, Zap, Loader2, Sparkles } from 'lucide-react';
import Navigation from '../components/Navigation';
import BeamUpABI from '../contracts/BeamUp.json';

const CONTRACT_ADDRESS = '0x66e45A936564B364e92bD6436Fc2D4B1934aCbCf';
const IPFS_GATEWAYS = [
  'https://gateway.pinata.cloud/ipfs/',
  'https://ipfs.io/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/'
];

export default function Home() {
  const [activeWork, setActiveWork] = useState<any | null>(null);
  const [activeWorkIndex, setActiveWorkIndex] = useState<number | null>(null);
  const [gatewayIndex, setGatewayIndex] = useState(0);

  const { writeContract } = useWriteContract();

  const { data: blockchainWorks, isLoading: isGalleryLoading } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: BeamUpABI,
    functionName: 'getAllWorks',
  });

  const handleTip = (index: number) => {
    writeContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: BeamUpABI,
      functionName: 'tipArtist',
      args: [BigInt(index)],
      value: parseEther('0.001'),
    });
  };

  const getMediaUrl = (ipfsCid: string) => `${IPFS_GATEWAYS[gatewayIndex]}${ipfsCid}`;

  const getCategoryStyle = (cat: string) => {
    if (cat === 'Musique') return 'border-[#bc13fe]/40 text-[#bc13fe] bg-[#bc13fe]/10 shadow-[0_0_10px_rgba(188,19,254,0.3)]';
    if (cat === 'Vidéo') return 'border-[#00f2ff]/40 text-[#00f2ff] bg-[#00f2ff]/10 shadow-[0_0_10px_rgba(0,242,255,0.3)]';
    return 'border-[#FFD700]/40 text-[#FFD700] bg-[#FFD700]/10 shadow-[0_0_10px_rgba(255,215,0,0.3)]';
  };

  const BeamEnergyBall = () => (
    <div className="relative w-20 h-40 flex items-center justify-center scale-75">
      <div className="absolute bottom-0 w-[1px] bg-[#00f2ff] h-full opacity-20 animate-pulse" />
      <div className="absolute bottom-0 w-8 h-8 bg-[#00f2ff] rounded-full blur-[10px] animate-beam-up opacity-80" />
      <div className="absolute bottom-0 w-4 h-4 bg-white rounded-full blur-[2px] animate-beam-up shadow-[0_0_15px_#00f2ff]" />
    </div>
  );

  return (
    <div className='min-h-screen bg-[#020202] text-white selection:bg-[#00f2ff] selection:text-black'>
      <style jsx global>{`
        @keyframes beam-up {
          0% { transform: translateY(0) scale(0.8); opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { transform: translateY(-150px) scale(1.2); opacity: 0; }
        }
        @keyframes heartbeat {
          0% { transform: scale(1); }
          14% { transform: scale(1.1); }
          28% { transform: scale(1); }
          42% { transform: scale(1.1); }
          70% { transform: scale(1); }
        }
        .animate-beam-up { animation: beam-up 2s infinite cubic-bezier(0.4, 0, 0.2, 1); }
        .animate-heartbeat { animation: heartbeat 1.5s infinite ease-in-out; }
      `}</style>

      <Navigation />

      <main className='max-w-[1600px] mx-auto px-4 md:px-10 py-8 relative'>
        <div className='flex justify-between items-end border-b border-white/5 pb-4 mb-8 md:mb-12'>
          <div className='flex items-center gap-3'>
            <h3 className='text-[10px] md:text-sm uppercase tracking-[0.3em] font-black text-gray-500 flex items-center gap-3'><LayoutGrid className='w-4 h-4 md:w-5 md:h-5' /> Flux Décentralisé</h3>
            <span className='px-2 py-0.5 bg-white/5 border border-white/10 rounded-md text-[7px] font-black text-[#00f2ff] animate-pulse'>WEB3 LIVE</span>
          </div>
        </div>

        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-10'>
          {isGalleryLoading ? (
            <div className='col-span-full py-40 flex flex-col items-center justify-center'><BeamEnergyBall /><p className='text-[10px] uppercase tracking-[0.4em] mt-8 text-gray-600'>Scan Orbital...</p></div>
          ) : ((blockchainWorks as any[]) || []).length === 0 ? (
            <div className='col-span-full py-40 text-center opacity-20'><Disc className='w-16 h-16 md:w-20 md:h-20 mx-auto mb-6 animate-spin-slow' /><p className='text-xs uppercase tracking-[0.4em]'>Silence Intergalactique</p></div>
          ) : (
            ((blockchainWorks as any[]) || []).map((work, i) => (
              <div key={i} onClick={() => { setActiveWork(work); setActiveWorkIndex(i); }} className='group cursor-pointer'>
                <div className='aspect-video bg-[#0a0a0a] rounded-2xl md:rounded-[32px] border border-white/5 relative overflow-hidden mb-4 md:mb-6 group-hover:border-[#00f2ff]/40 transition-all'>
                   <div className='absolute inset-0 flex items-center justify-center opacity-10 group-hover:scale-110 transition-transform'>
                      {work.category === 'Musique' ? <Music className='w-16 h-16 md:w-24 md:h-24' /> : work.category === 'Vidéo' ? <Video className='w-16 h-16 md:w-24 md:h-24' /> : <ImageIcon className='w-16 h-16 md:w-24 md:h-24' />}
                   </div>
                   <div className='absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center backdrop-blur-sm'>
                      <div className='w-12 h-12 md:w-14 md:h-14 bg-white rounded-full flex items-center justify-center shadow-2xl'><Play className='w-5 h-5 md:w-6 md:h-6 text-black fill-black ml-1' /></div>
                   </div>
                   <div className='absolute top-4 left-4 md:top-6 md:left-6'>
                      <span className={`px-3 py-1 md:px-4 md:py-1.5 backdrop-blur-xl rounded-full text-[7px] md:text-[9px] font-black uppercase border ${getCategoryStyle(work.category)}`}>
                        {work.category}
                      </span>
                   </div>
                </div>
                <div className='flex justify-between items-start px-1'>
                  <div>
                    <h4 className='text-lg md:text-xl font-black group-hover:text-[#00f2ff] transition-colors tracking-tight uppercase truncate max-w-[180px]'>{work.title}</h4>
                    <p className='text-[8px] text-gray-600 mt-1 font-mono uppercase tracking-widest'>Artiste: {work.creator.slice(0,6)}...{work.creator.slice(-4)}</p>
                  </div>
                  <div className='flex items-center gap-1.5 text-pink-500 bg-pink-500/10 px-2 py-1 md:px-3 md:py-1.5 rounded-full border border-pink-500/20 shadow-[0_0_15px_rgba(236,72,153,0.1)]'>
                    <Heart className='w-3 h-3 fill-current' />
                    <span className='text-[8px] md:text-[10px] font-black'>{formatEther(work.totalTips).slice(0,6)}</span>
                  </div>
                </div>
              </div>
            )).reverse()
          )}
        </div>
      </main>

      {/* Lecteur Immersif */}
      {activeWork && (
        <div className='fixed inset-0 z-[200] flex items-center justify-center p-2 md:p-8'>
          <div className='absolute inset-0 bg-black/95 backdrop-blur-2xl' onClick={() => { setActiveWork(null); setActiveWorkIndex(null); }} />
          <div className='cyber-glass w-full max-w-6xl h-fit max-h-[95vh] rounded-3xl md:rounded-[48px] relative overflow-hidden flex flex-col border border-white/10 shadow-[0_0_100px_rgba(0,0,0,1)]'>
            <button onClick={() => { setActiveWork(null); setActiveWorkIndex(null); }} className='absolute top-4 right-4 md:top-8 md:right-8 p-2 md:p-3 bg-white/10 hover:bg-white/20 rounded-full transition-all z-10'><X className='w-5 h-5' /></button>
            
            <div className='w-full h-full p-6 md:p-12 flex flex-col items-center justify-center overflow-auto'>
              {activeWork.category === 'Vidéo' ? (
                <video src={getMediaUrl(activeWork.ipfsCID)} controls className='w-full max-h-[60vh] md:max-h-full rounded-2xl shadow-2xl' autoPlay />
              ) : activeWork.category === 'Musique' ? (
                <div className='flex flex-col items-center gap-6 md:gap-10 w-full'>
                   <div className='w-32 h-32 md:w-48 md:h-48 bg-gradient-to-tr from-[#bc13fe] to-[#00f2ff] rounded-[40px] flex items-center justify-center shadow-[0_0_60px_rgba(188,19,254,0.4)] animate-spin-slow'><Music className='w-16 h-16 md:w-24 md:h-24 text-black' /></div>
                   <div className='text-center space-y-2'>
                      <h3 className='text-2xl md:text-4xl font-black uppercase tracking-tighter'>{activeWork.title}</h3>
                      <p className='text-[10px] text-gray-500 uppercase tracking-widest font-mono'>{activeWork.creator}</p>
                   </div>
                   <audio src={getMediaUrl(activeWork.ipfsCID)} controls className='w-full max-w-md' autoPlay />
                </div>
              ) : (
                <div className='w-full h-full flex items-center justify-center'><img src={getMediaUrl(activeWork.ipfsCID)} className='max-w-full max-h-[70vh] object-contain rounded-2xl shadow-2xl' alt={activeWork.title} /></div>
              )}
            </div>
            
            <div className='p-6 md:p-8 border-t border-white/5 md:absolute md:bottom-0 md:left-0 md:right-0 flex flex-col md:flex-row items-center justify-between gap-6 bg-black/60 backdrop-blur-xl'>
               <div className='flex items-center gap-4'>
                  <div className='p-2 bg-white/5 rounded-lg'><Zap className='w-4 h-4 text-[#00f2ff]' /></div>
                  <div className='text-left'>
                    <p className='text-[8px] md:text-[10px] uppercase font-black text-gray-400 tracking-widest'>Protocole de Streaming Décentralisé</p>
                    <p className='text-[7px] font-mono text-gray-600 truncate max-w-[200px]'>CID: {activeWork.ipfsCID}</p>
                  </div>
               </div>
               
               <button 
                  onClick={() => activeWorkIndex !== null && handleTip(activeWorkIndex)}
                  className='w-full md:w-auto bg-gradient-to-r from-pink-500 to-[#bc13fe] text-white px-10 py-5 rounded-2xl md:rounded-full flex items-center justify-center gap-4 transition-all hover:scale-105 active:scale-95 animate-heartbeat shadow-[0_0_30px_rgba(236,72,153,0.3)]'
               >
                  <Heart className='w-6 h-6 fill-current' />
                  <span className='font-black uppercase tracking-[0.2em] text-xs'>Soutenir (0.001 BNB)</span>
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
