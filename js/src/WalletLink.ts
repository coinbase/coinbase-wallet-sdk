import { WalletLinkProvider } from "./WalletLinkProvider"

// Copyright (c) 2018-2019 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

export interface WalletLinkOptions {
  appName?: string
}

export class WalletLink {
  private _appName?: string

  constructor(options: WalletLinkOptions) {
    this._appName = options.appName || "DApp"
  }

  public makeWeb3Provider(
    jsonRpcUrl: string,
    chainId: number = 1
  ): WalletLinkProvider {
    return new WalletLinkProvider({
      appName: this._appName,
      jsonRpcUrl,
      chainId
    })
  }
}
