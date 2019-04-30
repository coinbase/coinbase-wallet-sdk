// Copyright (c) 2017-2019 Coinbase Inc. See LICENSE

package config

import "os"

// PORT - port to listen on
var PORT = getEnv("PORT", "3000")

func getEnv(name string, defaultValue string) string {
	value := os.Getenv(name)
	if len(value) == 0 {
		return defaultValue
	}
	return value
}
