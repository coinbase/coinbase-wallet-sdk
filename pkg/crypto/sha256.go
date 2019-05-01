// Copyright (c) 2017-2019 Coinbase Inc. See LICENSE

package crypto

import (
	"crypto/sha256"
)

// SHA256 - hash data using SHA-256 algorithm
func SHA256(data []byte) []byte {
	h := sha256.New()
	h.Write(data)
	return h.Sum(nil)
}

// SHA256D - hash data using two rounds of SHA-256 algorithm
func SHA256D(data []byte) []byte {
	h := sha256.New()
	h.Write(data)
	h2 := sha256.New()
	h2.Write(h.Sum(nil))
	return h2.Sum(nil)
}
