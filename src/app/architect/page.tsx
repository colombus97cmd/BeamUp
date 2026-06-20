'use client';
import { useState, useEffect, useRef } from 'react';
import { useAccount, useReadContract, useWriteContract, useBalance, useWaitForTransactionReceipt, useChainId } from 'wagmi';
import { formatEther } from 'viem';
import { 
  LayoutGrid, User, Mail, Globe, ExternalLink, Zap, Shield, Sparkles, 
  Wallet, ArrowDownCircle, Loader2, Fingerprint, Disc, TrendingUp, 
  Heart, FileText, Music, Video, Edit3, Camera, Save, X, CheckCircle2, Eye
} from 'lucide-react';
import Link from 'next/link';
import Navigation from '../../components/Navigation';
import { uploadToIPFS } from '../../services/pinata';
import BeamUpABI from '../../contracts/BeamUp.json';

// Multi-chain contract addresses
const CONTRACT_ADDRESSES: Record<number, `0x${string}`> = {
  56: '0x92c1D8eCE7962634cF337d763994Af1490605dA4',   // BSC Mainnet
  20: '0x92c1D8eCE7962634cF337d763994Af1490605dA4',   // Elastos ESC
  137: '0x6a2BC463fd7e1b6E6769023F8CD41835e347C317',  // Polygon Mainnet
  42161: '0x92c1D8eCE7962634cF337d763994Af1490605dA4',// Arbitrum One
};
const DEFAULT_CHAIN = 56;

const IPFS_GATEWAY = 'https://gateway.pinata.cloud/ipfs/';

