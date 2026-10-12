'use client';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Navigation from '../../components/Navigation';
import WindowsAccess from '../../components/WindowsAccess';

// Ouverte par l'application Windows de Chains & Crowns pour vérifier l'achat.
// Le port et l'état viennent de l'application ; la licence n'est renvoyée qu'à cet ordinateur (127.0.0.1).

function Content() {
  const params = useSearchParams();
  const port = Number(params.get('port'));
  const state = params.get('state') || '';
  const valid = Number.isInteger(port) && port >= 1024 && port <= 65535 && /^[A-Za-z0-9_-]{16,64}$/.test(state);
  return valid
    ? <WindowsAccess mode="licence" port={port} state={state} />
    : <p className="text-gray-400 text-sm">Ouvrez cette page depuis l’application Chains &amp; Crowns pour Windows (bouton « Vérifier mon achat »).</p>;
}

export default function LicencePage() {
  return (
    <div className="min-h-screen bg-[#020202] text-white">
      <Navigation />
      <main className="max-w-lg mx-auto px-4 py-16">
        <Suspense fallback={null}><Content /></Suspense>
      </main>
    </div>
  );
}
