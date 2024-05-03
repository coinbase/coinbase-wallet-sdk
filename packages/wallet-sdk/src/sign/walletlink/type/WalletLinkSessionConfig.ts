// Copyright (c) 2018-2023 Coinbase, Inc. <https://www.coinbase.com/>

export interface WalletLinkSessionConfig {
  webhookId: string;
  webhookUrl: string;
  metadata: { [key: string]: string | undefined };
}
