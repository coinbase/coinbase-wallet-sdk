// Copyright (c) 2019 Coinbase, Inc. See LICENSE

package ethereum

import (
	"fmt"

	"github.com/CoinbaseWallet/walletlinkd/pkg/crypto"
	"github.com/CoinbaseWallet/walletlinkd/pkg/secp256k1"
	"github.com/pkg/errors"
)

// EthSign - perform eth_sign with prefix
func EthSign(
	message string,
	privateKey *secp256k1.PrivateKey,
) ([]byte, error) {
	// https://github.com/ethereum/wiki/wiki/JSON-RPC#eth_sign
	hash := hashMessage(message)
	sig, err := privateKey.Sign(hash)
	if err != nil {
		return nil, errors.Wrap(err, "signing failed")
	}
	return sig[:], nil
}

// EcRecover - recover ethereum address from a signed message
func EcRecover(message string, sigBytes []byte) (string, error) {
	sig, err := secp256k1.SignatureFromBytes(sigBytes)
	if err != nil {
		return "", errors.Wrap(err, "signature is invalid")
	}
	hash := hashMessage(message)
	pubKey, err := sig.RecoverPublicKey(hash)
	if err != nil {
		return "", errors.Wrap(err, "public key recovery failed")
	}
	return AddressFromPublicKey(pubKey), nil
}

func hashMessage(message string) []byte {
	return crypto.Keccak256([]byte(
		fmt.Sprintf("\x19Ethereum Signed Message:\n%d%s", len(message), message),
	))
}
