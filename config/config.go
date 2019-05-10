// Copyright (c) 2019 Coinbase, Inc. See LICENSE

package config

import "os"

const (
	// AppEnvDevelopment - development environment
	AppEnvDevelopment = "development"
	// AppEnvTest - test environment
	AppEnvTest = "test"
	// AppEnvProduction - production environment
	AppEnvProduction = "production"
)

var (
	// AppEnv - application environment (development/test/production)
	AppEnv = getEnv("APP_ENV", "development")
	// Port - port to listen on
	Port = getEnv("PORT", "3000")
	// NotificationServerSecret - secret for authenticating with
	// push notification server
	NotificationServerSecret = getEnv("NOTIFICATION_SERVER_SECRET", "")
	// NotificationServerURL - the url for the push notification server
	NotificationServerURL = getEnv(
		"NOTIFICATION_SERVER_URL",
		"http://localhost:3000",
	)
	// PostgresURL - postgreSQL server url
	PostgresURL = getEnv("POSTGRES_URL", "")
)

func getEnv(name string, defaultValue string) string {
	value := os.Getenv(name)
	if len(value) == 0 {
		return defaultValue
	}
	return value
}
