'use client';
import { useState, useEffect } from 'react';
import { ConnectKitButton } from 'connectkit';
import { useAccount, useReadContract, useWriteContract, useBalance } from 'wagmi';
import { formatEther } from 'viem';
import { Rocket, User, Mail, Globe, ExternalLink, Zap, Shield, Sparkles, Wallet, ArrowDownCircle, Loader2, Fingerprint, Disc, TrendingUp, Heart, FileText, Music, Video, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import Navigation from '../../components/Navigation';
import BeamUpABI from '../../contracts/BeamUp.json';

const CONTRACT_ADDRESS = '0x66e45A936564B364e92bD6436Fc2D4B1934aCbCf';
const IPFS_GATEWAY = 'https://gateway.pinata.cloud/ipfs/';

export default function Architect() {
  const { address, isConnected } = useAccount();
  const [isAdmin, setIsAdmin] = useState(false);
  const [userWorks, setUserWorks] = useState<any[]>([]);
  const [totalGains, setTotalGains] = useState(0n);

  const { data: ownerAddress } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: BeamUpABI,
    functionName: 'owner',
  });

  const { data: allWorks } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: BeamUpABI,
    functionName: 'getAllWorks',
  });

  const { data: contractBalance } = useBalance({
    address: CONTRACT_ADDRESS as `0x${string}`,
  });

  const { writeContract, isPending } = useWriteContract();

  useEffect(() => {
    if (address && ownerAddress) {
      setIsAdmin(address.toLowerCase() === (ownerAddress as string).toLowerCase());
    }

    if (address && allWorks) {
      const works = allWorks as any[];
      const filtered = works.filter(w => w.creator.toLowerCase() === address.toLowerCase());
      const total = filtered.reduce((acc, curr) => acc + BigInt(curr.totalTips), 0n);
      setUserWorks(filtered);
      setTotalGains(total);
    }
  }, [address, ownerAddress, allWorks]);

  const handleWithdraw = () => {
    writeContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: BeamUpABI,
      functionName: 'withdrawFees',
    });
  };

  return (
    <div className='min-h-screen bg-[#020202] text-white'>
      <Navigation />

      <main className='max-w-6xl mx-auto px-4 py-12'>
        
        {/* DASHBOARD ADMIN */}
        {isAdmin && (
          <section className='mb-12 animate-in fade-in slide-in-from-top-4 duration-700'>
            <div className='bg-gradient-to-r from-[#00f2ff]/20 to-[#bc13fe]/20 border border-[#00f2ff]/40 p-10 rounded-[40px] flex flex-col md:flex-row justify-between items-center gap-8 backdrop-blur-3xl shadow-2xl'>
              <div className='flex items-center gap-6'>
                <div className='p-4 bg-black/60 rounded-3xl border border-white/10'>
                  <Fingerprint className='w-8 h-8 text-[#00f2ff]' />
                </div>
                <div>
                  <p className='text-[10px] uppercase tracking-[0.3em] font-black text-[#00f2ff] mb-1'>Terminal Architecte</p>
                  <h3 className='text-4xl md:text-5xl font-black font-mono tracking-tighter'>
                    {contractBalance?.formatted ? contractBalance.formatted.slice(0, 8) : '0.00'} <span className='text-sm text-gray-500'>BNB</span>
                  </h3>
                </div>
              </div>
              <button 
                onClick={handleWithdraw}
                disabled={isPending || !contractBalance || parseFloat(contractBalance.formatted) === 0}
                className='w-full md:w-auto px-10 py-5 bg-white text-black font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-[#00f2ff] transition-all flex items-center justify-center gap-3 shadow-xl'
              >
                {isPending ? <Loader2 className='w-4 h-4 animate-spin' /> : <ArrowDownCircle className='w-4 h-4' />}
                Encaisser les Revenus
              </button>
            </div>
          </section>
        )}

        {/* STATISTIQUES ARTISTE */}
        {isConnected && userWorks.length > 0 && (
          <section className='mb-12 animate-in fade-in zoom-in-95 duration-700'>
            <div className='cyber-glass p-8 rounded-[40px] border border-white/10 grid grid-cols-1 md:grid-cols-3 gap-8 items-center'>
               <div className='flex items-center gap-4'>
                  <div className='p-3 bg-[#bc13fe]/10 rounded-2xl'><Disc className='w-6 h-6 text-[#bc13fe] animate-spin-slow' /></div>
                  <div>
                    <p className='text-[9px] uppercase tracking-widest text-gray-500'>Å’uvres DiffusÃ©es</p>
                    <h4 className='text-2xl font-black'>{userWorks.length}</h4>
                  </div>
               </div>
               <div className='flex items-center gap-4'>
                  <div className='p-3 bg-pink-500/10 rounded-2xl'><TrendingUp className='w-6 h-6 text-pink-500' /></div>
                  <div>
                    <p className='text-[9px] uppercase tracking-widest text-gray-500'>Gains Totaux (Directs)</p>
                    <h4 className='text-2xl font-black text-pink-500'>{formatEther(totalGains).slice(0, 8)} <span className='text-xs'>BNB</span></h4>
                  </div>
               </div>
               <div className='flex justify-center md:justify-end'>
                  <div className='bg-green-500/10 px-6 py-3 rounded-full border border-green-500/20'>
                    <p className='text-[10px] font-black text-green-500 uppercase tracking-widest flex items-center gap-2'><Shield className='w-3 h-3' /> Artiste CertifiÃ©</p>
                  </div>
               </div>
            </div>
          </section>
        )}

        <div className='grid grid-cols-1 lg:grid-cols-3 gap-12'>
          {/* COLONNE GAUCHE : PROFIL */}
          <aside className='lg:col-span-1'>
            <section className='cyber-glass p-8 rounded-[48px] border border-white/10 sticky top-24'>
              <div className='flex flex-col items-center text-center'>
                <div className='w-40 h-40 rounded-[40px] bg-gradient-to-tr from-[#bc13fe] to-[#00f2ff] p-1 mb-6'>
                  <div className='w-full h-full bg-[#050505] rounded-[38px] flex items-center justify-center overflow-hidden'>
                    <User className='w-20 h-20 text-white opacity-10' />
                  </div>
                </div>
                <h2 className='text-3xl font-black uppercase tracking-tighter mb-2'>David Colombo</h2>
                <p className='text-[10px] uppercase tracking-widest text-gray-500 mb-8'>Architecte Web3</p>
                
                <div className='flex gap-3 mb-8'>
                  <a href="mailto:david-colombo@outlook.fr" className='p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all'><Mail className='w-4 h-4 text-[#00f2ff]' /></a>
                  <button className='p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all'><Globe className='w-4 h-4 text-[#bc13fe]' /></button>
                </div>

                <div className='w-full border-t border-white/5 pt-8 text-left space-y-6'>
                  <div>
                    <h3 className='text-[9px] uppercase font-black text-gray-500 tracking-[0.2em] mb-2'>Ma Vision</h3>
                    <p className='text-xs leading-relaxed text-gray-400 font-light'>Redonner le pouvoir aux crÃ©ateurs via la dÃ©centralisation totale.</p>
                  </div>
                  <button className='w-full py-4 bg-white text-black font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-[#00f2ff] transition-all flex items-center justify-center gap-2'>
                    Portfolio <ExternalLink className='w-3 h-3' />
                  </button>
                </div>
              </div>
            </section>
          </aside>

          {/* COLONNE DROITE : HISTORIQUE DES Å’UVRES */}
          <section className='lg:col-span-2 space-y-8'>
            <h3 className='text-xs uppercase tracking-[0.3em] font-black text-gray-500 flex items-center gap-3 border-b border-white/5 pb-4'>
              <LayoutGrid className='w-4 h-4' /> Mes Archives de Diffusion
            </h3>

            {userWorks.length === 0 ? (
              <div className='py-20 text-center cyber-glass rounded-[40px] opacity-20 border border-white/5'>
                <Disc className='w-16 h-16 mx-auto mb-4' />
                <p className='text-[10px] uppercase tracking-[0.4em]'>Aucune archive dÃ©tectÃ©e</p>
              </div>
            ) : (
              <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                {userWorks.map((work, i) => (
                  <div key={i} className='cyber-glass p-6 rounded-3xl border border-white/5 hover:border-white/10 transition-all group'>
                    <div className='flex items-start justify-between mb-6'>
                      <div className='p-3 bg-white/5 rounded-2xl'>
                        {work.category === 'Musique' ? <Music className='w-6 h-6 text-[#bc13fe]' /> : work.category === 'VidÃ©o' ? <Video className='w-6 h-6 text-[#00f2ff]' /> : <FileText className='w-6 h-6 text-[#FFD700]' />}
                      </div>
                      <div className='text-right'>
                        <p className='text-[8px] uppercase font-black text-pink-500 mb-1'>Revenus GÃ©nÃ©rÃ©s</p>
                        <p className='text-lg font-black font-mono'>{formatEther(work.totalTips).slice(0, 6)} <span className='text-[10px]'>BNB</span></p>
                      </div>
                    </div>
                    
                    <h4 className='text-xl font-black uppercase tracking-tight mb-4 group-hover:text-[#00f2ff] transition-colors'>{work.title}</h4>
                    
                    <div className='flex items-center justify-between mt-auto pt-4 border-t border-white/5'>
                      <span className='text-[8px] font-mono text-gray-600 uppercase tracking-widest'>CID: {work.ipfsCID.slice(0, 10)}...</span>
                      <a href={`${IPFS_GATEWAY}${work.ipfsCID}`} target="_blank" className='p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-all'>
                        <ExternalLink className='w-3 h-3 text-gray-400' />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
