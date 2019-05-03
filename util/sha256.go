// Copyright (c) 2019 Coinbase, Inc. See LICENSE

package util

import "crypto/sha256"

// SHA256 - hash data using SHA-256 algorithm
func SHA256(data []byte) []byte {
	h := sha256.New()
	h.Write(data)
	return h.Sum(nil)
}
