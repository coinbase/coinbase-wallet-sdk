// Copyright (c) 2017-2019 Coinbase Inc. See LICENSE

package ethereum

import (
	"encoding/hex"
	"testing"

	"github.com/CoinbaseWallet/walletlinkd/pkg/secp256k1"
	"github.com/stretchr/testify/assert"
)

var (
	privateKey, _ = secp256k1.PrivateKeyFromString(
		"9703fceda5a0bada47af806d90d8e33250b71308ea583b37a1d0615c683e7fce",
	)

	testCases = []struct {
		msg string
		sig string
	}{
		{
			"a quick brown fox jumps over the",
			"fd36371961ceda2ead3ca396d6f751853a4b80b4392f9cd9d6f9c90ece10cf2c63bcff1eff45c884c46de8e1b19e276680a0d5e4f1b5a57480af293d40b7908e1b",
		},
		{
			"back in my quaint garden, jaunty",
			"dd95d06e2271cae5184e20a490381808016c5be40592b08e4e928ca27e77f3672352f154c17be61ea75fafaaa034d98a0a7cecd8ad25300d7e06a036f14ecff41c",
		},
	}
)

func TestEthSign(t *testing.T) {
	for _, tc := range testCases {
		sig, err := EthSign(tc.msg, privateKey)
		assert.Nil(t, err)
		sigHex := hex.EncodeToString(sig)
		assert.Equal(t, tc.sig, sigHex)
	}
}

func TestEcRecover(t *testing.T) {
	for _, tc := range testCases {
		sigBytes, _ := hex.DecodeString(tc.sig)
		address, err := EcRecover(tc.msg, sigBytes)
		assert.Nil(t, err)
		assert.Equal(t, address, "0xfa1f9244527e708e37e3db30ec04fcae621ea694")
	}
}
