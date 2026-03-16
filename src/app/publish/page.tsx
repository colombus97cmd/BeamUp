'use client';
import { useState, useRef } from 'react';
import { ConnectKitButton } from 'connectkit';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import { Rocket, Upload, PlusCircle, FileText, Music, Video, X, Loader2, CheckCircle2, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import Navigation from '../../components/Navigation';
import { uploadToIPFS } from '../../services/pinata';
import BeamUpABI from '../../contracts/BeamUp.json';

const CONTRACT_ADDRESS = '0x66e45A936564B364e92bD6436Fc2D4B1934aCbCf';

export default function Publish() {
  const { isConnected } = useAccount();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Musique');
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'blockchain' | 'success' | 'error'>('idle');
  const [cid, setCid] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { writeContract, data: hash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  const handlePublish = async () => {
    if (!file || !title) return;
    setStatus('uploading');
    try {
      const resultCid = await uploadToIPFS(file);
      setCid(resultCid);
      setStatus('blockchain');
      writeContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: BeamUpABI,
        functionName: 'publishWork',
        args: [resultCid, title, category],
        value: parseEther('0.0001'),
      });
    } catch (error) {
      console.error(error);
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
              <h4 className='text-[#00f2ff] text-lg md:text-xl font-black uppercase tracking-[0.2em] mt-8'>{isConfirming ? 'Confirmation...' : 'Transmission...'}</h4>
              <p className='text-[8px] text-gray-500 mt-2 font-mono uppercase'>L'œuvre quitte le système centralisé</p>
            </div>
          )}

          <div className='flex items-center gap-4 mb-8 md:mb-12'>
            <div className='p-2 md:p-3 bg-[#bc13fe]/10 rounded-xl md:rounded-2xl'><PlusCircle className='w-6 h-6 md:w-8 md:h-8 text-[#bc13fe]' /></div>
            <div>
              <h2 className='text-2xl md:text-3xl font-black uppercase tracking-tight'>Studio de Diffusion</h2>
              <p className='text-gray-500 text-[10px] md:text-xs uppercase tracking-widest'>Immortalisé sur la BNB Chain</p>
            </div>
          </div>

          {!isConnected ? (
            <div className='py-16 md:py-20 text-center border-2 border-dashed border-white/5 rounded-3xl md:rounded-[32px]'>
              <ShieldCheck className='w-12 h-12 md:w-16 md:h-16 mx-auto mb-6 text-gray-700' />
              <p className='text-gray-500 text-xs md:text-sm uppercase tracking-widest font-black'>Connectez votre Wallet pour diffuser</p>
            </div>
          ) : (
            <div className='flex flex-col md:grid md:grid-cols-2 gap-8 md:gap-12'>
              <div 
                onClick={() => !file && fileInputRef.current?.click()}
                className={`aspect-square md:aspect-auto md:h-full min-h-[250px] rounded-2xl md:rounded-[32px] border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center p-6 ${file ? 'border-[#bc13fe]/40 bg-[#bc13fe]/5' : 'border-white/10 hover:border-[#00f2ff]/40'}`}
              >
                <input type='file' ref={fileInputRef} onChange={(e) => { if (e.target.files?.[0]) { setFile(e.target.files[0]); setPreviewUrl(URL.createObjectURL(e.target.files[0])); } }} hidden />
                {previewUrl ? (
                  <div className='w-full h-full flex flex-col items-center justify-center relative'>
                     {category === 'Musique' && <Music className='w-16 h-16 mb-4 text-[#bc13fe]' />}
                     {category === 'Vidéo' && <Video className='w-16 h-16 mb-4 text-[#00f2ff]' />}
                     {category === 'BD Numérique' && <FileText className='w-16 h-16 mb-4 text-[#ffd700]' />}
                     <span className='text-[10px] font-bold truncate max-w-full'>{file?.name}</span>
                     <button onClick={(e) => { e.stopPropagation(); setFile(null); setPreviewUrl(null); }} className='absolute -top-2 -right-2 p-2 bg-red-500 text-white rounded-full shadow-lg'><X className='w-4 h-4' /></button>
                  </div>
                ) : (
                  <><Upload className='w-10 h-10 text-gray-500 mb-4' /><p className='text-[10px] uppercase font-black text-gray-500 tracking-widest'>Déposer Média</p></>
                )}
              </div>

              <div className='space-y-6 md:space-y-8'>
                <div className='space-y-2'>
                  <label className='text-[9px] md:text-[10px] uppercase font-black text-gray-500 tracking-widest'>Titre de l'œuvre</label>
                  <input value={title} onChange={(e) => setTitle(e.target.value)} className='w-full bg-white/5 border border-white/10 p-4 md:p-5 rounded-xl md:rounded-2xl focus:ring-1 focus:ring-[#00f2ff] outline-none font-bold text-sm md:text-base' placeholder='Ex: Quantum Horizon' />
                </div>

                <div className='space-y-2'>
                  <label className='text-[9px] md:text-[10px] uppercase font-black text-gray-500 tracking-widest'>Catégorie Média</label>
                  <div className='grid grid-cols-3 md:grid-cols-1 gap-2'>
                    {['Musique', 'Vidéo', 'BD Numérique'].map(cat => (
                      <button key={cat} onClick={() => setCategory(cat)} className={`py-3 md:py-4 text-[8px] md:text-[10px] font-black uppercase rounded-xl border transition-all ${category === cat ? 'bg-white text-black border-white' : 'bg-white/5 border-white/10 text-gray-500 hover:border-white/20'}`}>{cat.split(' ')[0]}</button>
                    ))}
                  </div>
                </div>

                <button onClick={handlePublish} disabled={!file || !title || status === 'uploading'} className='w-full py-5 md:py-6 bg-gradient-to-r from-[#00f2ff] to-[#bc13fe] text-black font-black uppercase tracking-[0.2em] text-[10px] md:text-xs rounded-2xl md:rounded-[24px] hover:shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3 mt-4'>
                  <Rocket className='w-4 h-4 md:w-5 md:h-5' /> Diffuser (0.0001 BNB)
                </button>
              </div>
            </div>
          )}

          {isConfirmed && (
            <div className='mt-8 md:mt-12 bg-green-500/10 border border-green-500/20 p-5 md:p-6 rounded-2xl md:rounded-[32px] flex items-center gap-4 animate-bounce'>
              <CheckCircle2 className='w-6 h-6 md:w-8 md:h-8 text-green-500 flex-shrink-0' />
              <div>
                <p className='text-xs md:text-sm font-black text-green-500 uppercase tracking-widest'>Diffusion Confirmée !</p>
                <Link href="/" className='text-[9px] md:text-[10px] text-green-500/60 hover:text-green-500 underline uppercase font-bold'>Voir dans le flux</Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
