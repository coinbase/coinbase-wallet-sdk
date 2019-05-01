// Copyright (c) 2019 Coinbase, Inc. See LICENSE

package ethereum

import (
	"encoding/hex"
	"regexp"
	"strings"

	"github.com/CoinbaseWallet/walletlinkd/pkg/crypto"
	"github.com/CoinbaseWallet/walletlinkd/pkg/secp256k1"
)

var (
	ethereumAddressRegex = regexp.MustCompile("^0x[a-f0-9]{40}$")
)

// AddressFromPublicKey - convert public key to Ethereum address
func AddressFromPublicKey(publicKey *secp256k1.PublicKey) string {
	uncompressed := publicKey.Decompress()
	hash := crypto.Keccak256(uncompressed[1:])
	bytes := hash[len(hash)-20:]
	return "0x" + hex.EncodeToString(bytes)
}

// IsValidAddress - validates ethereum address format
func IsValidAddress(addr string) bool {
	return ethereumAddressRegex.MatchString(strings.ToLower(addr))
}
