import Link from 'next/link';

// Liens légaux en pied de page (mentions légales, confidentialité, conditions, charte, règlement des tournois).
const LINKS = [
  ['/mentions-legales', 'Mentions légales'],
  ['/confidentialite', 'Confidentialité'],
  ['/conditions', 'Conditions des créateurs'],
  ['/charte', 'Charte de la communauté'],
  ['/reglement-tournois', 'Règlement des tournois'],
];

export default function LegalFooter() {
  return (
    <footer className="relative z-10 border-t border-white/5 px-4 py-8 text-center">
      <nav className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-[11px] text-gray-500">
        {LINKS.map(([href, label]) => <Link key={href} href={href} className="hover:text-gray-300">{label}</Link>)}
      </nav>
      <p className="text-[10px] text-gray-600 mt-3">© {new Date().getFullYear()} BeamUp · David Colombo · Guadeloupe</p>
    </footer>
  );
}
