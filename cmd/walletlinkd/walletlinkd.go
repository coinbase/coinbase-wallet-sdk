// Copyright (c) 2017-2019 Coinbase Inc. See LICENSE

package main

import (
	"fmt"
	"log"
	"net/http"

	"github.com/CoinbaseWallet/walletlinkd/app"
	"github.com/CoinbaseWallet/walletlinkd/config"
)

func main() {
	http.HandleFunc("/", root)

	fmt.Printf("walletlinkd %s-%s listening on port %s...\n", app.Version, app.GitCommit, config.PORT)
	log.Fatal(http.ListenAndServe(fmt.Sprintf("0.0.0.0:%s", config.PORT), nil))
}

func root(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(200)
	w.Write([]byte(`{"status":"ok"}`))
}
