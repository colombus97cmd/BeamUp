'use client';
import { useState, useEffect } from 'react';
import { Download, X, Smartphone, Monitor, Tablet } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Detect iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    // Listen for the beforeinstallprompt event (Chrome, Edge, Samsung Internet, etc.)
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show the install banner after a short delay for better UX
      setTimeout(() => setShowPrompt(true), 3000);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // If iOS and not installed, show the iOS guide after a delay
    if (isIOSDevice) {
      const dismissed = localStorage.getItem('beamup-pwa-dismissed');
      if (!dismissed) {
        setTimeout(() => setShowPrompt(true), 5000);
      }
    }

    // Listen for successful install
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }

    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setShowIOSGuide(false);
    localStorage.setItem('beamup-pwa-dismissed', Date.now().toString());
  };

  // Don't render if already installed or no prompt available (and not iOS)
  if (isInstalled || (!showPrompt && !showIOSGuide)) return null;

  // iOS Safari guide modal
  if (showIOSGuide) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-end justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
        <div className="w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-3xl p-6 mb-4 shadow-2xl shadow-[#00f2ff]/10 animate-slideUp">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-black uppercase tracking-wider text-white">
              Installer BeamUp
            </h3>
            <button onClick={handleDismiss} className="p-2 rounded-full hover:bg-white/10 transition-colors">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          <div className="space-y-4 text-sm text-gray-300">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[#00f2ff]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-[#00f2ff] font-black text-xs">1</span>
              </div>
              <p>Appuyez sur le bouton <strong className="text-white">Partager</strong> <span className="inline-block w-5 h-5 align-middle">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#00f2ff]">
                  <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"/>
                </svg>
              </span> en bas de Safari</p>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[#bc13fe]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-[#bc13fe] font-black text-xs">2</span>
              </div>
              <p>Faites défiler et sélectionnez <strong className="text-white">&quot;Sur l&apos;écran d&apos;accueil&quot;</strong></p>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-green-400 font-black text-xs">3</span>
              </div>
              <p>Appuyez sur <strong className="text-white">&quot;Ajouter&quot;</strong> pour installer</p>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="w-full mt-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-xs font-bold uppercase tracking-widest text-gray-400 hover:bg-white/10 transition-colors"
          >
            J&apos;ai compris
          </button>
        </div>

        <style jsx>{`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slideUp {
            from { transform: translateY(100px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
          .animate-slideUp { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
        `}</style>
      </div>
    );
  }

  // Standard install banner (Chrome, Edge, etc.)
  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[9999] w-[calc(100%-2rem)] max-w-md animate-slideUp">
      <div className="relative bg-[#0a0a0a]/95 backdrop-blur-2xl border border-white/10 rounded-3xl p-5 shadow-2xl shadow-[#00f2ff]/5">
        {/* Glow accent */}
        <div className="absolute -top-px left-8 right-8 h-[1px] bg-gradient-to-r from-transparent via-[#00f2ff] to-transparent" />
        
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#00f2ff]/20 to-[#bc13fe]/20 border border-white/10 flex items-center justify-center flex-shrink-0">
            <Download className="w-6 h-6 text-[#00f2ff]" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-black uppercase tracking-wider text-white mb-1">
              Installer BeamUp
            </h3>
            <p className="text-[11px] text-gray-500 leading-relaxed mb-3">
              Accédez à BeamUp directement depuis votre écran d&apos;accueil — comme une app native.
            </p>

            {/* Device icons */}
            <div className="flex items-center gap-2 mb-3">
              <Smartphone className="w-3.5 h-3.5 text-gray-600" />
              <Tablet className="w-3.5 h-3.5 text-gray-600" />
              <Monitor className="w-3.5 h-3.5 text-gray-600" />
              <span className="text-[9px] text-gray-600 uppercase tracking-widest">Mobile • Tablette • PC</span>
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleInstall}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#00f2ff] to-[#bc13fe] text-black text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-opacity active:scale-[0.98]"
              >
                Installer
              </button>
              <button
                onClick={handleDismiss}
                className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideUp {
          from { transform: translate(-50%, 100px); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
        .animate-slideUp { animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
      `}</style>
    </div>
  );
}
