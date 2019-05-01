// Copyright (c) 2019 Coinbase, Inc. See LICENSE

package crypto

import (
	"golang.org/x/crypto/sha3"
)

// Keccak256 - hash data using Keccak-256 algorithm
func Keccak256(data []byte) []byte {
	h := sha3.NewLegacyKeccak256()
	h.Write(data)
	return h.Sum(nil)
}
