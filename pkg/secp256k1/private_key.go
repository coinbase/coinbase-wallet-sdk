// Copyright (c) 2017-2019 Coinbase Inc. See LICENSE

package secp256k1

import (
	"encoding/hex"

	secp256k1 "github.com/btcsuite/btcd/btcec"
	"github.com/pkg/errors"
)

// PrivateKey - 32-byte secp256k1 private key
type PrivateKey [32]byte

// PrivateKeyFromBytes - convert []byte to PrivateKey
func PrivateKeyFromBytes(bytes []byte) (*PrivateKey, error) {
	if len(bytes) != 32 {
		return nil, errors.Errorf("private key must be 32 bytes long")
	}
	var k PrivateKey
	copy(k[:], bytes)
	return &k, nil
}

// PrivateKeyFromString - convert a hex string to PrivateKey
func PrivateKeyFromString(hexString string) (*PrivateKey, error) {
	bytes, err := hex.DecodeString(hexString)
	if err != nil {
		return nil, errors.Wrap(err, "failed to parse hex string")
	}
	return PrivateKeyFromBytes(bytes)
}

// Sign - sign a hash with a secp256k1 private key
func (pvk PrivateKey) Sign(hash []byte) (*Signature, error) {
	privateKey, _ := secp256k1.PrivKeyFromBytes(secp256k1.S256(), pvk[:])

	sig, err := secp256k1.SignCompact(secp256k1.S256(), privateKey, hash, false)
	if err != nil {
		return nil, errors.Wrap(err, "signing failed")
	}

	// Move v to the end for compatibility with Ethereum
	var signature Signature
	v := sig[0]
	copy(signature[:], sig[1:])
	signature[64] = v

	return &signature, nil
}

// PublicKey - derive a public key from a private key
func (pvk PrivateKey) PublicKey() PublicKey {
	_, puk := secp256k1.PrivKeyFromBytes(secp256k1.S256(), pvk[:])
	publicKey, _ := PublicKeyFromBytes(puk.SerializeCompressed())
	return *publicKey
}

// String - hexadecimal representation
func (pvk PrivateKey) String() string {
	return hex.EncodeToString(pvk[:])
}

// Equals - compare two private keys and returns true if they are the same
func (pvk PrivateKey) Equals(pvk2 *PrivateKey) bool {
	return pvk == *pvk2
}
