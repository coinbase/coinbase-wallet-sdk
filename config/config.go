// Copyright (c) 2019 Coinbase, Inc. See LICENSE

package config

import "os"

var (
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
)

func getEnv(name string, defaultValue string) string {
	value := os.Getenv(name)
	if len(value) == 0 {
		return defaultValue
	}
	return value
}