export default function Architect() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const CONTRACT_ADDRESS = CONTRACT_ADDRESSES[chainId] || CONTRACT_ADDRESSES[DEFAULT_CHAIN];
  const currencySymbol = chainId === 137 ? 'POL' : chainId === 20 ? 'ELA' : chainId === 42161 ? 'ETH' : 'BNB';

  const [analytics, setAnalytics] = useState<Record<number, { views: number; completed: number; inProgress: number }>>({});

  useEffect(() => {
    fetch('/api/views')
      .then(res => res.json())
      .then(data => {
        setAnalytics(data);
      })
      .catch(err => console.error("Error fetching views:", err));
  }, []);

  const getWorkStats = (id: number) => {
    const stats = analytics[id];
    return {
      views: stats?.views || 0,
      completed: stats?.completed || 0,
      inProgress: stats?.inProgress || 0,
    };
  };

  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [userWorks, setUserWorks] = useState<any[]>([]);
  const [totalGains, setTotalGains] = useState(0n);
  
  // Profile State
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [websiteLink, setWebsiteLink] = useState('');
  const [contactLink, setContactLink] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: profileData, refetch: refetchProfile } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: BeamUpABI,
    functionName: 'getProfile',
    args: [address as `0x${string}`],
  });

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

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isConfirmed) {
      refetchProfile();
      setIsEditing(false);
    }
  }, [isConfirmed, refetchProfile]);

  useEffect(() => {
    if (address && ownerAddress) {
      setIsAdmin(address.toLowerCase() === (ownerAddress as string).toLowerCase());
    }

    if (address && allWorks) {
      const works = (allWorks as any[]).map((w, index) => ({ ...w, workId: index }));
      const filtered = works.filter(w => w.creator.toLowerCase() === address.toLowerCase());
      const total = filtered.reduce((acc, curr) => acc + BigInt(curr.totalTips), 0n);
      setUserWorks(filtered);
      setTotalGains(total);
    }

    if (profileData && (profileData as any).exists) {
      const p = profileData as any;
      setUsername(p.username);
      const bioStr = p.bio || '';
      if (bioStr.includes('||')) {
        const parts = bioStr.split('||');
        setBio(parts[0] || '');
        setWebsiteLink(parts[1] || '');
        setContactLink(parts[2] || '');
      } else {
        setBio(bioStr);
        setWebsiteLink('');
        setContactLink('');
      }
      setAvatarPreview(`${IPFS_GATEWAY}${p.avatarCID}`);
    }
  }, [address, ownerAddress, allWorks, profileData]);

  const handleUpdateProfile = async () => {
    setIsUploading(true);
    try {
      let finalAvatarCID = (profileData as any)?.avatarCID || "";
      
      if (avatarFile) {
        finalAvatarCID = await uploadToIPFS(avatarFile);
      }

      // Combine bio, website, and contact with || separator
      const combinedBio = `${bio}||${websiteLink}||${contactLink}`;

      writeContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: BeamUpABI,
        functionName: 'updateProfile',
        args: [username, finalAvatarCID, combinedBio],
      });
    } catch (error) {
      console.error("Profile update failed:", error);
      setIsUploading(false);
    }
  };

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
          <section className='mb-12'>
            <div className='bg-gradient-to-r from-[#00f2ff]/10 to-[#bc13fe]/10 border border-[#00f2ff]/20 p-8 rounded-[32px] flex flex-col md:flex-row justify-between items-center gap-6 backdrop-blur-3xl'>
              <div className='flex items-center gap-4'>
                <Fingerprint className='w-6 h-6 text-[#00f2ff]' />
                <div>
                  <p className='text-[8px] uppercase tracking-widest font-black text-[#00f2ff]'>Terminal Architecte</p>
                  <h3 className='text-2xl font-black font-mono'>{contractBalance?.formatted || '0.00'} {currencySymbol}</h3>
                </div>
              </div>
              <button onClick={handleWithdraw} className='px-8 py-3 bg-white text-black font-black uppercase text-[9px] rounded-xl hover:bg-[#00f2ff] transition-all'>Encaisser</button>
            </div>
          </section>
        )}

        <div className='grid grid-cols-1 lg:grid-cols-3 gap-12'>
          {/* COLONNE GAUCHE : PROFIL */}
          <aside className='lg:col-span-1'>
            <section className='cyber-glass p-8 rounded-[48px] border border-white/10 sticky top-24'>     
              <div className='flex flex-col items-center text-center'>
                
                {/* Avatar Section */}
                <div className='relative group mb-6'>
                  <div className='w-40 h-40 rounded-[40px] bg-gradient-to-tr from-[#bc13fe] to-[#00f2ff] p-1'>
                    <div className='w-full h-full bg-[#050505] rounded-[38px] flex items-center justify-center overflow-hidden'>
                      {avatarPreview ? (
                        <img src={avatarPreview} className='w-full h-full object-cover' alt="Avatar" />
                      ) : (
                        <User className='w-16 h-16 text-white/10' />
                      )}
                    </div>
                  </div>
                  {isEditing && (
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className='absolute inset-0 bg-black/60 rounded-[40px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm border border-white/20'
                    >
                      <Camera className='w-8 h-8 text-[#00f2ff]' />
                      <input type="file" ref={fileInputRef} hidden onChange={(e) => {
                        if (e.target.files?.[0]) {
                          setAvatarFile(e.target.files[0]);
                          setAvatarPreview(URL.createObjectURL(e.target.files[0]));
                        }
                      }} />
                    </button>
                  )}
                </div>

                {isEditing ? (
                  <div className='w-full space-y-4'>
                    <input 
                      value={username} 
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Nom d'utilisateur"
                      className='w-full bg-white/5 border border-white/10 p-3 rounded-xl text-center font-black uppercase tracking-tighter outline-none focus:border-[#00f2ff]'
                    />
                    <textarea 
                      value={bio} 
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Votre vision Web3..."
                      className='w-full bg-white/5 border border-white/10 p-3 rounded-xl text-xs text-gray-400 outline-none focus:border-[#bc13fe] h-24 resize-none'
                    />
                    <input 
                      value={websiteLink} 
                      onChange={(e) => setWebsiteLink(e.target.value)}
                      placeholder="Site internet / Portfolio (ex: https://...)"
                      className='w-full bg-white/5 border border-white/10 p-3 rounded-xl text-xs outline-none focus:border-[#00f2ff]'
                    />
                    <input 
                      value={contactLink} 
                      onChange={(e) => setContactLink(e.target.value)}
                      placeholder="Contact / Réseau (ex: https://...)"
                      className='w-full bg-white/5 border border-white/10 p-3 rounded-xl text-xs outline-none focus:border-[#bc13fe]'
                    />
                    <div className='flex gap-2'>
                      <button 
                        onClick={handleUpdateProfile} 
                        disabled={isUploading || isPending || isConfirming}
                        className='flex-1 py-3 bg-[#00f2ff] text-black font-black uppercase text-[9px] rounded-xl flex items-center justify-center gap-2 disabled:opacity-50'
                      >
                        {isUploading || isPending || isConfirming ? (
                          <>
                            <Loader2 className='w-3 h-3 animate-spin' /> 
                            {isConfirming ? 'Confirmation...' : isPending ? 'Signature...' : 'Upload...'}
                          </>
                        ) : (
                          <>
                            <Save className='w-3 h-3' /> Sauver
                          </>
                        )}
                      </button>
                      <button onClick={() => setIsEditing(false)} disabled={isUploading || isPending || isConfirming} className='p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-red-500/20 disabled:opacity-50'><X className='w-3 h-3' /></button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h2 className='text-3xl font-black uppercase tracking-tighter mb-2'>{username || (isAdmin ? "Architecte Anonyme" : "Artiste Anonyme")}</h2>    
                    <p className='text-[10px] uppercase tracking-widest text-[#00f2ff] font-black mb-1'>{isAdmin ? "Architecte de la DApp" : "Artiste de la DApp"}</p>
                    <p className='text-[9px] uppercase tracking-widest text-gray-500 mb-6'>{address?.slice(0,6)}...{address?.slice(-4)}</p>
                    <p className='text-xs leading-relaxed text-gray-400 font-light mb-8'>{bio || (isAdmin ? "Aucune vision définie pour cet architecte." : "Aucune biographie définie pour cet artiste.")}</p>
                    
                    <button 
                      onClick={() => setIsEditing(true)}
                      className='w-full py-4 border border-[#00f2ff]/40 text-[#00f2ff] font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-[#00f2ff]/10 transition-all flex items-center justify-center gap-2 mb-4'
                    >
                      <Edit3 className='w-3 h-3' /> Éditer le Profil
                    </button>
                  </>
                )}

                {/* Social / Portfolio Links */}
                {(websiteLink || contactLink || isAdmin) && (
                  <div className='w-full border-t border-white/5 pt-8 flex gap-3 justify-center'>
                    {(websiteLink || isAdmin) && (
                      <a 
                        href={websiteLink || (isAdmin ? "https://portfolio-2026-colombod.vercel.app/" : "#")} 
                        target='_blank' 
                        rel="noopener noreferrer" 
                        className='p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all'
                        title="Site web / Portfolio"
                      >
                        <Globe className='w-4 h-4 text-[#bc13fe]' />
                      </a>
                    )}
                    {(contactLink || isAdmin) && (
                      <a 
                        href={contactLink || (isAdmin ? "https://portfolio-2026-colombod.vercel.app/contact.html" : "#")} 
                        target='_blank' 
                        rel="noopener noreferrer" 
                        className='p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all'
                        title="Contact / Réseau social"
                      >
                        <Mail className='w-4 h-4 text-[#00f2ff]' />
                      </a>
                    )}
                  </div>
                )}
              </div>
            </section>
          </aside>

          {/* COLONNE DROITE : STATS & ARCHIVES */}
          <section className='lg:col-span-2 space-y-8'>
            <div className='grid grid-cols-2 gap-4'>
              <div className='cyber-glass p-6 rounded-3xl border border-white/5'>
                <p className='text-[8px] uppercase tracking-widest text-gray-500 mb-2'>Gains (Directs)</p>
                <h4 className='text-2xl font-black text-[#bc13fe]'>{formatEther(totalGains).slice(0, 6)} {currencySymbol}</h4>
              </div>
              <div className='cyber-glass p-6 rounded-3xl border border-white/5'>
                <p className='text-[8px] uppercase tracking-widest text-gray-500 mb-2'>Œuvres</p>
                <h4 className='text-2xl font-black text-[#00f2ff]'>{userWorks.length}</h4>
              </div>
            </div>

            <h3 className='text-xs uppercase tracking-[0.3em] font-black text-gray-500 flex items-center gap-3 border-b border-white/5 pb-4'>
              <LayoutGrid className='w-4 h-4' /> Mes Archives de Diffusion
            </h3>

            {userWorks.length === 0 ? (
              <div className='py-20 text-center opacity-20'>
                <Disc className='w-16 h-16 mx-auto mb-4' />
                <p className='text-[10px] uppercase tracking-[0.4em]'>Aucune archive détectée</p>
              </div>
            ) : (
              <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                {userWorks.map((work, i) => {
                  const stats = getWorkStats(work.workId);
                  const completionRate = stats.views > 0 ? Math.round((stats.completed / stats.views) * 100) : 0;
                  return (
                    <div key={i} className='cyber-glass p-6 rounded-3xl border border-white/5 group flex flex-col justify-between'>
                      <div>
                        <div className='flex items-center gap-4 mb-4'>
                           <div className='p-2 bg-white/5 rounded-lg'>
                              {work.category === 'Musique' ? <Music className='w-4 h-4 text-[#bc13fe]' /> : work.category === 'Webtoon' || work.category === 'BD' ? <FileText className='w-4 h-4 text-amber-500' /> : <Video className='w-4 h-4 text-[#00f2ff]' />}
                           </div>
                           <h4 className='text-lg font-black uppercase truncate flex-1'>{work.title}</h4>
                        </div>

                        {/* Intelligent Analytics dashboard widget */}
                        <div className='space-y-3 bg-white/5 p-4 rounded-2xl border border-white/5 mb-4'>
                          <div className='flex items-center justify-between text-[10px] uppercase font-black tracking-wider text-gray-400'>
                            <span className="flex items-center gap-1.5"><TrendingUp className='w-3 h-3 text-[#00f2ff]' /> Taux de Rétention</span>
                            <span className='text-white font-mono'>{completionRate}%</span>
                          </div>
                          
                          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-[#bc13fe] to-[#00f2ff] rounded-full" style={{ width: `${completionRate}%` }} />
                          </div>

                          <div className='grid grid-cols-3 gap-2 text-[9px] uppercase font-bold text-center mt-2'>
                            <div className="bg-black/40 py-2 px-1 rounded-xl">
                              <p className='text-white font-mono text-xs'>{stats.views}</p>
                              <p className='text-gray-500 text-[7px] mt-0.5'>Vues</p>
                            </div>
                            <div className="bg-black/40 py-2 px-1 rounded-xl border border-emerald-500/10">
                              <p className='text-emerald-400 font-mono text-xs'>{stats.completed}</p>
                              <p className='text-gray-500 text-[7px] mt-0.5'>Finies</p>
                            </div>
                            <div className="bg-black/40 py-2 px-1 rounded-xl border border-amber-500/10">
                              <p className='text-amber-500 font-mono text-xs'>{stats.inProgress}</p>
                              <p className='text-gray-500 text-[7px] mt-0.5'>En cours</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className='flex justify-between items-end border-t border-white/5 pt-4'>
                         <p className='text-[10px] font-mono text-gray-600'>{formatEther(work.totalTips).slice(0,6)} {currencySymbol}</p>
                         <Link href="/" className='p-2 bg-white/5 rounded-lg hover:bg-[#00f2ff]/20'><ExternalLink className='w-3 h-3' /></Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
