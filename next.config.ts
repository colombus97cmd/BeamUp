/** @type {import('next').NextConfig} */
const nextConfig = {
  // Désactive l'export statique car Vercel le gère en mode dynamique
  // output: 'export', 
  images: {
    unoptimized: true,
  },
  typescript: {
    // Ignore les erreurs de types pendant le build
    ignoreBuildErrors: true,
  },
  eslint: {
    // Ignore les erreurs de linting pendant le build
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
