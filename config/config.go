// Copyright (c) 2018-2020 WalletLink.org <https://www.walletlink.org/>
// Copyright (c) 2018-2020 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

package config

import (
	"log"
	"os"
	"strconv"
	"strings"

	"github.com/walletlink/walletlink/util"
)

const (
	// AppEnvDevelopment - development environment
	AppEnvDevelopment = "development"
	// AppEnvTest - test environment
	AppEnvTest = "test"
	// AppEnvProduction - production environment
	AppEnvProduction = "production"
)

var (
	// GitCommit is the current git commit hash
	GitCommit string

	// Version is the app version
	Version string
)

var (
	// AppEnv - application environment (development/test/production)
	AppEnv = getEnv("APP_ENV", "development")

	// Port - port to listen on
	Port, _ = strconv.ParseUint(getEnv("PORT", "8080"), 10, 16)

	// ServerURL - url of the server
	ServerURL = getEnv("SERVER_URL", "")

	// PostgresURL - postgreSQL server url
	PostgresURL = getEnv("DATABASE_URL", "")

	// AllowedOrigins - allowed RPC origins, space separated
	AllowedOrigins = func() util.StringSet {
		allowedOrigins := getEnv("ALLOWED_ORIGINS", "")
		if len(allowedOrigins) == 0 {
			return util.NewStringSet()
		}
		return util.StringSetFromStringSlice(strings.Split(allowedOrigins, " "))
	}()

	// ForceSSL - enforce HTTPS
	ForceSSL, _ = strconv.ParseBool(getEnv("FORCE_SSL", "false"))
)

func init() {
	if ForceSSL && len(ServerURL) == 0 {
		log.Fatal("SERVER_URL is required when FORCE_SSL is enabled")
	}
}

func getEnv(name string, defaultValue string) string {
	value := os.Getenv(name)
	if len(value) == 0 {
		return defaultValue
	}
	return value
}
