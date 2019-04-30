// Copyright (c) 2017-2019 Coinbase Inc. See LICENSE

package main

import (
	"fmt"

	"github.com/CoinbaseWallet/walletlinkd/app"
)

func main() {
	fmt.Printf("walletlinkd %s-%s\n", app.Version, app.GitCommit)
}
