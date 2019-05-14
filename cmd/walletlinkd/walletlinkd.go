// Copyright (c) 2019 Coinbase, Inc. See LICENSE

package main

import (
	"fmt"
	"log"
	"os"
	"path/filepath"

	"github.com/CoinbaseWallet/walletlinkd/config"
	"github.com/CoinbaseWallet/walletlinkd/server"
	"github.com/pkg/errors"
)

func main() {
	execFile, err := os.Executable()
	if err != nil {
		log.Fatalln(errors.Wrap(err, "could not determine executable path"))
	}
	execDir := filepath.Dir(execFile)
	webRoot := filepath.Join(execDir, "public")

	srv := server.NewServer(&server.NewServerOptions{
		PostgresURL:    config.PostgresURL,
		WebRoot:        webRoot,
		AllowedOrigins: config.AllowedOrigins,
	})

	fmt.Printf(
		"walletlinkd %s-%s listening on port %s...\n"+
			"Serving static assets in %s...\n",
		config.Version,
		config.GitCommit,
		config.Port,
		webRoot,
	)
	srv.Start(config.Port)
}
