// Copyright (c) 2018-2019 WalletLink.org <https://www.walletlink.org/>
// Copyright (c) 2018-2019 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

export interface SessionConfig {
  webhookId: string
  webhookUrl: string
  metadata: { [key: string]: string | undefined }
}
