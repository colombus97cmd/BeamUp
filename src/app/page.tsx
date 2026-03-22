'use client';
import { useState } from 'react';
import { useReadContract, useWriteContract, useAccount } from 'wagmi';
import { formatEther, parseEther } from 'viem';
import { LayoutGrid, Rocket, Disc, Loader2, Zap, Play, Sparkles, Smartphone } from 'lucide-react';
import Navigation from '../components/Navigation';
import SocialFeed from '../components/SocialFeed';
import BeamUpABI from '../contracts/BeamUp.json';

const CONTRACT_ADDRESS = '0x0CD69B6D6c439977A0265dcA7f5B347E1b705117';

export default function Home() {
  const [viewMode, setViewMode] = useState<'grid' | 'feed'>('feed');
  const { isConnected } = useAccount();
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

  const handleLike = (index: number) => {
    console.log("Like work:", index);
    // TODO: Connect to toggleLike when contract V2 is deployed
  };

  const handleComment = (index: number) => {
    console.log("Comment work:", index);
    // TODO: Add comment modal/interaction
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
        .animate-beam-up { animation: beam-up 2s infinite cubic-bezier(0.4, 0, 0.2, 1); }
        .animate-spin-slow { animation: spin 8s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <Navigation />

      {/* View Mode Toggle */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex bg-black/60 backdrop-blur-2xl border border-white/10 p-1.5 rounded-full shadow-2xl scale-90 md:scale-100">
        <button 
          onClick={() => setViewMode('grid')}
          className={`flex items-center gap-2 px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'grid' ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}
        >
          <LayoutGrid className="w-4 h-4" /> Grille
        </button>
        <button 
          onClick={() => setViewMode('feed')}
          className={`flex items-center gap-2 px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'feed' ? 'bg-gradient-to-r from-[#00f2ff] to-[#bc13fe] text-black font-black' : 'text-gray-500 hover:text-white'}`}
        >
          <Smartphone className="w-4 h-4" /> Flux Beam
        </button>
      </div>

      <main className={viewMode === 'grid' ? 'max-w-[1600px] mx-auto px-4 md:px-10 py-8' : 'h-[calc(100vh-64px)] overflow-hidden'}>
        {isGalleryLoading ? (
          <div className='flex flex-col items-center justify-center h-full min-h-[60vh]'>
            <BeamEnergyBall />
            <p className='text-[10px] uppercase tracking-[0.4em] mt-8 text-gray-600'>Scan Orbital...</p>
          </div>     
        ) : ((blockchainWorks as any[]) || []).length === 0 ? (
          <div className='flex flex-col items-center justify-center h-full min-h-[60vh] opacity-20'>
            <Disc className='w-16 h-16 md:w-20 md:h-20 mx-auto mb-6 animate-spin-slow' />
            <p className='text-xs uppercase tracking-[0.4em]'>Silence Intergalactique</p>
          </div>
        ) : viewMode === 'feed' ? (
          <SocialFeed 
            works={[...blockchainWorks].reverse()} 
            onTip={handleTip} 
            onLike={handleLike} 
            onComment={handleComment} 
          />
        ) : (
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-10'>   
            {((blockchainWorks as any[]) || []).map((work, i) => (
              <div key={i} className='group cursor-pointer bg-white/5 border border-white/10 p-4 rounded-3xl hover:border-[#00f2ff]/40 transition-all'>
                {/* ... existing grid item simplified for brevity ... */}
                <h4 className='text-lg font-black uppercase truncate'>{work.title}</h4>
                <p className='text-[8px] text-gray-600 uppercase font-mono'>{work.creator.slice(0,6)}...{work.creator.slice(-4)}</p>
              </div>
            )).reverse()}
          </div>
        )}
      </main>
    </div>
  );
}
