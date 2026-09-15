# CLAUDE.md

Guidance for Claude Code and other AI assistants working in this repository.

## What this is

The Coinbase Wallet SDK: the client half of the protocol a dapp uses to talk to Coinbase
Wallet. It ships an EIP-1193 provider, so the surface a dapp sees is small — create an SDK,
get a provider, call `request()` — while most of the code is the machinery underneath:
signers, a cross-origin communicator, key management, and the RPC types both ends agree on.

This is wallet software. Changes to signing, key handling, or session state deserve more care
than their size suggests, and the maintainers own those designs. Prefer the smallest change
that solves the stated problem, and raise architectural questions on the issue rather than
answering them in a pull request.

## Layout

Yarn 4 workspaces; the interesting one is `packages/wallet-sdk`.

| Path | Contents |
| :--- | :--- |
| `src/createCoinbaseWalletSDK.ts` | The v4 entry point. Builds options, writes them to the store, hands back an object with `getProvider()` and the `subAccount` helpers. |
| `src/CoinbaseWalletSDK.ts` | The older class-style entry point, kept for v3 compatibility. |
| `src/store/store.ts` | A zustand store holding chains, keys, account, sub-accounts, spend permissions and config. **Module-level, and persisted to `localStorage`** — see below. |
| `src/sign/` | `scw/` for smart contract wallet signing (`SCWSigner`, `SCWKeyManager`), `walletlink/` for the legacy relay. |
| `src/core/` | `communicator/` for the popup channel, `rpc/` for typed request/response shapes, plus provider interfaces, errors, storage and telemetry. |
| `examples/testapp` | The dapp used to exercise the SDK in a browser. `yarn dev` runs it with hot reloading. |

Imports use `:`-prefixed aliases (`:core/…`, `:store/store.js`, `:sign/…`, `:util/…`) with
explicit `.js` extensions, even from `.ts` files. Match the surrounding file.

## The store is a singleton

`store/store.ts` does `export const sdkstore = createStore(...)` at module scope, and fifteen
non-test modules import it directly — including `SCWSigner`, `SCWKeyManager`, sub-account
signing and telemetry. Two consequences worth holding in mind:

- **There is one connection state per page.** Calling `createCoinbaseWalletSDK()` twice does
  not produce two independent connections; the second call overwrites the first's config, and
  there is a single account slot. This is the substance of
  [#1860](https://github.com/coinbase/coinbase-wallet-sdk/issues/1860), and making it
  per-instance is a refactor across all fifteen modules rather than a local change.
- **`config`, `account`, `keys` and `subAccount` are persisted to `localStorage`** and
  rehydrated synchronously when the module loads. So the store is already populated from a
  previous session before any SDK is created. Don't infer "the app did X this page load" from
  store contents — it may be last week's state.

Tests share module state within a file. If you set module-level state in a test, restore it in
`afterEach`, or the next test in that file inherits it.

## Checks

CI (`.github/workflows/main.yml`) runs three jobs, all reproducible locally from the root:

```sh
yarn install
yarn lint        # biome
yarn build:packages
yarn typecheck   # tsc --noEmit
yarn test
```

`master` is green on all of them: at the time of writing, 47 test files, 454 passing and 1
skipped, with 2 pre-existing biome warnings. Diff the warning list rather than reading the
count, since biome reports warnings without failing.

Two local-only gotchas:

- **`yarn test` is bare `vitest`, which watches.** In CI it runs once because there is no TTY;
  locally it will hang until you stop it. Use `npx vitest run` from `packages/wallet-sdk`.
- `yarn build:packages` regenerates `src/core/telemetry/telemetry-content.ts` from the vendored
  script. That file is committed, and a normal build reproduces it byte-for-byte, so a dirty
  tree after building means something else changed.

Node 20.11+ and Yarn 4 (`corepack enable`). Commits must be GPG-signed and follow
[Conventional Commits](https://www.conventionalcommits.org/) — see `CONTRIBUTING.md`.

## Conventions

- Biome owns formatting and linting; don't hand-format around it. It prefers a single template
  literal over concatenated strings, which is easy to trip when writing a long message.
- RPC methods are typed per-method under `src/core/rpc/`, one file per method, named after the
  wire method (`wallet_connect.ts`, `wallet_addSubAccount.ts`). Add new methods there rather
  than widening a shared union.
- Tests sit next to the code as `*.test.ts` and use vitest globals (`describe`/`it`/`vi`) —
  they are not imported.
- User-facing behaviour changes belong in `README.md` as well as in code; the README is the
  documentation people actually read.
