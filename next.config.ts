import type { NextConfig } from 'next';
const config: NextConfig = {
  async redirects() {
    return [
      { source: '/blogs/:blog/:handle', destination: '/blog/:handle', permanent: true },
      { source: '/blogs/:blog', destination: '/blog', permanent: true },
      { source: '/collections/all', destination: '/shop', permanent: true },
    ];
  },
};
export default config;
