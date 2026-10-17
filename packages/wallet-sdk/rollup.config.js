import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import typescript from '@rollup/plugin-typescript';
import { terser } from 'rollup-plugin-terser';

export default {
  input: 'src/browser-entry.ts',
  output: [
    {
      file: 'dist/base-account.js',
      format: 'umd',
      name: 'base',
      sourcemap: true,
      inlineDynamicImports: true,
      exports: 'named',
    },
    {
      file: 'dist/coinbase-wallet-sdk.min.js',
      format: 'umd',
      name: 'base',
      sourcemap: true,
      inlineDynamicImports: true,
      exports: 'named',
      plugins: [terser()],
    },
  ],
  plugins: [
    replace({
      'process.env.NODE_ENV': JSON.stringify('production'),
      preventAssignment: true,
    }),
    json(),
    nodeResolve({
      browser: true,
      preferBuiltins: false,
      dedupe: ['viem', 'ox'],
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
  external: [],
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
