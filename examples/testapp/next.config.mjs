export default {
  output: 'export',
  basePath: process.env.NODE_ENV === 'production' ? '/coinbase-wallet-sdk' : undefined,
  pageExtensions: ['page.tsx', 'page.ts', 'page.js', 'page.jsx'],
};
