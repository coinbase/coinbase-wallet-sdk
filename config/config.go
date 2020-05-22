// Copyright (c) 2018-2020 WalletLink.org <https://www.walletlink.org/>
// Copyright (c) 2018-2020 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

package config

import (
	"log"
	"os"
	"strconv"
	"strings"
	"time"

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

	// ReadDeadline - Deadline for reading messages
	ReadDeadline time.Duration

	// WebhookTimeout - Timeout for webhook
	WebhookTimeout time.Duration

	// PGMaxIdelConns - maximum number of idle connections to postgres
	PGMaxIdelConns, _ = strconv.ParseUint(
		getEnv("PG_MAX_IDLE_CONNS", "10"), 10, 16)

	// PGMaxOpenConns - maximum number of open connections to postgres
	PGMaxOpenConns, _ = strconv.ParseUint(
		getEnv("PG_MAX_OPEN_CONNS", "30"), 10, 16)

	// PGConnMaxLifetime - maximum amount of time a connection may be reused
	PGConnMaxLifetime time.Duration
)

func init() {
	if ForceSSL && len(ServerURL) == 0 {
		log.Fatal("SERVER_URL is required when FORCE_SSL is enabled")
	}

	readDeadlineSecs, _ := strconv.Atoi(getEnv("READ_DEADLINE_SECS", "30"))
	ReadDeadline = time.Second * time.Duration(readDeadlineSecs)

	webhookTimeoutSecs, _ := strconv.Atoi(getEnv("WEBHOOK_TIMEOUT_SECS", "10"))
	WebhookTimeout = time.Second * time.Duration(webhookTimeoutSecs)

	pgConnMaxLifetimeSecs, _ := strconv.Atoi(getEnv("PG_CONN_MAX_LIFETIME", "600"))
	PGConnMaxLifetime = time.Second * time.Duration(pgConnMaxLifetimeSecs)
}

func getEnv(name string, defaultValue string) string {
	value := os.Getenv(name)
	if len(value) == 0 {
		return defaultValue
	}
	return value
}
