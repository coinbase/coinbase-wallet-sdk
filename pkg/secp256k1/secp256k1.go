// Copyright (c) 2019 Coinbase, Inc. See LICENSE

package secp256k1

import (
	"math/big"

	secp256k1 "github.com/btcsuite/btcd/btcec"
)

var (
	n     = secp256k1.S256().N
	halfN = new(big.Int).Rsh(n, 1)
)
