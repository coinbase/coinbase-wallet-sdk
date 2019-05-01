// Copyright (c) 2017-2019 Coinbase Inc. See LICENSE

package secp256k1

import (
	"encoding/hex"

	secp256k1 "github.com/btcsuite/btcd/btcec"
	"github.com/pkg/errors"
)

// PublicKey - a 33-byte secp256k1 public key
type PublicKey [33]byte

// PublicKeyFromBytes - convert []byte to PublicKey
func PublicKeyFromBytes(bytes []byte) (*PublicKey, error) {
	if len(bytes) != 33 {
		return nil, errors.Errorf("public key must be 33 bytes long")
	}
	var k PublicKey
	copy(k[:], bytes)
	return &k, nil
}

// PublicKeyFromString - convert a hex string to PublicKey
func PublicKeyFromString(hexString string) (*PublicKey, error) {
	bytes, err := hex.DecodeString(hexString)
	if err != nil {
		return nil, errors.Wrap(err, "failed to parse hex string")
	}
	return PublicKeyFromBytes(bytes)
}

// String - hexadecimal representation
func (puk PublicKey) String() string {
	return hex.EncodeToString(puk[:])
}

// Equals - compare two public keys and returns true if they are the same
func (puk PublicKey) Equals(puk2 *PublicKey) bool {
	return puk == *puk2
}

// Decompress - return uncompressed public key
func (puk PublicKey) Decompress() []byte {
	pubKey, _ := secp256k1.ParsePubKey(puk[:], secp256k1.S256())
	return pubKey.SerializeUncompressed()
}
