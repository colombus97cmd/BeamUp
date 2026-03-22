'use client';
import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { X, Send, MessageSquare, User, Loader2, Sparkles, Zap, ShieldCheck } from 'lucide-react';
import BeamUpABI from '../contracts/BeamUp.json';

const CONTRACT_ADDRESS = '0x0CD69B6D6c439977A0265dcA7f5B347E1b705117';

interface CommentDrawerProps {
  workId: number;
  isOpen: boolean;
  onClose: () => void;
}

export default function CommentDrawer({ workId, isOpen, onClose }: CommentDrawerProps) {
  const { address } = useAccount();
  const [commentText, setCommentText] = useState('');
  
  const { data: comments, refetch } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: BeamUpABI,
    functionName: 'getWorkComments',
    args: [BigInt(workId)],
  });

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isConfirmed) {
      refetch();
      setCommentText('');
    }
  }, [isConfirmed, refetch]);

  const handleSendComment = () => {
    if (!commentText.trim()) return;
    writeContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: BeamUpABI,
      functionName: 'addComment',
      args: [BigInt(workId), commentText],
    });
  };

  const formatTimestamp = (ts: bigint) => {
    const date = new Date(Number(ts) * 1000);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diff < 60) return "À l'instant";
    if (diff < 3600) return `Il y a ${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)}h`;
    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-end md:items-center justify-center md:justify-end p-0 md:p-8 pointer-events-none">
      <style jsx>{`
        @keyframes beam-send {
          0% { transform: scaleX(0); opacity: 1; }
          100% { transform: scaleX(1); opacity: 0; }
        }
        .animate-beam-send {
          animation: beam-send 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
      `}</style>

      {/* Overlay mobile */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md pointer-events-auto md:hidden" onClick={onClose} />
      
      <div className="w-full md:w-[450px] h-[80vh] bg-[#050505] border-t md:border border-white/10 rounded-t-[40px] md:rounded-[48px] pointer-events-auto flex flex-col shadow-[0_-20px_100px_rgba(0,0,0,0.8)] animate-in slide-in-from-bottom duration-500 relative overflow-hidden">
        
        {/* Background Energy Glow */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#00f2ff]/10 blur-[100px] rounded-full pointer-events-none" />

        {/* Header */}
        <div className="p-8 border-b border-white/5 flex justify-between items-center relative z-10">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-[#00f2ff]/10 rounded-xl">
               <MessageSquare className="w-5 h-5 text-[#00f2ff]" />
            </div>
            <div>
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Flux de Pensées</h3>
              <p className="text-[7px] text-gray-500 uppercase font-mono">Archive Orbitale #{workId}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 bg-white/5 rounded-full hover:bg-white/10 transition-all active:scale-90"><X className="w-4 h-4" /></button>
        </div>

        {/* List of Comments */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar relative z-10">
          {(!comments || (comments as any[]).length === 0) ? (
            <div className="h-full flex flex-col items-center justify-center opacity-30 text-center">
              <Zap className="w-12 h-12 mb-4 text-[#bc13fe] animate-pulse" />
              <p className="text-[10px] uppercase font-black tracking-widest text-white">Fréquence Silencieuse</p>
              <p className="text-[8px] mt-2 font-mono text-gray-500">INITIEZ LA TRANSMISSION</p>
            </div>
          ) : (
            (comments as any[]).map((c, i) => (
              <div key={i} className="flex gap-5 group animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="relative">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#bc13fe]/10 to-[#00f2ff]/10 flex items-center justify-center border border-white/5 shrink-0 shadow-lg">
                    <User className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-[#050505]" />
                </div>
                <div className="space-y-2 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black text-[#00f2ff] uppercase tracking-tighter">@{c.author.slice(0,6)}...{c.author.slice(-4)}</p>
                    <span className="text-[8px] text-gray-600 font-mono uppercase">{formatTimestamp(c.timestamp)}</span>
                  </div>
                  <div className="bg-white/5 p-4 rounded-2xl rounded-tl-none border border-white/5 group-hover:border-white/10 transition-all">
                    <p className="text-xs text-gray-300 leading-relaxed font-medium">{c.text}</p>
                  </div>
                </div>
              </div>
            )).reverse()
          )}
        </div>

        {/* Input area */}
        <div className="p-8 bg-black/60 border-t border-white/5 relative z-10 backdrop-blur-2xl">
          {isConfirming && (
             <div className="absolute inset-x-0 top-0 h-1 bg-[#00f2ff] animate-beam-send origin-left" />
          )}

          <div className="relative group">
            <input 
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Diffuser votre pensée..."
              disabled={isPending || isConfirming}
              className="w-full bg-white/5 border border-white/10 p-5 pr-16 rounded-[24px] outline-none focus:border-[#00f2ff] transition-all text-xs font-bold placeholder:text-gray-700 shadow-inner"
              onKeyDown={(e) => e.key === 'Enter' && handleSendComment()}
            />
            <button 
              onClick={handleSendComment}
              disabled={isPending || isConfirming || !commentText.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-12 h-12 bg-gradient-to-tr from-[#00f2ff] to-[#bc13fe] text-black rounded-2xl hover:scale-105 active:scale-90 transition-all shadow-xl flex items-center justify-center disabled:grayscale disabled:opacity-30"
            >
              {isPending || isConfirming ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isConfirmed ? (
                <ShieldCheck className="w-5 h-5 animate-bounce" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
          <div className="flex items-center justify-between mt-4 px-2">
            <p className="text-[7px] text-gray-600 uppercase tracking-[0.4em] font-black">Protocole Proof-of-Talk</p>
            {isConfirmed && <span className="text-[7px] text-green-500 font-black uppercase animate-pulse">Confirmé</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
