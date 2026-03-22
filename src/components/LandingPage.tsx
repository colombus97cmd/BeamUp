'use client';
import { ConnectKitButton } from 'connectkit';
import { Rocket, Zap, Heart, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#020202] text-white overflow-x-hidden selection:bg-[#00f2ff] selection:text-black">
      {/* Background Effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#bc13fe] rounded-full blur-[150px] opacity-10 pointer-events-none" />
      <div className="absolute top-[20%] right-0 w-[400px] h-[400px] bg-[#00f2ff] rounded-full blur-[150px] opacity-10 pointer-events-none" />

      {/* HERO SECTION */}
      <section className="relative flex flex-col items-center justify-center pt-32 pb-20 px-4 text-center z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-md">
          <Sparkles className="w-4 h-4 text-[#00f2ff]" />
          <span className="text-xs font-black uppercase tracking-[0.2em] text-gray-300">La révolution Web3 est ici</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tighter max-w-4xl mx-auto leading-tight">
          Propulsez l'Art. <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00f2ff] to-[#bc13fe]">
            Soutenez les Créateurs en Temps Réel.
          </span>
        </h1>

        <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 font-medium">
          Découvrez des œuvres exclusives et rémunérez vos artistes préférés instantanément, sans intermédiaire. Une galerie où les fans financent directement l'art de demain.
        </p>

        <ConnectKitButton.Custom>
          {({ show }) => {
            return (
              <button 
                onClick={show} 
                className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 bg-white text-black font-black uppercase tracking-widest text-sm rounded-full overflow-hidden transition-transform hover:scale-105 active:scale-95"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-[#00f2ff] to-[#bc13fe] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <span className="relative z-10 flex items-center gap-2 group-hover:text-white transition-colors duration-300">
                  Lancer l'Application <ArrowRight className="w-4 h-4" />
                </span>
              </button>
            );
          }}
        </ConnectKitButton.Custom>
      </section>

      {/* VALUE PROPOSITION / POURQUOI BEAMUP */}
      <section className="relative z-10 py-20 px-4 md:px-10 max-w-6xl mx-auto">
        <div className="grid md:grid-cols-3 gap-6">
          
          {/* Card 1 */}
          <div className="bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-sm hover:bg-white/10 hover:border-[#00f2ff]/30 transition-all duration-300 group">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#bc13fe]/20 to-transparent flex items-center justify-center mb-6 border border-[#bc13fe]/30 group-hover:scale-110 transition-transform">
              <Zap className="w-6 h-6 text-[#bc13fe]" />
            </div>
            <h3 className="text-xl font-black uppercase mb-3">Revenus Immédiats</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Pour les artistes : Vos pourboires sont versés **instantanément** dans votre wallet grâce aux Smart Contracts. Fini les délais de paiement et les commissions abusives des plateformes Web2.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-sm hover:bg-white/10 hover:border-[#00f2ff]/30 transition-all duration-300 group">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#00f2ff]/20 to-transparent flex items-center justify-center mb-6 border border-[#00f2ff]/30 group-hover:scale-110 transition-transform">
              <Heart className="w-6 h-6 text-[#00f2ff]" />
            </div>
            <h3 className="text-xl font-black uppercase mb-3">Œuvres Exclusives</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Pour les fans : Accédez à une galerie d'art 100% sur la blockchain. Apportez votre soutien direct et forgez une relation privilégiée avec les créateurs que vous aimez vraiment.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-sm hover:bg-white/10 hover:border-white/30 transition-all duration-300 group">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-6 border border-white/20 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-black uppercase mb-3">100% Décentralisé</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Sécurité absolue. Personne ne peut censurer votre art ni bloquer vos fonds. BeamUp est un protocole open-source immuable, déployé pour l'éternité sur la Binance Smart Chain.
            </p>
          </div>

        </div>
      </section>

      {/* BOTTOM CTA */}
      <section className="relative z-10 py-24 px-4 text-center flex flex-col items-center">
        <h2 className="text-3xl font-black uppercase mb-6">Prêt à soutenir la création ?</h2>
        <ConnectKitButton.Custom>
          {({ show }) => {
            return (
              <button 
                onClick={show} 
                className="px-8 py-4 bg-transparent border border-white/20 hover:bg-white hover:text-black transition-colors font-black uppercase tracking-widest text-xs rounded-full"
              >
                Connecter son Wallet
              </button>
            );
          }}
        </ConnectKitButton.Custom>
      </section>
    </div>
  );
}
