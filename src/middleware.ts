import { NextResponse, type NextRequest } from 'next/server';

// Séparation stricte des deux domaines servis par ce projet :
//  - le domaine des jeux (GAMES_ORIGIN) ne sert QUE la passerelle /g/… : ni pages ni API de BeamUp ;
//  - le domaine de BeamUp ne sert jamais /g/… : le code d'un jeu ne s'exécute jamais sur l'origine de BeamUp.

const gamesHost = () => {
  try { return process.env.GAMES_ORIGIN ? new URL(process.env.GAMES_ORIGIN).host : ''; } catch { return ''; }
};

/** Domaine réellement demandé par le navigateur (Next.js peut réécrire l'URL avec son propre nom d'hôte). */
const requestHost =(headers: Headers) => (headers.get('x-forwarded-host') || headers.get('host') || '').split(',')[0].trim().toLowerCase();

export function middleware(req: NextRequest) {
  const onGamesHost = gamesHost() !== '' && requestHost(req.headers) === gamesHost();
  const isGatePath = req.nextUrl.pathname.startsWith('/g/');
  if (onGamesHost !== isGatePath) return new NextResponse('Introuvable', { status: 404 });
  return NextResponse.next();
}

export const config = {
  // Runtime Node.js : GAMES_ORIGIN est lu à l'exécution (en Edge, la variable serait figée au build).
  runtime: 'nodejs',
  // Les fichiers internes de Next.js restent servis normalement sur le domaine de BeamUp.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
