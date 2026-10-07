import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const npmAliasPackageJsonPath = path.join(
  __dirname,
  '../../node_modules/@base-org/account-npm/package.json'
);
const hasPublishedSdkAlias = existsSync(npmAliasPackageJsonPath);

export default {
  output: 'export',
  basePath: process.env.NODE_ENV === 'production' ? '/coinbase-wallet-sdk' : undefined,
  pageExtensions: ['page.tsx', 'page.ts', 'page.js', 'page.jsx'],
  eslint: {
    // Ignore eslint for `next lint`.
    // GitHub discussion for supporting biome: https://github.com/vercel/next.js/discussions/59347
    ignoreDuringBuilds: true,
  },
  webpack: (config) => {
    if (!hasPublishedSdkAlias) {
      config.resolve.alias = {
        ...config.resolve.alias,
        '@base-org/account-npm': '@coinbase/wallet-sdk',
        '@base-org/account-npm/spend-permission': '@coinbase/wallet-sdk/spend-permission',
      };
    }

    return config;
  },
};
