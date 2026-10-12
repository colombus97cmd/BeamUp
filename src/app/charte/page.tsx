import type { Metadata } from 'next';
import { CheckCircle2, PenLine, EyeOff, Scale } from 'lucide-react';
import Navigation from '../../components/Navigation';
import LegalFooter from '../../components/LegalFooter';
import { CHARTER } from '../../lib/moderation';

export const metadata: Metadata = {
  title: 'Charte de la communauté | BeamUp',
  description: "Liberté d'expression et respect de l'art d'autrui : la charte de la communauté BeamUp.",
};

// Le texte vient de lib/moderation.ts : c'est aussi la consigne de l'agent modérateur.
const SECTIONS = [
  { icon: CheckCircle2, color: 'text-green-400', title: 'Toujours bienvenu', items: CHARTER.allowed },
  { icon: PenLine, color: 'text-yellow-400', title: 'L\'agent vous suggère de reformuler', items: CHARTER.rephrase },
  { icon: EyeOff, color: 'text-red-400', title: 'Masqué sur BeamUp', items: CHARTER.hidden },
];

export default function Charte() {
  return (
    <div className="min-h-screen bg-[#020202] text-white">
      <Navigation />
      <main className="max-w-3xl mx-auto px-4 py-12 md:py-20 space-y-10">
        <section>
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#00f2ff] font-black mb-3">Communauté</p>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-6">Charte de la communauté</h1>
          <p className="text-gray-300 text-base md:text-lg leading-relaxed">{CHARTER.intro}</p>
        </section>

        {SECTIONS.map((s) => {
          const Icon = s.icon;
          return (
            <section key={s.title} className="bg-white/5 border border-white/10 rounded-2xl p-5 md:p-6">
              <h2 className="flex items-center gap-2 font-black uppercase text-sm mb-4"><Icon className={`w-5 h-5 ${s.color}`} /> {s.title}</h2>
              <ul className="space-y-2 text-gray-300 text-sm leading-relaxed list-disc pl-5">
                {s.items.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </section>
          );
        })}

        <section className="flex items-start gap-3 p-5 rounded-2xl bg-[#00f2ff]/5 border border-[#00f2ff]/20">
          <Scale className="w-5 h-5 text-[#00f2ff] shrink-0 mt-0.5" />
          <p className="text-gray-300 text-sm leading-relaxed">{CHARTER.process}</p>
        </section>
      </main>
      <LegalFooter />
    </div>
  );
}
