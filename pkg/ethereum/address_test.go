// Copyright (c) 2019 Coinbase, Inc. See LICENSE

package ethereum

import (
	"testing"

	"github.com/CoinbaseWallet/walletlinkd/pkg/secp256k1"
	"github.com/stretchr/testify/assert"
)

func TestAddressFromPublicKey(t *testing.T) {
	testCases := []struct {
		pubKey string
		addr   string
	}{
		{
			"028a8c59fa27d1e0f1643081ff80c3cf0392902acbf76ab0dc9c414b8d115b0ab3",
			"0xd11a13f484e2f2bd22d93c3c3131f61c05e876a9",
		},
		{
			"024ff6fdcb22e9f6a6e2efa88df7e97120883874a6c127b0decc01be7ebfde9289",
			"0xea6695e4f122822c51b711d0f3d6ccaf1d9f5579",
		},
		{
			"0360176e6591e6782fc4efdc3d0bd26882ccbb42217c6c52cb28cd75e542b8849c",
			"0x0bfd0a556b97edf81e2acc5fad6d642e338abc58",
		},
	}

	for _, tc := range testCases {
		publicKey, err := secp256k1.PublicKeyFromString(tc.pubKey)
		assert.Nil(t, err)

		addr := AddressFromPublicKey(publicKey)
		assert.Equal(t, tc.addr, addr)
	}
}

func TestIsValidAddress(t *testing.T) {
	testCases := []struct {
		addr  string
		valid bool
	}{
		{"0xd11a13f484e2f2bd22d93c3c3131f61c05e876a9", true},
		{"0xea6695e4f122822c51b711d0f3d6ccaf1d9f5579", true},
		{"0x0bfd0a556b97edf81e2acc5fad6d642e338abc58", true},
		{"0x0bfd0a556b97edf81e2acc5fad6d642e338abc5", false},
		{"0x0bfd0a556b97edf81e2acc5fad6d642e338abc58a", false},
		{"0x0bfd0a556b97edf81e2acc5fad6d642e338abc5z", false},
		{"0bfd0a556b97edf81e2acc5fad6d642e338abc5", false},
		{"", false},
	}

	for _, tc := range testCases {
		valid := IsValidAddress(tc.addr)
		assert.Equal(t, tc.valid, valid)
	}
}
