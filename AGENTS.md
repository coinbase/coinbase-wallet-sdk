# Agent Guidelines

## Package manager

Use **Yarn 4** (Berry). Never use `npm install` or `npx` -- use `yarn` and `yarn dlx` instead. The lockfile is `yarn.lock`, not `package-lock.json`.

## Monorepo structure

- `packages/account-sdk` (`@base-org/account`) -- the core SDK
- `examples/testapp` -- playground app (not published)


## Path aliases

Imports use a **`:` prefix** convention, not `@/` or `~/`:

- `':core/*'`, `':util/*'`, `':store/*'`, `':owner-key/*'`, `':ui/*'`, `':interface/*'` in account-sdk

These are defined in each package's `tsconfig.base.json` and resolved at build time by `tsc-alias`.

## JSX runtime

The SDK uses **Preact**, not React. `jsxImportSource` is set to `"preact"` in tsconfig. Import from `preact` and `preact/hooks`, not `react`.


## Browser vs Node entry points

The SDK has dual entry points using a `*.node.ts` suffix convention:
- `index.ts` / `index.js` -- browser build
- `index.node.ts` / `index.node.js` -- Node build (e.g., CDP SDK integration)

The `package.json` `exports` map uses conditional `browser` and `node` fields to resolve the correct entry.

## Generated files -- do not edit

- `**/*-css.ts` -- generated from SCSS by `compile-assets.cjs`. Edit the `.scss` source instead.
- `**/*-svg.ts` -- generated SVG assets.
- `src/core/telemetry/telemetry-content.ts` in account-sdk -- generated from vendor JS.

Run `node compile-assets.cjs` (or `yarn pretest` / `yarn build`) to regenerate.

## Linting and formatting

Uses **Biome**, not ESLint or Prettier. Config is at the repo root `biome.json`.
- `console.log` is an error -- use `console.warn`, `console.error`, or `console.info`
- Line width is 100 characters
- Run `yarn format` before committing

## Testing

Uses **Vitest** with jsdom environment. Tests are co-located as `*.test.ts` / `*.test.tsx` next to source files. Node-specific tests use `*.node.test.ts`.

Always run tests in non-interactive mode: `yarn test --run` (not `yarn test`).

## Versioning

**Do not manually edit version numbers in `package.json`.** Versions are managed by release-please. PR titles must follow Conventional Commits format (`feat:`, `fix:`, `chore:`, etc.) -- this is enforced in CI and drives automated versioning.
