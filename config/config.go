// Copyright (c) 2019 Coinbase, Inc. See LICENSE

package config

import (
	"os"
	"strings"

	"github.com/CoinbaseWallet/walletlinkd/util"
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
	Port = getEnv("PORT", "8080")

	// NotificationServerSecret - secret for the push notification server
	NotificationServerSecret = getEnv("NOTIFICATION_SERVER_SECRET", "")

	// NotificationServerURL - url for the push notification server
	NotificationServerURL = getEnv("NOTIFICATION_SERVER_URL", "")

	// PostgresURL - postgreSQL server url
	PostgresURL = getEnv("POSTGRES_URL", "")

	// AllowedOrigins - allowed RPC origins, space separated
	AllowedOrigins = func() util.StringSet {
		allowedOrigins := getEnv("ALLOWED_ORIGINS", "")
		if len(allowedOrigins) == 0 {
			return util.NewStringSet()
		}
		return util.StringSetFromStringSlice(strings.Split(allowedOrigins, " "))
	}()
)

func getEnv(name string, defaultValue string) string {
	value := os.Getenv(name)
	if len(value) == 0 {
		return defaultValue
	}
	return value
}
