'use client';
import { useState, useRef, useEffect } from 'react';
import { ConnectKitButton } from 'connectkit';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useChainId, useSignMessage, useReadContract } from 'wagmi';
import { parseUnits, formatEther } from 'viem';
import { Rocket, Upload, PlusCircle, X, CheckCircle2, ShieldCheck, Sparkles, Coins } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navigation from '../../components/Navigation';
import { uploadToIPFS } from '../../services/pinata';
import BeamUpABI from '../../contracts/BeamUpV3.json';
import { getContractAddress, getCurrencySymbol, getChainName, BTC_TOKENS, NATIVE_TOKEN } from '../../config/contracts';
import { FORMATS, getFormat } from '../../config/formats';


export default function Publish() {
  const { isConnected, address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const chainId = useChainId();
  const CONTRACT_ADDRESS = getContractAddress(chainId);
  const currencySymbol = getCurrencySymbol(chainId);
  const chainName = getChainName(chainId);
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Musique');
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'blockchain' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [manualCid, setManualCid] = useState('');
  const [cid, setCid] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [price, setPrice] = useState('0.1');
  const [payWithBtc, setPayWithBtc] = useState(false);
  const [royalty, setRoyalty] = useState('5');
  const [maxSupply, setMaxSupply] = useState('');
  const btcToken = BTC_TOKENS[chainId];
  const { data: platformFee } = useReadContract({ address: CONTRACT_ADDRESS, abi: BeamUpABI, functionName: 'platformFee' });
  const feeLabel = platformFee !== undefined ? formatEther(platformFee as bigint) : '0.0001';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { writeContract, data: hash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isConfirmed) {
      setTimeout(() => {
        router.push('/');
      }, 2500);
    }
  }, [isConfirmed, router]);

  const handlePublish = async () => {
    if ((!file && !manualCid) || !title) return;
    setStatus('uploading');
    setUploadProgress(0);
    try {
      let finalCid = manualCid;
      if (file) {
        if (!address) throw new Error("Connectez votre wallet pour publier.");
        finalCid = await uploadToIPFS(file, address, signMessageAsync, (percent) => setUploadProgress(percent), { private: isPremium, chainId });
        setCid(finalCid);
      }
      
      setStatus('blockchain');
      const useBtc = isPremium && payWithBtc && !!btcToken;
      const royaltyBps = Math.round(Math.min(10, Math.max(0, Number(royalty) || 0)) * 100);
      writeContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: BeamUpABI,
        functionName: 'publishWork',
        args: [{
          ipfsCID: finalCid,
          title,
          category,
          isPremium,
          price: isPremium ? parseUnits(price || '0', useBtc ? btcToken.decimals : 18) : BigInt(0),
          paymentToken: useBtc ? btcToken.address : NATIVE_TOKEN,
          royaltyBps,
          maxSupply: BigInt(Math.max(0, Math.floor(Number(maxSupply) || 0))),
          metadataURI: '',
        }],
        value: (platformFee as bigint | undefined) ?? BigInt(0),
      });
    } catch (error: any) {
      console.error(error);
      setErrorMessage(error?.shortMessage || error?.message || "Erreur inconnue lors de la transaction ou de l'upload IPFS.");
      setStatus('error');
    }
  };

  const BeamEnergyBall = () => (
    <div className="relative w-24 h-48 flex items-center justify-center scale-75">
      <div className="absolute bottom-0 w-[1px] bg-[#00f2ff] h-full opacity-20 animate-pulse" />
      <div className="absolute bottom-0 w-8 h-8 bg-[#00f2ff] rounded-full blur-[10px] animate-beam-up opacity-80" />
      <div className="absolute bottom-0 w-4 h-4 bg-white rounded-full blur-[2px] animate-beam-up" />
    </div>
  );

  return (
    <div className='min-h-screen bg-[#020202] text-white'>
      <style jsx global>{`
        @keyframes beam-up {
          0% { transform: translateY(0) scale(0.8); opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { transform: translateY(-150px) scale(1.2); opacity: 0; }
        }
        .animate-beam-up { animation: beam-up 2s infinite cubic-bezier(0.4, 0, 0.2, 1); }
      `}</style>

      <Navigation />

      <main className='max-w-4xl mx-auto px-4 py-12 md:py-20'>
        <div className='cyber-glass p-6 md:p-12 rounded-3xl md:rounded-[48px] border border-white/10 relative overflow-hidden'>
          {(status === 'uploading' || status === 'blockchain' || isConfirming) && (
            <div className='absolute inset-0 bg-black/90 backdrop-blur-xl z-50 flex flex-col items-center justify-center text-center p-6'>
              <BeamEnergyBall />
              <h4 className='text-[#00f2ff] text-lg md:text-xl font-black uppercase tracking-[0.2em] mt-8'>
                {status === 'uploading' ? (uploadProgress === 0 ? 'Signez dans votre wallet...' : `Envoi en cours... ${uploadProgress}%`) : isConfirming ? 'Confirmation...' : 'Transmission...'}
              </h4>
              
              {status === 'uploading' && (
                <div className='w-full max-w-sm mt-4 bg-white/5 rounded-full h-2 overflow-hidden border border-white/10'>
                  <div className='h-full bg-gradient-to-r from-[#00f2ff] to-[#bc13fe] transition-all duration-300' style={{ width: `${uploadProgress}%` }} />
                </div>
              )}

              <p className='text-[8px] text-gray-500 mt-4 font-mono uppercase'>Votre œuvre part sur IPFS puis on-chain</p>
            </div>
          )}

          <div className='flex items-center gap-4 mb-8 md:mb-12'>
            <div className='p-2 md:p-3 bg-[#bc13fe]/10 rounded-xl md:rounded-2xl'><PlusCircle className='w-6 h-6 md:w-8 md:h-8 text-[#bc13fe]' /></div>
            <div>
              <h2 className='text-2xl md:text-3xl font-black uppercase tracking-tight'>Studio de Diffusion</h2>
              <p className='text-gray-500 text-[10px] md:text-xs uppercase tracking-widest'>Publié on-chain sur {chainName}</p>
            </div>
          </div>

          {!isConnected ? (
            <div className='py-16 md:py-20 text-center border-2 border-dashed border-white/5 rounded-3xl md:rounded-[32px]'>
              <ShieldCheck className='w-12 h-12 md:w-16 md:h-16 mx-auto mb-6 text-gray-700' />
              <p className='text-gray-500 text-xs md:text-sm uppercase tracking-widest font-black'>Connectez votre Wallet pour diffuser</p>
              <p className='text-gray-500 text-xs mt-3 mb-8 max-w-sm mx-auto'>Votre wallet sert d'identité de créateur : c'est là que vous recevrez 95 % de vos revenus.</p>
              <div className='flex justify-center mb-10'><ConnectKitButton /></div>
              <div className='flex flex-wrap justify-center gap-2 px-4'>
                {FORMATS.map(fmt => {
                  const Icon = fmt.icon;
                  return (
                    <span key={fmt.id} className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-wider text-gray-300'>
                      <Icon className='w-3.5 h-3.5' style={{ color: fmt.hex }} /> {fmt.label}
                    </span>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className='flex flex-col md:grid md:grid-cols-2 gap-8 md:gap-12'>
              <div 
                onClick={() => !file && fileInputRef.current?.click()}
                className={`aspect-square md:aspect-auto md:h-full min-h-[250px] rounded-2xl md:rounded-[32px] border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center p-6 ${file ? 'border-[#bc13fe]/40 bg-[#bc13fe]/5' : 'border-white/10 hover:border-[#00f2ff]/40'}`}
              >
                <input type='file' accept={getFormat(category).accept} ref={fileInputRef} onChange={(e) => { if (e.target.files?.[0]) { setFile(e.target.files[0]); setPreviewUrl(URL.createObjectURL(e.target.files[0])); } }} hidden />
                {previewUrl ? (
                  <div className='w-full h-full flex flex-col items-center justify-center relative'>
                     {(() => { const F = getFormat(category); const Icon = F.icon; return <Icon className='w-16 h-16 mb-4' style={{ color: F.hex }} />; })()}
                     <span className='text-[10px] font-bold truncate max-w-full'>{file?.name}</span>
                     <button onClick={(e) => { e.stopPropagation(); setFile(null); setPreviewUrl(null); }} className='absolute -top-2 -right-2 p-2 bg-red-500 text-white rounded-full shadow-lg'><X className='w-4 h-4' /></button>
                  </div>
                ) : (
                  <><Upload className='w-10 h-10 text-gray-500 mb-4' /><p className='text-[10px] uppercase font-black text-gray-500 tracking-widest'>Déposer votre {getFormat(category).label.toLowerCase()}</p></>
                )}
                {!file && (
                  <div className='flex items-center gap-4 mt-4 relative'>
                    <div className='absolute inset-0 bg-gradient-to-r from-[#00f2ff]/20 to-[#bc13fe]/20 blur-xl opacity-50 z-0'/>
                    <input 
                      value={manualCid} 
                      onChange={(e) => setManualCid(e.target.value)} 
                      className='w-full bg-black/60 border border-[#00f2ff]/40 p-4 rounded-xl relative z-10 focus:ring-1 focus:ring-[#bc13fe] outline-none font-mono text-xs text-[#00f2ff] placeholder-gray-600' 
                      placeholder='Ou coller un CID IPFS (ex: QmfKdW...)' 
                    />
                  </div>
                )}
              </div>

              <div className='space-y-6 md:space-y-8'>
                <div className='space-y-2'>
                  <label className='text-[9px] md:text-[10px] uppercase font-black text-gray-500 tracking-widest'>Titre de l'œuvre</label>
                  <input value={title} onChange={(e) => setTitle(e.target.value)} className='w-full bg-white/5 border border-white/10 p-4 md:p-5 rounded-xl md:rounded-2xl focus:ring-1 focus:ring-[#00f2ff] outline-none font-bold text-sm md:text-base' placeholder='Ex: Quantum Horizon' maxLength={120} />
                </div>

                <div className='space-y-2'>
                  <label className='text-[9px] md:text-[10px] uppercase font-black text-gray-500 tracking-widest'>Format de l'œuvre</label>
                  <div className='grid grid-cols-2 sm:grid-cols-3 gap-2'>
                    {FORMATS.map(fmt => {
                      const Icon = fmt.icon;
                      const active = category === fmt.id;
                      return (
                        <button
                          key={fmt.id}
                          type='button'
                          onClick={() => { setCategory(fmt.id); setFile(null); setPreviewUrl(null); }}
                          className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border transition-all ${active ? 'bg-white/10' : 'bg-white/5 border-white/10 text-gray-500 hover:border-white/20'}`}
                          style={active ? { borderColor: fmt.hex, boxShadow: `0 0 18px ${fmt.glow}` } : undefined}
                        >
                          <Icon className='w-5 h-5' style={{ color: active ? fmt.hex : undefined }} />
                          <span className={`text-[9px] font-black uppercase tracking-wider text-center leading-tight ${active ? 'text-white' : ''}`}>{fmt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  <p className='text-[10px] text-gray-500'>{getFormat(category).tagline}</p>
                </div>

                <div className='space-y-4 pt-4 border-t border-white/5'>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-3'>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${isPremium ? 'bg-amber-500/20 border-amber-500/40 text-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.2)]' : 'bg-white/5 border-white/10 text-gray-500'}`}>
                        <Sparkles className='w-5 h-5' />
                      </div>
                      <div>
                        <p className='text-[10px] font-black uppercase tracking-widest'>Option Premium</p>
                        <p className='text-[8px] text-gray-600 uppercase font-mono'>Les fans paient pour lire, écouter ou regarder</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setIsPremium(!isPremium)}
                      className={`w-12 h-6 rounded-full relative transition-all duration-500 ${isPremium ? 'bg-amber-500' : 'bg-gray-800'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-500 ${isPremium ? 'left-7' : 'left-1'}`} />
                    </button>
                  </div>

                  {isPremium && (
                    <div className='animate-in slide-in-from-top-2 duration-300'>
                      {btcToken && (
                        <div className='grid grid-cols-2 gap-2 mb-3'>
                          {[{ btc: false, label: currencySymbol }, { btc: true, label: `${btcToken.symbol} (bitcoin)` }].map(o => (
                            <button key={o.label} type='button' onClick={() => setPayWithBtc(o.btc)} className={`py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all ${payWithBtc === o.btc ? 'bg-amber-500 text-black border-amber-500' : 'bg-white/5 border-white/10 text-gray-400'}`}>{o.label}</button>
                          ))}
                        </div>
                      )}
                      <label className='text-[9px] uppercase font-black text-amber-500/60 tracking-widest mb-2 block'>Prix du NFT d'accès ({payWithBtc && btcToken ? btcToken.symbol : currencySymbol})</label>
                      <div className='relative'>
                        <input 
                          type='number' 
                          step='0.001'
                          value={price} 
                          onChange={(e) => setPrice(e.target.value)} 
                          className='w-full bg-amber-500/5 border border-amber-500/20 p-4 rounded-xl focus:ring-1 focus:ring-amber-500 outline-none font-bold text-sm text-amber-500 placeholder-amber-900/40' 
                          placeholder='0.1' 
                        />
                        <span className='absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-amber-500/40'>{payWithBtc && btcToken ? btcToken.symbol : currencySymbol}</span>
                      </div>
                      <div className='grid grid-cols-2 gap-3 mt-3'>
                        <label className='block'>
                          <span className='text-[9px] uppercase font-black text-amber-500/60 tracking-widest mb-2 block'>Royalties revente (%)</span>
                          <input type='number' min='0' max='10' step='0.5' value={royalty} onChange={(e) => setRoyalty(e.target.value)} className='w-full bg-amber-500/5 border border-amber-500/20 p-3 rounded-xl outline-none font-bold text-sm text-amber-500' />
                        </label>
                        <label className='block'>
                          <span className='text-[9px] uppercase font-black text-amber-500/60 tracking-widest mb-2 block'>Édition limitée</span>
                          <input type='number' min='0' step='1' value={maxSupply} onChange={(e) => setMaxSupply(e.target.value)} placeholder='Illimitée' className='w-full bg-amber-500/5 border border-amber-500/20 p-3 rounded-xl outline-none font-bold text-sm text-amber-500 placeholder-amber-900/50' />
                        </label>
                      </div>
                      <p className='text-[9px] text-gray-500 mt-2 leading-relaxed'>
                        Chaque fan reçoit un NFT d&apos;accès, revendable ; vous touchez les royalties (10 % max) à chaque revente. Le fichier est stocké en privé : seuls les détenteurs du NFT (et vous) peuvent l&apos;ouvrir.
                      </p>
                    </div>
                  )}
                </div>

                <div className='flex items-start gap-3 p-4 rounded-xl bg-[#00f2ff]/5 border border-[#00f2ff]/15'>
                  <Coins className='w-4 h-4 text-[#00f2ff] mt-0.5 flex-shrink-0' />
                  <p className='text-[10px] text-gray-300 leading-relaxed'>
                    Vous recevez <span className='text-white font-black'>95 %</span> de chaque pourboire et de chaque achat, directement dans votre wallet, sans délai de paiement.
                  </p>
                </div>

                <button onClick={handlePublish} disabled={(!file && !manualCid) || !title || status === 'uploading'} className='w-full py-5 md:py-6 bg-gradient-to-r from-[#00f2ff] to-[#bc13fe] text-black font-black uppercase tracking-[0.2em] text-[10px] md:text-xs rounded-2xl md:rounded-[24px] hover:shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3 mt-4'>
                  <Rocket className='w-4 h-4 md:w-5 md:h-5' /> Diffuser ({feeLabel} {currencySymbol})
                </button>
              </div>
            </div>
          )}

          {isConfirmed && (
            <div className='mt-8 md:mt-12 bg-green-500/10 border border-green-500/20 p-5 md:p-6 rounded-2xl md:rounded-[32px] flex items-center gap-4 animate-bounce'>
              <CheckCircle2 className='w-6 h-6 md:w-8 md:h-8 text-green-500 flex-shrink-0' />
              <div>
                <p className='text-xs md:text-sm font-black text-green-500 uppercase tracking-widest'>Diffusion confirmée !</p>
                <Link href="/" className='text-[9px] md:text-[10px] text-green-500/60 hover:text-green-500 underline uppercase font-bold'>Voir dans le flux</Link>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className='mt-8 md:mt-12 bg-red-500/10 border border-red-500/20 p-5 md:p-6 rounded-2xl md:rounded-[32px] flex items-center gap-4'>
              <X className='w-6 h-6 md:w-8 md:h-8 text-red-500 flex-shrink-0' />
              <div>
                <p className='text-xs md:text-sm font-black text-red-500 uppercase tracking-widest'>Échec de la diffusion</p>
                <p className='text-[10px] text-red-400 mt-1 font-mono break-all'>{errorMessage}</p>
                <button onClick={() => setStatus('idle')} className='mt-3 px-4 py-2 bg-red-500/20 text-red-300 text-[10px] rounded-lg font-bold uppercase'>Réessayer</button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
