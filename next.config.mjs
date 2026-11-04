/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    qualities: [60, 75],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 604800,
    deviceSizes: [384, 640, 750, 828, 1080, 1200, 1920],
  },
  experimental: {
    cpus: 1,
    optimizePackageImports: ['date-fns', 'react-big-calendar'],
  },
  async headers() {
    return [
      {
        source: '/(bookings|profile|admin)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'private, no-cache, must-revalidate',
          },
        ],
      },
      {
        source: '/((?!api|_next|admin|bookings|profile).*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
          },
        ],
      },
    ];
  },
  turbopack: {
    resolveAlias: {
      'next/dist/build/polyfills/polyfill-module': './src/lib/emptyPolyfill.ts',
      'next/dist/build/polyfills/polyfill-module.js': './src/lib/emptyPolyfill.ts',
      '../build/polyfills/polyfill-module': './src/lib/emptyPolyfill.ts',
    },
  },
  webpack: (config) => {
    config.resolve.alias['next/dist/build/polyfills/polyfill-module'] = false;
    config.resolve.alias['next/dist/build/polyfills/polyfill-module.js'] = false;
    config.resolve.alias['../build/polyfills/polyfill-module'] = false;
    return config;
  },
};

export default nextConfig;
