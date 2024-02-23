// Copyright (c) 2018-2023 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

export interface WalletLinkSessionConfig {
  webhookId: string;
  webhookUrl: string;
  metadata: { [key: string]: string | undefined };
}
