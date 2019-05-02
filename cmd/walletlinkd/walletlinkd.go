// Copyright (c) 2019 Coinbase, Inc. See LICENSE

package main

import (
	"fmt"

	"github.com/CoinbaseWallet/walletlinkd/app"
	"github.com/CoinbaseWallet/walletlinkd/config"
	"github.com/CoinbaseWallet/walletlinkd/server"
)

func main() {
	srv := server.NewServer()

	fmt.Printf(
		"walletlinkd %s-%s listening on port %s...\n",
		app.Version,
		app.GitCommit,
		config.Port,
	)
	srv.Start(config.Port)
}
