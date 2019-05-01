// Copyright (c) 2017-2019 Coinbase Inc. See LICENSE

package secp256k1

import (
	"encoding/hex"
	"math/big"

	secp256k1 "github.com/btcsuite/btcd/btcec"
	"github.com/pkg/errors"
)

// Signature - a 65-byte secp256k1 signature
type Signature [65]byte

// SignatureFromBytes - convert []byte to Signature
func SignatureFromBytes(bytes []byte) (*Signature, error) {
	if len(bytes) != 65 {
		return nil, errors.Errorf("signature must be 65 bytes long")
	}
	var sig Signature
	copy(sig[:], bytes)
	return &sig, nil
}

// SignatureFromString - convert a hex string to Signature
func SignatureFromString(hexString string) (*Signature, error) {
	bytes, err := hex.DecodeString(hexString)
	if err != nil {
		return nil, errors.Wrap(err, "failed to parse hex string")
	}
	return SignatureFromBytes(bytes)
}

// RecoverPublicKey - recover a public key from a signed hash
func (sig Signature) RecoverPublicKey(hash []byte) (*PublicKey, error) {
	// enforce low-s values to reject malleable signatures
	if !sig.hasLowSValue() {
		return nil, errors.Errorf("signature must have low s-value")
	}

	// Move v to the front
	v := sig[64]
	sig2 := make([]byte, 65)
	copy(sig2[1:], sig[:])
	sig2[0] = v

	pubKey, _, err := secp256k1.RecoverCompact(secp256k1.S256(), sig2, hash)
	if err != nil {
		return nil, errors.Wrap(err, "public key recovery failed")
	}

	return PublicKeyFromBytes(pubKey.SerializeCompressed())
}

// hasLowSValue - return true if signature has low s-value
func (sig Signature) hasLowSValue() bool {
	s := new(big.Int).SetBytes(sig[32:64])
	return s.Cmp(halfN) <= 0
}

// String - hexadecimal representation
func (sig Signature) String() string {
	return hex.EncodeToString(sig[:])
}

// Equals - compare two signnatures and returns true if they are the same
func (sig Signature) Equals(sig2 *Signature) bool {
	return sig == *sig2
}

// Clone - copy a signature and returns the pointer to the copy, unless nil
func (sig *Signature) Clone() *Signature {
	if sig == nil {
		return nil
	}
	copied := *sig
	return &copied
}
