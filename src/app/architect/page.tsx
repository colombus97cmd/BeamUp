'use client';
import { useState, useEffect } from 'react';
import { ConnectKitButton } from 'connectkit';
import { useAccount, useReadContract, useWriteContract, useBalance } from 'wagmi';
import { formatEther } from 'viem';
import { Rocket, User, Mail, Globe, ExternalLink, Zap, Shield, Sparkles, Wallet, ArrowDownCircle, Loader2, Fingerprint, Disc, TrendingUp, Heart } from 'lucide-react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import BeamUpABI from '@/contracts/BeamUp.json';

const CONTRACT_ADDRESS = '0x66e45A936564B364e92bD6436Fc2D4B1934aCbCf';

export default function Architect() {
  const { address, isConnected } = useAccount();
  const [isAdmin, setIsAdmin] = useState(false);
  const [userStats, setUserStats] = useState({ works: 0, totalTips: 0n });

  // 1. Lecture du propriétaire du contrat (Admin)
  const { data: ownerAddress } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: BeamUpABI,
    functionName: 'owner',
  });

  // 2. Lecture de toutes les œuvres (pour calculer les stats de l'artiste connecté)
  const { data: allWorks } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: BeamUpABI,
    functionName: 'getAllWorks',
  });

  // 3. Lecture du solde du contrat (Revenus Plateforme)
  const { data: contractBalance } = useBalance({
    address: CONTRACT_ADDRESS as `0x${string}`,
  });

  const { writeContract, isPending } = useWriteContract();

  // Logique de détection Admin et calcul des Stats Artiste
  useEffect(() => {
    if (address && ownerAddress) {
      setIsAdmin(address.toLowerCase() === (ownerAddress as string).toLowerCase());
    }

    if (address && allWorks) {
      const works = allWorks as any[];
      const filtered = works.filter(w => w.creator.toLowerCase() === address.toLowerCase());
      const total = filtered.reduce((acc, curr) => acc + BigInt(curr.totalTips), 0n);
      setUserStats({ works: filtered.length, totalTips: total });
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

      <main className='max-w-5xl mx-auto px-4 py-12'>
        
        {/* DASHBOARD ADMIN (Visible uniquement pour vous) */}
        {isAdmin && (
          <section className='mb-12 animate-in fade-in slide-in-from-top-4 duration-700'>
            <div className='bg-gradient-to-r from-[#00f2ff]/20 to-[#bc13fe]/20 border border-[#00f2ff]/40 p-8 md:p-10 rounded-[40px] flex flex-col md:flex-row justify-between items-center gap-8 backdrop-blur-3xl shadow-2xl'>
              <div className='flex items-center gap-6'>
                <div className='p-4 bg-black/60 rounded-3xl border border-white/10'>
                  <Fingerprint className='w-8 h-8 text-[#00f2ff]' />
                </div>
                <div>
                  <p className='text-[10px] uppercase tracking-[0.3em] font-black text-[#00f2ff] mb-1'>Terminal Architecte (Revenus Plateforme)</p>
                  <h3 className='text-3xl md:text-5xl font-black font-mono tracking-tighter'>
                    {contractBalance?.formatted ? contractBalance.formatted.slice(0, 8) : '0.00'} <span className='text-sm text-gray-500'>BNB</span>
                  </h3>
                </div>
              </div>
              <button 
                onClick={handleWithdraw}
                disabled={isPending || !contractBalance || parseFloat(contractBalance.formatted) === 0}
                className='w-full md:w-auto px-10 py-5 bg-white text-black font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-[#00f2ff] transition-all flex items-center justify-center gap-3'
              >
                {isPending ? <Loader2 className='w-4 h-4 animate-spin' /> : <ArrowDownCircle className='w-4 h-4' />}
                Retirer les Fonds
              </button>
            </div>
          </section>
        )}

        {/* DASHBOARD ARTISTE (Visible pour tous les artistes connectés) */}
        {isConnected && !isAdmin && userStats.works > 0 && (
          <section className='mb-12 animate-in fade-in zoom-in-95 duration-700'>
            <div className='cyber-glass p-8 rounded-[40px] border border-white/10 flex flex-col md:flex-row items-center gap-12'>
               <div className='flex items-center gap-4'>
                  <div className='p-3 bg-[#bc13fe]/10 rounded-2xl'><Disc className='w-6 h-6 text-[#bc13fe] animate-spin-slow' /></div>
                  <div>
                    <p className='text-[9px] uppercase tracking-widest text-gray-500'>Œuvres Diffusées</p>
                    <h4 className='text-2xl font-black'>{userStats.works}</h4>
                  </div>
               </div>
               <div className='flex items-center gap-4'>
                  <div className='p-3 bg-pink-500/10 rounded-2xl'><TrendingUp className='w-6 h-6 text-pink-500' /></div>
                  <div>
                    <p className='text-[9px] uppercase tracking-widest text-gray-500'>Revenus Directs Reçus</p>
                    <h4 className='text-2xl font-black text-pink-500'>{formatEther(userStats.totalTips).slice(0, 8)} <span className='text-xs'>BNB</span></h4>
                  </div>
               </div>
               <div className='ml-auto bg-green-500/10 px-4 py-2 rounded-full border border-green-500/20'>
                  <p className='text-[8px] font-black text-green-500 uppercase tracking-widest'>Statut : Artiste Certifié</p>
               </div>
            </div>
          </section>
        )}

        <section className='cyber-glass p-10 md:p-20 rounded-[48px] md:rounded-[64px] border border-white/10 relative overflow-hidden'>
          <div className='absolute -top-24 -right-24 w-96 h-96 bg-[#00f2ff]/10 blur-[120px] rounded-full' />
          
          <div className='flex flex-col md:flex-row gap-12 md:gap-16 items-center relative z-10'>
            <div className='w-56 h-56 md:w-64 md:h-64 rounded-[48px] bg-gradient-to-tr from-[#bc13fe] to-[#00f2ff] p-1 shadow-2xl'>
              <div className='w-full h-full bg-[#050505] rounded-[42px] flex items-center justify-center overflow-hidden'>
                <User className='w-32 h-32 text-white opacity-10' />
              </div>
            </div>

            <div className='text-center md:text-left flex-1'>
              <div className='inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-6'>
                <Sparkles className='w-3 h-3 text-[#00f2ff]' />
                <span className='text-[8px] md:text-[10px] uppercase tracking-widest font-black text-gray-400'>Créateur de Beam Up</span>
              </div>
              <h2 className='text-4xl md:text-7xl font-black tracking-tighter uppercase leading-none mb-6'>David <br /><span className='text-transparent bg-clip-text bg-gradient-to-r from-[#00f2ff] to-[#bc13fe]'>COLOMBO</span></h2>
              
              <div className='flex flex-wrap justify-center md:justify-start gap-4 mt-8'>
                <a href="mailto:david-colombo@outlook.fr" className='p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl transition-all'><Mail className='w-5 h-5 md:w-6 md:h-6 text-[#00f2ff]' /></a>
                <button className='p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl transition-all'><Globe className='w-5 h-5 md:w-6 md:h-6 text-[#bc13fe]' /></button>
                <button className='w-full sm:w-auto px-8 py-4 bg-white text-black font-black uppercase text-[12px] tracking-[0.2em] rounded-2xl hover:bg-[#00f2ff] transition-all flex items-center justify-center gap-3'>Voir Portfolio <ExternalLink className='w-4 h-4' /></button>
              </div>
            </div>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-3 gap-12 mt-20 border-t border-white/5 pt-16 text-gray-500'>
            <div className='space-y-3'>
              <h3 className='text-[10px] uppercase tracking-[0.3em] font-black text-[#00f2ff] flex items-center gap-2'><Zap className='w-4 h-4' /> Vision</h3>
              <p className='text-xs leading-relaxed font-light'>Libérer l'art de la censure centralisée via la BNB Chain.</p>
            </div>
            <div className='space-y-3'>
              <h3 className='text-[10px] uppercase tracking-[0.3em] font-black text-[#bc13fe] flex items-center gap-2'><Shield className='w-4 h-4' /> Sécurité</h3>
              <p className='text-xs leading-relaxed font-light'>IPFS garantit l'immuabilité de vos créations pour l'éternité.</p>
            </div>
            <div className='space-y-3'>
              <h3 className='text-[10px] uppercase tracking-[0.3em] font-black text-white flex items-center gap-2'><Rocket className='w-4 h-4' /> Protocol</h3>
              <div className='flex flex-wrap gap-2'>
                {['BNB Chain', 'IPFS', 'Next.js'].map(s => <span key={s} className='px-2 py-1 bg-white/5 border border-white/10 rounded text-[8px] font-bold uppercase'>{s}</span>)}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}