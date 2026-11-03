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
};

export default nextConfig;
