export default {
  output: 'export',
  basePath: process.env.NODE_ENV === 'production' ? '/coinbase-wallet-sdk' : undefined,
  pageExtensions: ['page.tsx', 'page.ts', 'page.js', 'page.jsx'],
  eslint: {
    // Ignore eslint for `next lint`. 
    // GitHub discussion for supporting biome: https://github.com/vercel/next.js/discussions/59347
    ignoreDuringBuilds: true,
  },
};
