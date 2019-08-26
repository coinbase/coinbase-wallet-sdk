// Copyright (c) 2018-2019 WalletLink.org <https://www.walletlink.org/>
// Copyright (c) 2018-2019 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

package util

import (
	"crypto/rand"
	"encoding/hex"

	"github.com/pkg/errors"
)

// RandomBytes - generate random bytes of length n
func RandomBytes(n int) ([]byte, error) {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		return nil, errors.Wrap(err, "failed to generate random bytes")
	}
	return b, nil
}

// RandomHex - generate random bytes of length n in hex representation.
// the length of the string returned is 2 * n.
func RandomHex(n int) (string, error) {
	b, err := RandomBytes(n)
	if err != nil {
		return "", err
	}
	return hex.EncodeToString(b), err
}
