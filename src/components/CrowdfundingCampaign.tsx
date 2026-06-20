'use client';
import { useState } from 'react';
import { useAccount, useSendTransaction, useChainId } from 'wagmi';
import { parseEther } from 'viem';
import { Rocket, Heart, Sparkles, ChevronRight, ShieldCheck, HelpCircle, Layers, Leaf, Hammer, Cpu, Check, AlertCircle } from 'lucide-react';
import { ConnectKitButton } from 'connectkit';

export default function CrowdfundingCampaign() {
  const { isConnected, address } = useAccount();
  const chainId = useChainId();
  const { sendTransaction, isPending } = useSendTransaction();
  
  const [selectedTier, setSelectedTier] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [web3Status, setWeb3Status] = useState<'idle' | 'success' | 'error'>('idle');

  const [campaignStats, setCampaignStats] = useState<{ totalRaised: number; contributorsCount: number; donatedAddresses: string[] }>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('beam_campaign_stats_v2');
      return saved ? JSON.parse(saved) : { totalRaised: 0, contributorsCount: 0, donatedAddresses: [] };
    }
    return { totalRaised: 0, contributorsCount: 0, donatedAddresses: [] };
  });

  const getExchangeRate = (symbol: string) => {
    if (symbol === 'BNB') return 550;
    if (symbol === 'POL') return 0.65;
    if (symbol === 'ELA') return 2.5;
    if (symbol === 'ETH') return 3000;
    return 1;
  };

  const targetDate = new Date('2026-07-31T00:00:00Z');
  const currentDate = new Date();
  const diffTime = targetDate.getTime() - currentDate.getTime();
  const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  const progressPercent = Math.min(100, Math.round((campaignStats.totalRaised / 85000) * 100));

  // Multi-chain config for donations
  const CHAIN_INFO: Record<number, { name: string; symbol: string; min: string; recipient: `0x${string}` }> = {
    56: { name: 'BSC Mainnet', symbol: 'BNB', min: '0.01', recipient: '0x493FEf1Dbd3989A5bb8b467Ef0a787669053F0B5' },
    20: { name: 'Elastos ESC', symbol: 'ELA', min: '1.0', recipient: '0x493FEf1Dbd3989A5bb8b467Ef0a787669053F0B5' },
    137: { name: 'Polygon', symbol: 'POL', min: '5.0', recipient: '0x493FEf1Dbd3989A5bb8b467Ef0a787669053F0B5' },
    42161: { name: 'Arbitrum', symbol: 'ETH', min: '0.001', recipient: '0x493FEf1Dbd3989A5bb8b467Ef0a787669053F0B5' },
  };

  const activeChain = CHAIN_INFO[chainId] || CHAIN_INFO[56]; // fallback to BSC

  const pledgeTiers = [
    {
      id: 1,
      name: "Disciple d'Afridi",
      priceEuro: 10,
      cryptoEquivalent: activeChain.symbol === 'BNB' ? '0.018 BNB' : activeChain.symbol === 'ELA' ? '4 ELA' : activeChain.symbol === 'POL' ? '15 POL' : '0.003 ETH',
      cryptoValue: activeChain.symbol === 'BNB' ? '0.018' : activeChain.symbol === 'ELA' ? '4' : activeChain.symbol === 'POL' ? '15' : '0.003',
      description: "Accès numérique anticipé au Tome 1 du Webtoon 'The Long Way Of...' sur la DApp Beam Up + un rôle Discord exclusif 'Ash Land' pour participer aux votes du lore.",
      items: ["Accès Webtoon anticipé", "Rôle Discord Exclusif", "Nom dans les crédits de l'œuvre"],
      badge: "Digital"
    },
    {
      id: 2,
      name: "Lecteur d'Ash Land",
      priceEuro: 30,
      cryptoEquivalent: activeChain.symbol === 'BNB' ? '0.055 BNB' : activeChain.symbol === 'ELA' ? '12 ELA' : activeChain.symbol === 'POL' ? '45 POL' : '0.009 ETH',
      cryptoValue: activeChain.symbol === 'BNB' ? '0.055' : activeChain.symbol === 'ELA' ? '12' : activeChain.symbol === 'POL' ? '45' : '0.009',
      description: "La version physique exclusive du Tome 1 du Webtoon imprimé sur du papier recyclé labellisé, livré dans un emballage biodégradable en fibre de coco conçu localement par le FabLab.",
      items: ["Version physique du Tome 1", "Packaging éco-conçu en coco", "Tous les avantages du Tiers 1"],
      badge: "Physique Eco-conçu"
    },
    {
      id: 3,
      name: "Gardien du Souffle",
      priceEuro: 75,
      cryptoEquivalent: activeChain.symbol === 'BNB' ? '0.14 BNB' : activeChain.symbol === 'ELA' ? '30 ELA' : activeChain.symbol === 'POL' ? '110 POL' : '0.022 ETH',
      cryptoValue: activeChain.symbol === 'BNB' ? '0.14' : activeChain.symbol === 'ELA' ? '30' : activeChain.symbol === 'POL' ? '110' : '0.022',
      description: "Une figurine d'art exclusive de Hyrio ou d'Amira (7cm) fabriquée en Guadeloupe par notre FabLab en impression 3D végétale à base de fibre de coco brute recyclée. Comprend également un NFT d'accès Premium.",
      items: ["Figurine 3D coco végétale", "NFT d'accès Premium Beam Up", "Tous les avantages précédents"],
      badge: "Art & Web3",
      popular: true
    },
    {
      id: 4,
      name: "Bâtisseur d'Utopia",
      priceEuro: 250,
      cryptoEquivalent: activeChain.symbol === 'BNB' ? '0.45 BNB' : activeChain.symbol === 'ELA' ? '100 ELA' : activeChain.symbol === 'POL' ? '360 POL' : '0.075 ETH',
      cryptoValue: activeChain.symbol === 'BNB' ? '0.45' : activeChain.symbol === 'ELA' ? '100' : activeChain.symbol === 'POL' ? '360' : '0.075',
      description: "Gravez votre nom dans l'histoire. Votre visage ou avatar sera dessiné et intégré comme personnage secondaire ou figurant dans une planche clé de l'année 2238. Livré avec un certificat physique gravé sur bois.",
      items: ["Intégration dans le Webtoon", "Certificat en bois gravé", "Visite virtuelle de la Ferme", "Tous les avantages précédents"],
      badge: "Prestige Lore"
    }
  ];

  const handleBlockchainDonation = () => {
    if (!isConnected) return;
    
    let amount = customAmount;
    if (selectedTier !== null) {
      const tier = pledgeTiers.find(t => t.id === selectedTier);
      if (tier) amount = tier.cryptoValue;
    }

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      alert("Veuillez spécifier un montant valide.");
      return;
    }

    try {
      sendTransaction({
        to: activeChain.recipient,
        value: parseEther(amount),
      }, {
        onSuccess: () => {
          setWeb3Status('success');
          
          let donationEuro = 0;
          if (selectedTier !== null) {
            const tier = pledgeTiers.find(t => t.id === selectedTier);
            if (tier) donationEuro = tier.priceEuro;
          } else {
            donationEuro = Math.round(Number(amount) * getExchangeRate(activeChain.symbol));
          }

          setCampaignStats(prev => {
            const isNewContributor = !prev.donatedAddresses.includes(address || '');
            const updatedAddresses = isNewContributor && address ? [...prev.donatedAddresses, address] : prev.donatedAddresses;
            const updatedStats = {
              totalRaised: prev.totalRaised + donationEuro,
              contributorsCount: prev.contributorsCount + (isNewContributor ? 1 : 0),
              donatedAddresses: updatedAddresses
            };
            localStorage.setItem('beam_campaign_stats_v2', JSON.stringify(updatedStats));
            return updatedStats;
          });

          setTimeout(() => setWeb3Status('idle'), 5000);
        },
        onError: (err) => {
          console.error(err);
          setWeb3Status('error');
          setTimeout(() => setWeb3Status('idle'), 5000);
        }
      });
    } catch (err) {
      console.error(err);
      setWeb3Status('error');
    }
  };

  return (
    <div className="min-h-screen bg-[#020202] text-white selection:bg-[#00f2ff] selection:text-black pb-32 pt-20 px-4 md:px-10 overflow-y-auto">
      {/* Background radial effects */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-[#bc13fe] rounded-full blur-[180px] opacity-10 pointer-events-none" />
      <div className="absolute top-1/2 right-1/4 w-[600px] h-[600px] bg-[#00f2ff] rounded-full blur-[180px] opacity-10 pointer-events-none" />

      {/* Campaign Header */}
      <section className="relative z-10 max-w-6xl mx-auto text-center mb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 mb-6 backdrop-blur-md">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span className="text-xs font-black uppercase tracking-[0.2em] text-amber-400">Projet Hybride : Art & Écologie</span>
        </div>

        <h1 className="text-4xl md:text-7xl font-black mb-6 tracking-tighter leading-none uppercase">
          Umoja : Le Verbe, <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00f2ff] to-[#bc13fe]">
            La Chair et La Terre
          </span>
        </h1>

        <p className="text-gray-400 text-lg md:text-xl max-w-3xl mx-auto leading-relaxed font-medium">
          Soutenez la production de la bible artistique de l'univers <strong>"The Long Way Of..."</strong> et financez l'équipement physique du <strong>FabLab d'impression végétale</strong> en Guadeloupe pour façonner un nouveau modèle de vie local.
        </p>
      </section>

      {/* Project Status Board */}
      <section className="relative z-10 max-w-6xl mx-auto grid md:grid-cols-3 gap-8 bg-white/5 border border-white/10 p-8 md:p-12 rounded-[36px] backdrop-blur-md mb-20 shadow-2xl">
        <div className="md:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#00f2ff] font-black">Progression de la Campagne</span>
              <span className="text-xs text-amber-500 font-bold uppercase tracking-wider">Objectif Global : 85 000 €</span>
            </div>
            
            {/* Multi-layered progress bar */}
            <div className="h-4 w-full bg-white/5 rounded-full overflow-hidden relative mb-6">
              <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#bc13fe] to-[#00f2ff] rounded-full" style={{ width: `${progressPercent}%` }} />
            </div>

            <div className="grid grid-cols-3 gap-4 text-left mb-8">
              <div>
                <h3 className="text-3xl md:text-5xl font-black tracking-tight text-white">{campaignStats.totalRaised.toLocaleString()} €</h3>
                <p className="text-[8px] uppercase tracking-widest text-gray-500 font-bold mt-1">Engagés ({progressPercent}%)</p>
              </div>
              <div>
                <h3 className="text-3xl md:text-5xl font-black tracking-tight text-white">{campaignStats.contributorsCount}</h3>
                <p className="text-[8px] uppercase tracking-widest text-gray-500 font-bold mt-1">Contributeurs</p>
              </div>
              <div>
                <h3 className="text-3xl md:text-5xl font-black tracking-tight text-[#00f2ff]">{daysRemaining}</h3>
                <p className="text-[8px] uppercase tracking-widest text-gray-500 font-bold mt-1">Jours restants</p>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 pt-6">
            <h4 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#bc13fe]" /> Allocation du Budget de la Campagne :
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                <p className="text-[9px] uppercase tracking-widest text-gray-400 font-bold mb-1">Production Art & Webtoon</p>
                <p className="text-lg font-black text-[#bc13fe]">40 000 € <span className="text-xs font-medium text-gray-500">(47%)</span></p>
                <p className="text-[9px] text-gray-500 mt-1">Rémunération des artistes, écriture, pilote d'animation et licences.</p>
              </div>
              <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                <p className="text-[9px] uppercase tracking-widest text-gray-400 font-bold mb-1">FabLab & Innovation Agricole</p>
                <p className="text-lg font-black text-[#00f2ff]">45 000 € <span className="text-xs font-medium text-gray-500">(53%)</span></p>
                <p className="text-[9px] text-gray-500 mt-1">Imprimantes 3D végétales, extraction de fibre de coco et cultures verticales.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Web3 Direct Support Widget */}
        <div className="bg-white/5 border border-white/10 p-6 md:p-8 rounded-3xl flex flex-col justify-between backdrop-blur-lg">
          <div>
            <h3 className="text-lg font-black uppercase tracking-tight mb-2 flex items-center gap-2">
              <Rocket className="w-5 h-5 text-amber-500" /> Soutien Web3 Direct
            </h3>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest leading-relaxed mb-6">
              Soutiens ce projet directement avec la Blockchain. Choisis ton réseau connecté via ton Wallet (BSC, Elastos, Polygon ou Arbitrum) et envoie ton don.
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-2">
                  Réseau Actuel Détecté
                </label>
                <div className="bg-white/5 px-4 py-3 rounded-2xl border border-white/10 flex items-center justify-between">
                  <span className="text-xs font-bold">{activeChain.name}</span>
                  <span className="text-xs font-black px-2 py-0.5 rounded bg-[#00f2ff]/20 text-[#00f2ff]">{activeChain.symbol}</span>
                </div>
              </div>

              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-2">
                  Montant personnalisé du Don ({activeChain.symbol})
                </label>
                <input
                  type="text"
                  placeholder={`Min: ${activeChain.min} ${activeChain.symbol}`}
                  value={customAmount}
                  onChange={(e) => {
                    setSelectedTier(null);
                    setCustomAmount(e.target.value);
                  }}
                  className="w-full bg-black/60 border border-white/10 px-4 py-3 rounded-2xl text-white text-sm font-mono focus:outline-none focus:border-[#00f2ff]"
                />
              </div>
            </div>
          </div>

          <div className="mt-8 space-y-4">
            {!isConnected ? (
              <ConnectKitButton.Custom>
                {({ show }) => (
                  <button
                    onClick={show}
                    className="w-full py-4 bg-white text-black font-black uppercase tracking-widest text-xs rounded-2xl hover:scale-105 active:scale-95 transition-transform"
                  >
                    Connecter ton Wallet
                  </button>
                )}
              </ConnectKitButton.Custom>
            ) : (
              <button
                onClick={handleBlockchainDonation}
                disabled={isPending}
                className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-700 text-black font-black uppercase tracking-widest text-xs rounded-2xl hover:scale-105 active:scale-95 transition-transform flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isPending ? "Transaction en cours..." : `Faire un Don (${selectedTier !== null ? 'Palier sélectionné' : 'Montant libre'})`}
              </button>
            )}

            {/* Web3 status messages */}
            {web3Status === 'success' && (
              <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 text-[10px] uppercase font-black tracking-wider justify-center">
                <Check className="w-4 h-4" /> Don envoyé avec succès ! Merci.
              </div>
            )}
            {web3Status === 'error' && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-[10px] uppercase font-black tracking-wider justify-center">
                <AlertCircle className="w-4 h-4" /> Erreur lors de la transaction.
              </div>
            )}

            <div className="flex items-center gap-1.5 justify-center opacity-40">
              <ShieldCheck className="w-3 h-3 text-gray-400" />
              <span className="text-[8px] font-black uppercase tracking-widest">Envoi direct et sécurisé sans frais</span>
            </div>
          </div>
        </div>
      </section>

      {/* Double Column : The Transmedia Universe vs The Physical FabLab */}
      <section className="relative z-10 max-w-6xl mx-auto grid md:grid-cols-2 gap-12 mb-24">
        {/* Column 1: Lore / Universe */}
        <div className="space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#bc13fe]/10 border border-[#bc13fe]/30 mb-2">
            <Cpu className="w-4 h-4 text-[#bc13fe]" />
            <span className="text-xs font-black uppercase tracking-[0.2em] text-[#bc13fe]">Le Verbe & La Chair (2029 - 2238)</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter">L'Univers Transmédia</h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            L'univers de *The Long Way Of...* se concentre sur l'évolution de la société humaine face aux crises écologiques et économiques. L'histoire suit la transition de <strong>Ash Land</strong> vers l'utopie spirituelle et écologique des <strong>États-Unis d'Afridi</strong> en 2049, puis les luttes politiques de 2238 pour libérer Heav1.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 border border-white/10 p-5 rounded-3xl">
              <h4 className="font-bold text-white mb-2 text-base">Amira Williams</h4>
              <p className="text-[11px] text-gray-400 leading-relaxed">La fugitive de 2103 qui devient, en 2238, la professeure d'histoire gardienne de la mémoire collective.</p>
            </div>
            <div className="bg-white/5 border border-white/10 p-5 rounded-3xl">
              <h4 className="font-bold text-white mb-2 text-base">Hyrio</h4>
              <p className="text-[11px] text-gray-400 leading-relaxed">Étudiant et coursier impulsif muni d'une IA (Gemini) et de bottes à surpression, transportant un Wallet froid vital.</p>
            </div>
            <div className="bg-white/5 border border-white/10 p-5 rounded-3xl">
              <h4 className="font-bold text-white mb-2 text-base">Adrien V. (Vesper)</h4>
              <p className="text-[11px] text-gray-400 leading-relaxed">Personnage central de la série animée Dark Fantasy, explorant la Chair et les dérives matérielles de Heav1.</p>
            </div>
            <div className="bg-white/5 border border-white/10 p-5 rounded-3xl">
              <h4 className="font-bold text-white mb-2 text-base">Kam</h4>
              <p className="text-[11px] text-gray-400 leading-relaxed">Le tuteur spirituel d'Amira en 2103, qui surveille les champs mortuaires avec son aigle persan.</p>
            </div>
          </div>
        </div>

        {/* Column 2: Physical Lab / Farm */}
        <div className="space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#00f2ff]/10 border border-[#00f2ff]/30 mb-2">
            <Leaf className="w-4 h-4 text-[#00f2ff]" />
            <span className="text-xs font-black uppercase tracking-[0.2em] text-[#00f2ff]">La Terre & L'Impact Réel (Guadeloupe)</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter">Le FabLab & La Ferme</h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            Nous ne nous contentons pas de raconter une utopie : nous la construisons. Les bénéfices de la campagne serviront à équiper notre atelier d'impression 3D végétale en Guadeloupe pour façonner des objets d'art à base de ressources locales recyclées.
          </p>

          <div className="space-y-4">
            <div className="flex gap-4 bg-white/5 border border-white/10 p-5 rounded-3xl items-start">
              <div className="p-3 bg-[#00f2ff]/10 rounded-2xl border border-[#00f2ff]/20">
                <Hammer className="w-6 h-6 text-[#00f2ff]" />
              </div>
              <div>
                <h4 className="font-bold text-white mb-1 text-base">Impression 3D en Fibre de Coco</h4>
                <p className="text-xs text-gray-400 leading-relaxed">Nous broyons la fibre de coco issue de déchets locaux pour fabriquer un filament d'impression 100% biodégradable et local. Vos figurines de la campagne seront entièrement produites ainsi !</p>
              </div>
            </div>

            <div className="flex gap-4 bg-white/5 border border-white/10 p-5 rounded-3xl items-start">
              <div className="p-3 bg-[#00f2ff]/10 rounded-2xl border border-[#00f2ff]/20">
                <Leaf className="w-6 h-6 text-[#00f2ff]" />
              </div>
              <div>
                <h4 className="font-bold text-white mb-1 text-base">Agriculture sans Chlordécone</h4>
                <p className="text-xs text-gray-400 leading-relaxed">En développant des serres de culture verticales hydroponiques et aéroponiques hors-sol, nous garantissons des aliments sains, 100% exempts du pesticide historique chlordécone.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Reward Tiers Grid */}
      <section className="relative z-10 max-w-6xl mx-auto mb-20">
        <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-center mb-12">
          Choisissez vos Contreparties (Tiers)
        </h2>

        <div className="grid md:grid-cols-4 gap-6">
          {pledgeTiers.map((tier) => (
            <div 
              key={tier.id}
              onClick={() => {
                setSelectedTier(tier.id);
                setCustomAmount('');
              }}
              className={`cursor-pointer rounded-3xl border p-6 flex flex-col justify-between transition-all duration-300 relative bg-black/40 backdrop-blur-md hover:scale-[1.03] ${selectedTier === tier.id ? 'border-[#00f2ff] bg-[#00f2ff]/5 shadow-[0_0_30px_rgba(0,242,255,0.15)]' : 'border-white/10 hover:border-white/30'}`}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-[#bc13fe] to-[#00f2ff] text-black font-black uppercase text-[8px] tracking-[0.2em] rounded-full shadow-lg">
                  Populaire
                </div>
              )}

              <div>
                <div className="flex items-start justify-between mb-4">
                  <span className="text-[8px] uppercase tracking-widest text-[#00f2ff] bg-[#00f2ff]/10 px-2 py-0.5 rounded-md font-bold">
                    {tier.badge}
                  </span>
                  <span className="text-2xl font-black text-white">{tier.priceEuro} €</span>
                </div>

                <h3 className="text-xl font-black uppercase tracking-tight text-white mb-2">{tier.name}</h3>
                <p className="text-xs text-[#00f2ff] font-mono mb-4">{tier.cryptoEquivalent}</p>
                <p className="text-gray-400 text-[11px] leading-relaxed mb-6">{tier.description}</p>
              </div>

              <div>
                <ul className="space-y-2 mb-6 border-t border-white/5 pt-4">
                  {tier.items.map((item, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-[10px] text-gray-300 font-medium">
                      <Check className="w-3.5 h-3.5 text-[#00f2ff] flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <button 
                  className={`w-full py-3 rounded-xl font-bold uppercase tracking-wider text-[10px] transition-colors ${selectedTier === tier.id ? 'bg-[#00f2ff] text-black' : 'bg-white/5 hover:bg-white/10 text-white'}`}
                >
                  {selectedTier === tier.id ? 'Sélectionné' : 'Sélectionner'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Visual Showcase (Coconut Filament & Greenhouse Concepts) */}
      <section className="relative z-10 max-w-6xl mx-auto bg-white/5 border border-white/10 rounded-[36px] overflow-hidden p-8 md:p-12 mb-20">
        <h3 className="text-2xl font-black uppercase tracking-tight text-center mb-8">Concepts de la Production Physique en Guadeloupe (Concept Art)</h3>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="aspect-[4/3] rounded-3xl overflow-hidden border border-white/10 relative bg-black">
              <img 
                src="/hyrio_coconut_figure.png" 
                alt="Concept Art - Figurine en fibre de coco"
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 left-4 px-3 py-1 bg-amber-500/85 backdrop-blur-md text-black font-black uppercase text-[8px] tracking-[0.2em] rounded-full">
                Concept Art / Prototype
              </div>
            </div>
            <h4 className="font-bold text-base uppercase text-center text-[#00f2ff]">Figurine d'Art Umoja en Fibre de Coco (Concept)</h4>
            <p className="text-xs text-gray-400 text-center leading-relaxed px-4">
              Recherche visuelle et prototype d'une figurine articulée d'Hyrio, conçue en Guadeloupe avec notre filament breveté biodégradable intégrant 40% de résidus de fibre de coco locale.
            </p>
          </div>

          <div className="space-y-4">
            <div className="aspect-[4/3] rounded-3xl overflow-hidden border border-white/10 relative bg-black">
              <img 
                src="/umoja_farming_greenhouse.png" 
                alt="Concept Art - Ferme de culture verticale"
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 left-4 px-3 py-1 bg-amber-500/85 backdrop-blur-md text-black font-black uppercase text-[8px] tracking-[0.2em] rounded-full">
                Concept Art / Modèle 3D
              </div>
            </div>
            <h4 className="font-bold text-base uppercase text-center text-[#bc13fe]">Pilote de la Ferme Verticale Sans Chlordécone (Concept)</h4>
            <p className="text-xs text-gray-400 text-center leading-relaxed px-4">
              Rendu conceptuel du système de serres verticales hors-sol et solaires à recirculation d'eau, visant à cultiver sainement et sans pesticide chlordécone en Guadeloupe.
            </p>
          </div>
        </div>
      </section>

      {/* Bottom FAQ / Policy disclaimer */}
      <section className="relative z-10 max-w-4xl mx-auto text-center border-t border-white/10 pt-16">
        <h3 className="text-xl font-black uppercase tracking-tight mb-4 flex items-center justify-center gap-2 text-amber-500">
          <HelpCircle className="w-5 h-5" /> FAQ - Campagne & Dons Blockchain
        </h3>
        <p className="text-xs text-gray-400 leading-relaxed max-w-2xl mx-auto">
          Les dons effectués via la DApp Beam Up sont directs et versés immédiatement à l'artiste créateur du protocole (sans aucune commission intermédiaire en dehors des frais de réseau basiques). Si vous choisissez un palier, votre adresse de portefeuille sera enregistrée pour l'accès numérique et nous vous contacterons si votre palier inclut des contreparties physiques.
        </p>
      </section>
    </div>
  );
}
