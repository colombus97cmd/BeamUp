import type { Metadata } from 'next';
import Navigation from '../../components/Navigation';
import AdminConsole from '../../components/admin/AdminConsole';

export const metadata: Metadata = {
  title: 'Pilotage | BeamUp',
  robots: { index: false, follow: false },
};

// Page de pilotage des agents (promotion, tournois, modération), réservée aux signataires du Safe.
// L'accès est vérifié côté serveur à chaque appel d'API : cette page n'affiche rien sans session valide.
export default function Pilotage() {
  return (
    <div className="min-h-screen bg-[#020202] text-white">
      <Navigation />
      <AdminConsole />
    </div>
  );
}
