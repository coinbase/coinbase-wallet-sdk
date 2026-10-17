# Agent Guidelines

## Package manager

Use **Yarn 4** (Berry). Never use `npm install` or `npx` -- use `yarn` and `yarn dlx` instead. The lockfile is `yarn.lock`, not `package-lock.json`.

## Monorepo structure

- `packages/wallet-sdk` (`@coinbase/wallet-sdk`) -- the core SDK
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

## Code style

Count callers before defending anything. Most of the rules below are one question --
"who actually uses this?" -- asked of a function, a file, an export, or a list.

### Functions

**Throw inline.** Write `throw standardErrors.rpc.internal('...')` at the check. Do not route
throws through an `invalid()` / `fail()` helper -- TypeScript narrows a plain `throw` natively,
so the helper buys nothing and needs a comment explaining why it is typed the way it is. Repeated
message prefixes go in a `const`, not back into a helper.

**A helper must carry a rule, not restate its body.** Delete helpers whose name is a synonym for
their one line (`hasNamespaceGrant` for `grant !== undefined`, `accountsFor` for
`grant?.accounts ?? []`). Keep the ones that encode something a reader would otherwise get wrong,
like "a grant with no accounts is not a connection".

**Inline single-caller indirection.** A private function with one caller belongs at its call
site. Two or more callers is the bar for keeping it, and a helper kept at that bar should still
carry a rule. Count before extracting; a name is not worth a hop. Two exceptions, both earned:
it is directly unit-tested for a subtle rule, or inlining would bury a distinct validation inside
a `.map()` or a long branch.

**Pass data down instead of re-deriving it.** Re-deriving is what breeds those helpers. When
`parseScopes` knew each scope key and the parsers recovered it with
`field.slice('wallet_createSession.scopes.'.length)`, the workaround needed a helper of its own.
Threading the key through deleted three functions. If a callee is reconstructing something the
caller already had, fix the signature, not the callee.

**Named params for three or more arguments**, and for any boolean flag. `new
CoinbaseWalletProvider({ transport, store, ephemeral: true })`, not a trailing `true`.

### Naming

**A name states the direction and the outcome.** `parse*` returns a value, `assert*` throws and
returns nothing, `is*` is a type guard, `format*` is the inverse of `parse*`. `scopeChains`
became `assertScopeChains` when its return value turned out to be discarded; `switchChainId`
became `parseSwitchChainId` because it reads params rather than switching anything.

**Inverse operations get symmetric names**: `formatEip155ChainId` / `parseEip155ChainId`, never
`eip155Caip2` / `eip155ChainId`. And never reuse one word for two types in one signature -- a
`chainId: Caip2` parameter returning a numeric chain id needs one of them renamed.

### Files

**Group by the question a file answers**, not by one function per file. `grants.ts` is everything
that reads authorization, `params.ts` is every EIP-1193 param reader, `methods.ts` is the method
lists. A file holding one small function usually belongs inside its topical sibling.

**Name a file for its contents, never a preposition** (`from.ts` -> `extractFrom.ts`).

**Types live in `types.ts`.** Logic files under `core/session` declare none -- see `caip25.ts`
and `caip27.ts`. Exception: a type coupled to a `const` in a logic file, which would invert the
import.

**Test-only helpers are `*.fixtures.ts`** and excluded from `tsconfig.build.json`. They must not
be re-exported from a barrel.

### Types

**No `as` on validated data.** A cast after a check almost always means the check did not narrow.
Fix the check instead: use a type guard, add the `typeof` the compiler needs, or return the
validated value from the function that checked it -- narrowing does not survive a `void` assert.
`src/core/session/caip25.ts` and `caip27.ts` have zero casts; keep it that way.

**Skip `as const` unless something consumes the literal types.** It forced `EIP155_METHODS` to
need a parallel `Set` just to be searchable with a `string`.

### Deleting

**Delete on sight**: unused exports, barrel re-exports nobody imports, options no caller passes,
and types nothing references. `core/session/index.ts` is internal, so an export there is not
API worth preserving.

**Derive, never copy.** `WALLET_METHODS` was a hand-maintained duplicate of `EIP155_METHODS`; the
fix was deriving it, and then deleting it once the two were provably identical.

**Similar code is not duplicate code.** Four `typeof value !== 'string'` checks that throw four
different errors are four rules, not one helper waiting to be extracted.

### Behavior

**Never act on the dapp's behalf.** Connecting is something the dapp asks for; a signing request
arriving without a session gets 4100, it does not quietly create one.

**Never claim a capability the SDK does not implement.** `gasLimitOverride` was hardcoded as
supported while the wallet did the work -- it now comes from the wallet's own response.

**Check the old SDK before changing routing or errors.** Behavior here is deliberately matched to
the pre-CAIP `Signer`; `git show <rev>:packages/account-sdk/...` settles most of these questions
faster than reasoning about them.

## Testing

Uses **Vitest** with jsdom environment. Tests are co-located as `*.test.ts` / `*.test.tsx` next to source files. Node-specific tests use `*.node.test.ts`.

Always run tests in non-interactive mode: `yarn test --run` (not `yarn test`).

## Versioning

**Do not manually edit version numbers in `package.json`.** Versions are managed by release-please. PR titles must follow Conventional Commits format (`feat:`, `fix:`, `chore:`, etc.) -- this is enforced in CI and drives automated versioning.
