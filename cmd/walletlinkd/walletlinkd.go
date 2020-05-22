// Copyright (c) 2018-2020 WalletLink.org <https://www.walletlink.org/>
// Copyright (c) 2018-2020 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

package main

import (
	"fmt"
	"log"
	"os"
	"path/filepath"

	"github.com/walletlink/walletlink/store"

	"github.com/walletlink/walletlink/webhook"

	"github.com/pkg/errors"
	"github.com/walletlink/walletlink/config"
	"github.com/walletlink/walletlink/server"
)

func main() {
	execFile, err := os.Executable()
	if err != nil {
		log.Fatalln(errors.Wrap(err, "could not determine executable path"))
	}
	execDir := filepath.Dir(execFile)
	webRoot := filepath.Join(execDir, "public")

	var st store.Store
	if len(config.PostgresURL) == 0 {
		st = store.NewMemoryStore()
	} else {
		var err error
		st, err = store.NewPostgresStore(
			config.PostgresURL,
			"store",
			int(config.PGMaxIdelConns),
			int(config.PGMaxOpenConns),
			config.PGConnMaxLifetime,
		)

		if err != nil {
			log.Panicln(err)
		}
	}

	srv := server.NewServer(&server.NewServerOptions{
		Store:          st,
		WebRoot:        webRoot,
		AllowedOrigins: config.AllowedOrigins,
		Webhook:        webhook.NewWebhook(config.ServerURL),
		ServerURL:      config.ServerURL,
		ForceSSL:       config.ForceSSL,
		ReadDeadline:   config.ReadDeadline,
	})

	fmt.Printf(
		"walletlinkd %s-%s listening on port %d...\n"+
			"Serving static assets in %s...\n",
		config.Version,
		config.GitCommit,
		config.Port,
		webRoot,
	)
	srv.Start(uint(config.Port))
}
