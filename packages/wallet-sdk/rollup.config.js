import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import { terser } from 'rollup-plugin-terser';

export default {
  input: 'src/browser-entry.ts',
  output: {
    file: 'dist/coinbase-wallet-sdk.min.js',
    format: 'umd',
    name: 'CoinbaseWalletSDK',
    sourcemap: true,
    // UMD cannot code-split, so dependency dynamic imports are inlined.
    inlineDynamicImports: true,
    plugins: [terser()],
  },
  plugins: [
    json(),
    nodeResolve({
      browser: true,
      preferBuiltins: false,
    }),
    commonjs(),
    typescript({
      tsconfig: './tsconfig.build.json',
      compilerOptions: {
        module: 'esnext',
        moduleResolution: 'bundler',
        declaration: false,
        declarationMap: false,
        emitDeclarationOnly: false,
      },
    }),
  ],
  onwarn(warning, warn) {
    // Ignore PURE comment warnings from ox and viem
    if (warning.code === 'INVALID_ANNOTATION' && warning.message.includes('/*#__PURE__*/')) {
      return;
    }
    // Ignore circular dependency warnings from viem and ox (these are handled internally)
    if (
      warning.code === 'CIRCULAR_DEPENDENCY' &&
      (warning.message.includes('node_modules/viem') || warning.message.includes('node_modules/ox'))
    ) {
      return;
    }
    warn(warning);
  },
};
