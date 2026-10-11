'use client';
import { useState, useEffect } from 'react';
import { useWriteContract, useAccount, useConfig, useSwitchChain } from 'wagmi';
import { readContract, waitForTransactionReceipt } from 'wagmi/actions';
import { parseEther, erc20Abi } from 'viem';
import { LayoutGrid, Rocket, Disc, Loader2, Zap, Play, Sparkles, Smartphone, Eye, Library } from 'lucide-react';
import Navigation from '../components/Navigation';
import SocialFeed from '../components/SocialFeed';
import BeamUpABI from '../contracts/BeamUpV3.json';
import { getPaymentInfo, CONTRACT_ADDRESSES, SUPPORTED_CHAIN_IDS } from '../config/contracts';
import { useAllWorks, toUid } from '../hooks/useAllWorks';
import { useLibrary } from '../hooks/useLibrary';
import { FORMATS, getFormat } from '../config/formats';
import LandingPage from '../components/LandingPage';
import CrowdfundingCampaign from '../components/CrowdfundingCampaign';


export default function Home() {
  const [viewMode, setViewMode] = useState<'grid' | 'feed' | 'library' | 'crowdfunding'>('feed');
  const [analytics, setAnalytics] = useState<Record<number, { views: number; completed: number; inProgress: number }>>({});

  const { isConnected, address, chainId: walletChainId } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const { switchChainAsync } = useSwitchChain();
  const config = useConfig();

  // Fil unique : les œuvres des 4 réseaux, chacune avec son réseau (badge) et son identifiant de contrat.
  const { works, isLoading: isGalleryLoading, refetch } = useAllWorks(address);
  const findWork = (uid: number) => works.find((w) => w.id === uid);

  // Statistiques de vues des 4 réseaux, rangées par identifiant unique.
  useEffect(() => {
    Promise.all(
      SUPPORTED_CHAIN_IDS.map((cid) =>
        fetch(`/api/views?chainId=${cid}`)
          .then((res) => res.json())
          .then((data: Record<string, any>) => Object.entries(data).map(([wid, st]) => [toUid(cid, Number(wid)), st] as const))
          .catch(() => [])
      )
    ).then((lists) => setAnalytics(Object.fromEntries(lists.flat())));
  }, []);

  const postStat = async (uid: number, type: 'view' | 'inProgress' | 'completed') => {
    const work = findWork(uid);
    if (!work) return;
    try {
      const res = await fetch('/api/views', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chainId: work.chainId, workId: work.workId, type }),
      });
      const data = await res.json();
      if (data.success) setAnalytics((prev) => ({ ...prev, [uid]: data.stats }));
    } catch (err) {
      console.error('Erreur statistiques :', err);
    }
  };

  const trackView = (uid: number) => postStat(uid, 'view');

  const trackProgress = (uid: number, progress: number) => {
    const ip = `beam_tracked_ip_${uid}`;
    const cp = `beam_tracked_cp_${uid}`;
    if (progress >= 10 && progress < 90 && !sessionStorage.getItem(ip) && !sessionStorage.getItem(cp)) {
      sessionStorage.setItem(ip, 'true');
      postStat(uid, 'inProgress');
    } else if (progress >= 90 && !sessionStorage.getItem(cp)) {
      sessionStorage.setItem(cp, 'true');
      postStat(uid, 'completed');
    }
  };

  const getViewCount = (uid: number) => analytics[uid]?.views || 0;

  // Toute transaction se fait sur le réseau de l'œuvre : on bascule le wallet si besoin.
  const ensureChain = async (chainId: number) => {
    if (walletChainId !== chainId) await switchChainAsync({ chainId });
  };

  const handleTip = async (uid: number) => {
    const work = findWork(uid);
    if (!work) return;
    try {
      await ensureChain(work.chainId);
      await writeContractAsync({
        chainId: work.chainId,
        address: CONTRACT_ADDRESSES[work.chainId],
        abi: BeamUpABI,
        functionName: 'tipArtist',
        args: [BigInt(work.workId)],
        value: parseEther('0.001'),
      });
    } catch (error) {
      console.error('Pourboire annulé ou échoué :', error);
    }
  };

  // Achat de l'accès (NFT) : en monnaie native, ou en WBTC/BTCB après autorisation du jeton.
  const handleBuy = async (uid: number) => {
    const work = findWork(uid);
    if (!work || !address) return;
    const chainId = work.chainId;
    const contract = CONTRACT_ADDRESSES[chainId];
    try {
      await ensureChain(chainId);
      const pay = getPaymentInfo(chainId, work.paymentToken);
      if (pay.isNative) {
        const hash = await writeContractAsync({ chainId, address: contract, abi: BeamUpABI, functionName: 'buyAccess', args: [BigInt(work.workId)], value: work.price });
        await waitForTransactionReceipt(config, { chainId, hash });
      } else {
        const allowance = await readContract(config, { chainId, address: work.paymentToken, abi: erc20Abi, functionName: 'allowance', args: [address, contract] });
        if (allowance < work.price) {
          const approveHash = await writeContractAsync({ chainId, address: work.paymentToken, abi: erc20Abi, functionName: 'approve', args: [contract, work.price] });
          await waitForTransactionReceipt(config, { chainId, hash: approveHash });
        }
        const hash = await writeContractAsync({ chainId, address: contract, abi: BeamUpABI, functionName: 'buyAccess', args: [BigInt(work.workId)] });
        await waitForTransactionReceipt(config, { chainId, hash });
      }
      refetch();
    } catch (error) {
      console.error('Achat annulé ou échoué :', error);
    }
  };

  const handleLike = async (uid: number) => {
    const work = findWork(uid);
    if (!work) return;
    try {
      await ensureChain(work.chainId);
      await writeContractAsync({
        chainId: work.chainId,
        address: CONTRACT_ADDRESSES[work.chainId],
        abi: BeamUpABI,
        functionName: 'toggleLike',
        args: [BigInt(work.workId)],
      });
    } catch (error) {
      console.error('Like annulé ou échoué :', error);
    }
  };

  const handleComment = (_uid: number) => {
    // Géré par CommentDrawer.
  };

  const BeamEnergyBall = () => (
    <div className="relative w-20 h-40 flex items-center justify-center scale-75">
      <div className="absolute bottom-0 w-[1px] bg-[#00f2ff] h-full opacity-20 animate-pulse" />
      <div className="absolute bottom-0 w-8 h-8 bg-[#00f2ff] rounded-full blur-[10px] animate-beam-up opacity-80" />
      <div className="absolute bottom-0 w-4 h-4 bg-white rounded-full blur-[2px] animate-beam-up shadow-[0_0_15px_#00f2ff]" />
    </div>
  );

  const processedWorks = works;

  // Bibliothèque : œuvres achetées (NFT d'accès), ses propres œuvres, et celles ajoutées avec le signet.
  // (Clé de stockage « 56 » conservée : les identifiants BNB Chain n'ont pas changé.)
  const library = useLibrary(56, address);
  const libraryAll = processedWorks.filter(
    (w) => (w.isPremium && w.hasPaid) || w.creator.toLowerCase() === address?.toLowerCase() || library.isSaved(w.id)
  );
  // Rangement par type (musique, clips, manga…), les plus récentes d'abord dans chaque type.
  const [libraryFilter, setLibraryFilter] = useState<string>('all');
  const formatRank = (cat: string) => FORMATS.findIndex((f) => f.id === getFormat(cat).id);
  const libraryCounts = FORMATS.map((f) => ({ ...f, count: libraryAll.filter((w) => getFormat(w.category).id === f.id).length }));
  const libraryWorks = libraryAll
    .filter((w) => libraryFilter === 'all' || getFormat(w.category).id === libraryFilter)
    .sort((a, b) => formatRank(a.category) - formatRank(b.category));

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
        ) : viewMode === 'library' && libraryAll.length === 0 ? (
          <div className='flex flex-col items-center justify-center h-full min-h-[60vh] text-center px-6'>
            <Library className='w-14 h-14 mb-5 text-gray-600' />
            <p className='text-sm font-bold text-gray-300 mb-2'>Votre bibliothèque est vide</p>
            <p className='text-xs text-gray-500 max-w-xs'>Les œuvres que vous achetez y apparaissent automatiquement. Ajoutez les œuvres gratuites avec le bouton « Biblio » du flux.</p>
          </div>
        ) : viewMode === 'feed' || viewMode === 'library' ? (
          <>
          {viewMode === 'library' && (
            <div className="fixed top-[68px] left-0 right-0 z-40 px-3">
              <div className="max-w-3xl mx-auto flex gap-2 overflow-x-auto no-scrollbar py-1">
                {[{ id: 'all', label: 'Tout', count: libraryAll.length, hex: '#ffffff' }, ...libraryCounts.filter((f) => f.count > 0)].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setLibraryFilter(f.id)}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border transition-all ${libraryFilter === f.id ? 'bg-white text-black border-white' : 'bg-black/60 text-gray-300 border-white/10 backdrop-blur-xl'}`}
                  >
                    {f.label} <span className="opacity-60">{f.count}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <SocialFeed 
            key={viewMode + libraryFilter}
            topInset={viewMode === 'library'}
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
          </>
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
