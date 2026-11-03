/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    qualities: [60, 75],
  },
  experimental: {
    inlineCss: true,
    optimizePackageImports: ['date-fns', 'react-big-calendar'],
  },
  turbopack: {
    resolveAlias: {
      'next/dist/build/polyfills/polyfill-module': './src/lib/emptyPolyfill.js',
      'next/dist/build/polyfills/polyfill-module.js': './src/lib/emptyPolyfill.js',
      '../build/polyfills/polyfill-module': './src/lib/emptyPolyfill.js',
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
