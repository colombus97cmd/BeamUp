'use client';
import { useState, useEffect } from 'react';
import { useWriteContract, useAccount, useConfig } from 'wagmi';
import { useActiveChainId } from '../hooks/useActiveChainId';
import { readContract, waitForTransactionReceipt } from 'wagmi/actions';
import { parseEther, erc20Abi } from 'viem';
import { LayoutGrid, Rocket, Disc, Loader2, Zap, Play, Sparkles, Smartphone, Eye, Library } from 'lucide-react';
import Navigation from '../components/Navigation';
import SocialFeed from '../components/SocialFeed';
import BeamUpABI from '../contracts/BeamUpV3.json';
import { getPaymentInfo } from '../config/contracts';
import { useWorks } from '../hooks/useWorks';
import { useLibrary } from '../hooks/useLibrary';
import LandingPage from '../components/LandingPage';
import CrowdfundingCampaign from '../components/CrowdfundingCampaign';


export default function Home() {
  const [viewMode, setViewMode] = useState<'grid' | 'feed' | 'library' | 'crowdfunding'>('feed');
  const [analytics, setAnalytics] = useState<Record<number, { views: number; completed: number; inProgress: number }>>({});
  const viewsChainId = useActiveChainId();

  useEffect(() => {
    fetch(`/api/views?chainId=${viewsChainId}`)
      .then(res => res.json())
      .then(data => {
        setAnalytics(data);
      })
      .catch(err => console.error("Error fetching views:", err));
  }, [viewsChainId]);

  const trackView = async (id: number) => {
    try {
      const res = await fetch('/api/views', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chainId: viewsChainId, workId: id, type: 'view' }),
      });
      const data = await res.json();
      if (data.success) {
        setAnalytics(prev => ({
          ...prev,
          [id]: data.stats
        }));
      }
    } catch (err) {
      console.error("Error tracking view:", err);
    }
  };

  const trackProgress = async (id: number, progress: number) => {
    let type: 'completed' | 'inProgress' | null = null;
    const sessionKeyInProgress = `beam_tracked_ip_${id}`;
    const sessionKeyCompleted = `beam_tracked_cp_${id}`;

    if (progress >= 10 && progress < 90) {
      if (typeof window !== 'undefined' && !sessionStorage.getItem(sessionKeyInProgress) && !sessionStorage.getItem(sessionKeyCompleted)) {
        sessionStorage.setItem(sessionKeyInProgress, 'true');
        type = 'inProgress';
      }
    } else if (progress >= 90) {
      if (typeof window !== 'undefined' && !sessionStorage.getItem(sessionKeyCompleted)) {
        sessionStorage.setItem(sessionKeyCompleted, 'true');
        type = 'completed';
      }
    }

    if (!type) return;

    try {
      const res = await fetch('/api/views', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chainId: viewsChainId, workId: id, type }),
      });
      const data = await res.json();
      if (data.success) {
        setAnalytics(prev => ({
          ...prev,
          [id]: data.stats
        }));
      }
    } catch (err) {
      console.error("Error tracking progress:", err);
    }
  };

  const getViewCount = (id: number) => {
    const stats = analytics[id];
    return stats?.views || 0;
  };

  const { isConnected, address } = useAccount();
  const { writeContract, writeContractAsync } = useWriteContract();
  const config = useConfig();
  const { works, isLoading: isGalleryLoading, refetch, contractAddress: CONTRACT_ADDRESS, chainId } = useWorks(address);

  const handleTip = (id: number) => {
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: BeamUpABI,
      functionName: 'tipArtist',
      args: [BigInt(id)],
      value: parseEther('0.001'),
    });
  };

  // Achat de l'accès (NFT) : en monnaie native, ou en WBTC/BTCB après autorisation du jeton.
  const handleBuy = async (id: number) => {
    const work = works.find((w) => w.id === id);
    if (!work || !address) return;
    try {
      const pay = getPaymentInfo(chainId, work.paymentToken);
      if (pay.isNative) {
        const hash = await writeContractAsync({ address: CONTRACT_ADDRESS, abi: BeamUpABI, functionName: 'buyAccess', args: [BigInt(id)], value: work.price });
        await waitForTransactionReceipt(config, { hash });
      } else {
        const allowance = await readContract(config, { chainId, address: work.paymentToken, abi: erc20Abi, functionName: 'allowance', args: [address, CONTRACT_ADDRESS] });
        if (allowance < work.price) {
          const approveHash = await writeContractAsync({ address: work.paymentToken, abi: erc20Abi, functionName: 'approve', args: [CONTRACT_ADDRESS, work.price] });
          await waitForTransactionReceipt(config, { hash: approveHash });
        }
        const hash = await writeContractAsync({ address: CONTRACT_ADDRESS, abi: BeamUpABI, functionName: 'buyAccess', args: [BigInt(id)] });
        await waitForTransactionReceipt(config, { hash });
      }
      refetch();
    } catch (error) {
      console.error('Achat annulé ou échoué :', error);
    }
  };

  const handleLike = (id: number) => {
    writeContract({
      address: CONTRACT_ADDRESS,
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

  const processedWorks = [...works].reverse();

  // Bibliothèque : œuvres achetées (NFT d'accès), ses propres œuvres, et celles ajoutées avec le signet.
  const library = useLibrary(chainId, address);
  const libraryWorks = processedWorks.filter(
    (w) => (w.isPremium && w.hasPaid) || w.creator.toLowerCase() === address?.toLowerCase() || library.isSaved(w.id)
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

      {!isConnected ? (
        <LandingPage />
      ) : (
        <>
          {/* View Mode Toggle */}
          <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[100] flex bg-black/70 backdrop-blur-2xl border border-white/10 p-1 md:p-1.5 rounded-full shadow-2xl gap-0.5 md:gap-1 max-w-[calc(100vw-1.5rem)]">
        <button 
          onClick={() => setViewMode('grid')}
          className={`flex items-center gap-1.5 px-3 md:px-4 py-2.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${viewMode === 'grid' ? 'bg-white text-black font-black' : 'text-gray-500 hover:text-white'}`}
        >
          <LayoutGrid className="w-3.5 h-3.5" /> Grille
        </button>
        <button 
          onClick={() => setViewMode('feed')}
          className={`flex items-center gap-1.5 px-3 md:px-4 py-2.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${viewMode === 'feed' ? 'bg-gradient-to-r from-[#00f2ff] to-[#bc13fe] text-black font-black' : 'text-gray-500 hover:text-white'}`}
        >
          <Smartphone className="w-3.5 h-3.5" /> Flux
        </button>
        <button 
          onClick={() => setViewMode('library')}
          className={`flex items-center gap-1.5 px-3 md:px-4 py-2.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${viewMode === 'library' ? 'bg-white text-black font-black' : 'text-gray-500 hover:text-white'}`}
        >
          <Library className="w-3.5 h-3.5" /> Biblio
        </button>
        <button 
          onClick={() => setViewMode('crowdfunding')}
          className={`flex items-center gap-1.5 px-3 md:px-4 py-2.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${viewMode === 'crowdfunding' ? 'bg-gradient-to-r from-amber-500 to-amber-700 text-black font-black' : 'text-gray-500 hover:text-white'}`}
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
        ) : viewMode === 'library' && libraryWorks.length === 0 ? (
          <div className='flex flex-col items-center justify-center h-full min-h-[60vh] text-center px-6'>
            <Library className='w-14 h-14 mb-5 text-gray-600' />
            <p className='text-sm font-bold text-gray-300 mb-2'>Votre bibliothèque est vide</p>
            <p className='text-xs text-gray-500 max-w-xs'>Les œuvres que vous achetez y apparaissent automatiquement. Ajoutez les œuvres gratuites avec le bouton « Biblio » du flux.</p>
          </div>
        ) : viewMode === 'feed' || viewMode === 'library' ? (
          <SocialFeed 
            key={viewMode}
            works={viewMode === 'library' ? libraryWorks : processedWorks} 
            isSaved={library.isSaved}
            onToggleSave={library.toggle}
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
