# Changelog

## [5.0.0](https://github.com/coinbase/coinbase-wallet-sdk/compare/v4.4.0...v5.0.0) (2026-10-27)


### ⚠ BREAKING CHANGES

* requires the matching wallet release, which routes requests by the pairing that sent them. Sessions created during the private beta stop working and users reconnect once.
* pay, subscribe, base, getPaymentStatus, getSubscriptionStatus, prepareCharge, charge, createProlinkUrl, encodeProlink, decodeProlink, window.base, and the ./payment, ./spend-permission, and ./prolink entry points are removed.
* replace SDK with next-gen Coinbase Wallet SDK

### Features

* add coinbase:signPreparedCalls to the Solana Wallet Standard wallet ([#1923](https://github.com/coinbase/coinbase-wallet-sdk/issues/1923)) ([f4ce18c](https://github.com/coinbase/coinbase-wallet-sdk/commit/f4ce18cb7d240fc8ae76e9a659cea9a583ef2b47))
* add optional coinbase_signPreparedCalls on EVM and Solana ([#1921](https://github.com/coinbase/coinbase-wallet-sdk/issues/1921)) ([bc02c53](https://github.com/coinbase/coinbase-wallet-sdk/commit/bc02c532dd90cee02046510f60b4f7ce396da00c))
* identify sessions by the pairing and keep the active chain across reloads ([#1934](https://github.com/coinbase/coinbase-wallet-sdk/issues/1934)) ([3f142f0](https://github.com/coinbase/coinbase-wallet-sdk/commit/3f142f052707f679b6ad17416626d2212f9d3107))
* remove payment, subscription, spend permission, and prolink APIs ([#1927](https://github.com/coinbase/coinbase-wallet-sdk/issues/1927)) ([4e44676](https://github.com/coinbase/coinbase-wallet-sdk/commit/4e44676acd96cc694229a6539caa705c00c7604e))
* replace SDK with next-gen Coinbase Wallet SDK ([bb136ca](https://github.com/coinbase/coinbase-wallet-sdk/commit/bb136ca4b8d2f637c1bed42cc0497daff0cbff2b))
* **telemetry:** measure every SDK surface ([#1935](https://github.com/coinbase/coinbase-wallet-sdk/issues/1935)) ([eaca0ce](https://github.com/coinbase/coinbase-wallet-sdk/commit/eaca0ce913a1ea14aff0dbfae414825a31fc7a3c))


### Bug Fixes

* **build:** move the script-tag bundle to Rolldown and trim it ([#1928](https://github.com/coinbase/coinbase-wallet-sdk/issues/1928)) ([4e177ef](https://github.com/coinbase/coinbase-wallet-sdk/commit/4e177efb2fe6e071f00f4094b0107444aa190ed3))

## Changelog
