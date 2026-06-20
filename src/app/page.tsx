'use client';
import { useState } from 'react';
import { useReadContract, useWriteContract, useAccount, useChainId } from 'wagmi';
import { formatEther, parseEther } from 'viem';
import { LayoutGrid, Rocket, Disc, Loader2, Zap, Play, Sparkles, Smartphone, Eye } from 'lucide-react';
import Navigation from '../components/Navigation';
import SocialFeed from '../components/SocialFeed';
import BeamUpABI from '../contracts/BeamUp.json';
import LandingPage from '../components/LandingPage';
import CrowdfundingCampaign from '../components/CrowdfundingCampaign';

// Multi-chain contract addresses
const CONTRACT_ADDRESSES: Record<number, `0x${string}`> = {
  56: '0x92c1D8eCE7962634cF337d763994Af1490605dA4',   // BSC Mainnet
  20: '0x92c1D8eCE7962634cF337d763994Af1490605dA4',   // Elastos ESC
  137: '0x6a2BC463fd7e1b6E6769023F8CD41835e347C317',  // Polygon Mainnet
  42161: '0x92c1D8eCE7962634cF337d763994Af1490605dA4',// Arbitrum One
};
const DEFAULT_CHAIN = 56;

export default function Home() {
  const [viewMode, setViewMode] = useState<'grid' | 'feed' | 'crowdfunding'>('feed');
  const [analytics, setAnalytics] = useState<Record<number, { views: number; completed: number; inProgress: number }>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('beam_analytics_v1');
      return saved ? JSON.parse(saved) : {};
    }
    return {};
  });

  const trackView = (id: number) => {
    setAnalytics(prev => {
      const current = prev[id] || { views: 0, completed: 0, inProgress: 0 };
      const updated = {
        ...prev,
        [id]: {
          ...current,
          views: current.views + 1
        }
      };
      localStorage.setItem('beam_analytics_v1', JSON.stringify(updated));
      return updated;
    });
  };

  const trackProgress = (id: number, progress: number) => {
    setAnalytics(prev => {
      const current = prev[id] || { views: 0, completed: 0, inProgress: 0 };
      
      let completedIncrement = 0;
      let inProgressIncrement = 0;

      const sessionKeyInProgress = `beam_tracked_ip_${id}`;
      const sessionKeyCompleted = `beam_tracked_cp_${id}`;

      if (progress >= 10 && progress < 90) {
        if (typeof window !== 'undefined' && !sessionStorage.getItem(sessionKeyInProgress) && !sessionStorage.getItem(sessionKeyCompleted)) {
          sessionStorage.setItem(sessionKeyInProgress, 'true');
          inProgressIncrement = 1;
        }
      } else if (progress >= 90) {
        if (typeof window !== 'undefined' && !sessionStorage.getItem(sessionKeyCompleted)) {
          sessionStorage.setItem(sessionKeyCompleted, 'true');
          completedIncrement = 1;
          if (sessionStorage.getItem(sessionKeyInProgress)) {
            inProgressIncrement = -1;
          }
        }
      }

      if (completedIncrement === 0 && inProgressIncrement === 0) return prev;

      const updated = {
        ...prev,
        [id]: {
          ...current,
          completed: Math.max(0, current.completed + completedIncrement),
          inProgress: Math.max(0, current.inProgress + inProgressIncrement)
        }
      };
      localStorage.setItem('beam_analytics_v1', JSON.stringify(updated));
      return updated;
    });
  };

  const getViewCount = (id: number) => {
    const baseViews = (id * 147 + 1023) % 450 + 45;
    const stats = analytics[id];
    return (stats?.views || 0) + baseViews;
  };

  const { isConnected, address } = useAccount();
  const { writeContract } = useWriteContract();
  const chainId = useChainId();
  const CONTRACT_ADDRESS = CONTRACT_ADDRESSES[chainId] || CONTRACT_ADDRESSES[DEFAULT_CHAIN];

  const safeAddress = address || '0x0000000000000000000000000000000000000000';

  const { data: blockchainWorks, isLoading: isGalleryLoading } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: BeamUpABI,
    functionName: 'getAllWorks',
  });

  const { data: premiumInfo } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: BeamUpABI,
    functionName: 'getPremiumBatch',
    args: [blockchainWorks ? (blockchainWorks as any[]).map((_, i) => BigInt(i)) : [], safeAddress],
  });

  const handleTip = (id: number) => {
    writeContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: BeamUpABI,
      functionName: 'tipArtist',
      args: [BigInt(id)],
      value: parseEther('0.001'),
    });
  };

  const handleBuy = (id: number, price: bigint) => {
    writeContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: BeamUpABI,
      functionName: 'buyWork',
      args: [BigInt(id)],
      value: price,
    });
  };

  const handleLike = (id: number) => {
    writeContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: BeamUpABI,
      functionName: 'toggleLike',
      args: [BigInt(id)],
    });
  };

  const handleComment = (id: number) => {
    // This is handled via CommentDrawer now
    console.log("Comment work ID:", id);
  };

  const BeamEnergyBall = () => (
    <div className="relative w-20 h-40 flex items-center justify-center scale-75">
      <div className="absolute bottom-0 w-[1px] bg-[#00f2ff] h-full opacity-20 animate-pulse" />
      <div className="absolute bottom-0 w-8 h-8 bg-[#00f2ff] rounded-full blur-[10px] animate-beam-up opacity-80" />
      <div className="absolute bottom-0 w-4 h-4 bg-white rounded-full blur-[2px] animate-beam-up shadow-[0_0_15px_#00f2ff]" />
    </div>
  );

  const processedWorks = ((blockchainWorks as any[]) || []).map((work, i) => {
    const pInfo = premiumInfo as any;
    return {
      ...work,
      id: i,
      isPremium: pInfo?.[0]?.[i] ?? false,
      price: pInfo?.[1]?.[i] ?? BigInt(0),
      hasPaid: pInfo?.[2]?.[i] ?? false,
    };
  }).reverse();

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

      {!isConnected ? (
        <LandingPage />
      ) : (
        <>
          {/* View Mode Toggle */}
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex bg-black/60 backdrop-blur-2xl border border-white/10 p-1.5 rounded-full shadow-2xl scale-90 md:scale-100 gap-1">
        <button 
          onClick={() => setViewMode('grid')}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${viewMode === 'grid' ? 'bg-white text-black font-black' : 'text-gray-500 hover:text-white'}`}
        >
          <LayoutGrid className="w-3.5 h-3.5" /> Grille
        </button>
        <button 
          onClick={() => setViewMode('feed')}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${viewMode === 'feed' ? 'bg-gradient-to-r from-[#00f2ff] to-[#bc13fe] text-black font-black' : 'text-gray-500 hover:text-white'}`}
        >
          <Smartphone className="w-3.5 h-3.5" /> Flux Beam
        </button>
        <button 
          onClick={() => setViewMode('crowdfunding')}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${viewMode === 'crowdfunding' ? 'bg-gradient-to-r from-amber-500 to-amber-700 text-black font-black' : 'text-gray-500 hover:text-white'}`}
        >
          <Rocket className="w-3.5 h-3.5" /> Campagne
        </button>
      </div>

      <main className={viewMode === 'grid' ? 'max-w-[1600px] mx-auto px-4 md:px-10 py-8' : viewMode === 'crowdfunding' ? 'h-[calc(100vh-64px)] overflow-y-auto' : 'h-[calc(100vh-64px)] overflow-hidden'}>
        {viewMode === 'crowdfunding' ? (
          <CrowdfundingCampaign />
        ) : isGalleryLoading ? (
          <div className='flex flex-col items-center justify-center h-full min-h-[60vh]'>
            <BeamEnergyBall />
            <p className='text-[10px] uppercase tracking-[0.4em] mt-8 text-gray-600'>Scan Orbital...</p>
          </div>     
        ) : processedWorks.length === 0 ? (
          <div className='flex flex-col items-center justify-center h-full min-h-[60vh] opacity-20'>
            <Disc className='w-16 h-16 md:w-20 md:h-20 mx-auto mb-6 animate-spin-slow' />
            <p className='text-xs uppercase tracking-[0.4em]'>Silence Intergalactique</p>
          </div>
        ) : viewMode === 'feed' ? (
          <SocialFeed 
            works={processedWorks} 
            onTip={handleTip} 
            onLike={handleLike}  
            onComment={handleComment} 
            onBuy={handleBuy}
            getViewCount={getViewCount}
            onView={trackView}
            onTrackProgress={trackProgress}
          />
        ) : (
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-10'>   
            {processedWorks.map((work, i) => (
              <div key={i} className='group cursor-pointer bg-white/5 border border-white/10 p-4 rounded-3xl hover:border-[#00f2ff]/40 transition-all'>
                {/* ... existing grid item simplified for brevity ... */}
                <h4 className='text-lg font-black uppercase truncate'>{work.title}</h4>
                <div className='flex items-center justify-between mt-2'>
                  <p className='text-[8px] text-gray-600 uppercase font-mono'>{work.creator.slice(0,6)}...{work.creator.slice(-4)}</p>
                  <div className='flex items-center gap-1 text-gray-500'>
                    <Eye className='w-3 h-3' />
                    <span className='text-[8px] font-mono font-bold'>{getViewCount(work.id)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
        </>
      )}
    </div>
  );
}
