'use client';
import { useState } from 'react';
import { ConnectKitButton } from 'connectkit';
import { Rocket, Menu, X, LayoutGrid, PlusCircle, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const navLinks = [
    { name: 'Flux', href: '/', icon: <LayoutGrid className="w-4 h-4" /> },
    { name: 'Studio', href: '/publish', icon: <PlusCircle className="w-4 h-4" /> },
    { name: 'Architecte', href: '/architect', icon: <User className="w-4 h-4" /> },
  ];

  return (
    <header className='h-16 flex justify-between items-center px-4 md:px-10 cyber-glass sticky top-0 z-[1000] border-b border-white/5'>
      {/* LOGO (Gauche) */}
      <Link href="/" className='flex items-center gap-2 group shrink-0' onClick={() => setIsOpen(false)}>
        <div className='p-1 bg-gradient-to-tr from-[#bc13fe] to-[#00f2ff] rounded-md'><Rocket className='w-4 h-4 text-black' /></div>
        <span className='text-xs md:text-sm font-black tracking-tighter uppercase'>BEAM UP</span>
      </Link>

      {/* NAV DESKTOP (Centre) */}
      <nav className='hidden md:flex items-center gap-8'>
        {navLinks.map((link) => (
          <Link 
            key={link.href} 
            href={link.href} 
            className={`text-[9px] uppercase font-black tracking-[0.2em] transition-all ${pathname === link.href ? 'text-[#00f2ff]' : 'text-gray-500 hover:text-white'}`}
          >
            {link.name}
          </Link>
        ))}
      </nav>

      {/* ACTIONS (Droite) */}
      <div className="flex items-center gap-2 relative">
        <div className="scale-[0.8] md:scale-90 origin-right"><ConnectKitButton /></div>
        
        <button 
          onClick={() => setIsOpen(!isOpen)} 
          className='p-2 text-white bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all active:scale-90 md:hidden z-[1002]'
        >
          {isOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>

        {/* MENU MOBILE FLOTTANT (Vraiment en DESSOUS) */}
        {isOpen && (
          <>
            {/* Overlay invisible pour fermer en cliquant ailleurs */}
            <div className='fixed inset-0 z-[1000]' onClick={() => setIsOpen(false)} />
            
            {/* Carte flottante décalée vers le bas */}
            <div className='absolute top-[52px] right-0 w-44 cyber-glass border border-white/10 rounded-2xl z-[1001] md:hidden animate-in fade-in zoom-in-95 duration-200 overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)]'>
              <nav className='flex flex-col p-1'>
                {navLinks.map((link) => (
                  <Link 
                    key={link.href} 
                    href={link.href} 
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-3 p-3.5 text-[9px] uppercase font-black tracking-widest rounded-xl transition-all ${pathname === link.href ? 'text-[#00f2ff] bg-white/5 shadow-inner' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                  >
                    <span className={pathname === link.href ? 'text-[#00f2ff]' : 'text-gray-600'}>{link.icon}</span>
                    {link.name}
                  </Link>
                ))}
              </nav>
            </div>
          </>
        )}
      </div>
    </header>
  );
}