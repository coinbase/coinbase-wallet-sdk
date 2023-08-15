module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    [
      '@babel/preset-typescript',
      {
        jsxPragma: 'h',
        jsxPragmaFrag: 'Fragment',
      },
    ],
  ],
  plugins: [
    [
      '@babel/plugin-transform-react-jsx',
      {
        pragma: 'h',
        pragmaFrag: 'Fragment',
      },
    ],
    ['@babel/plugin-proposal-decorators', { legacy: true }],
  ],
};
