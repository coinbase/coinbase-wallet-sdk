// Copyright (c) 2019 Coinbase, Inc. See LICENSE

package secp256k1

import (
	"math/big"
	"strings"
	"testing"

	"github.com/CoinbaseWallet/walletlinkd/pkg/crypto"
)

var testCases = []struct {
	message   string
	signature string
}{
	{"a quick brown fox jumps over the", "75450ab63773aad4520fdda1d961f38e0a820177e572fdfa5dcd926e054cdea77c03804319cb891f4180e4a9868767c08094f18667c1239b416b33ef59773c821b"},
	{"back in my quaint garden, jaunty", "e4597baffa2ee8cfb7265932a9d0465874ee0784263c065588534062ff8c97c7407264a3c815be9aca8e88cf58aac5ab5ec3c238ba692d05138c5c8238632a0d1b"},
}

const privateKeyHex = "b7c984529f6214b8f59b88ee9f27e8f6eaf93efa3c2d216442a1ef9c3da536cb"
const publicKeyHex = "0327fd97f0ce195425581835b84ee3c9f73c973430dc91ab38110578d79c5a2690"

var privateKey *PrivateKey
var publicKey *PublicKey

func init() {
	privateKey, _ = PrivateKeyFromString(privateKeyHex)
	publicKey, _ = PublicKeyFromString(publicKeyHex)
}

func TestSign(t *testing.T) {
	for _, tc := range testCases {
		hash := crypto.SHA256D([]byte(tc.message))
		sig, err := privateKey.Sign(hash)
		if err != nil {
			t.Fatal(err)
		}

		if sig.String() != tc.signature {
			t.Fatalf("expected: %v, got: %v", tc.signature, sig)
		}
	}
}

func TestPublicKey(t *testing.T) {
	testCases := []struct {
		privateKey string
		publicKey  string
	}{
		{privateKeyHex, publicKeyHex},
		{"9ef3ff783a2e663101927c961edb57e4dcb95328ce0a6e1b6749b4b02687822c", "02ba8dd4d37f694922296136cbeb325bd599b52f5cf5ba093b73bfe65527a0a0c8"},
		{"58e0e636c53ba731a91ac34ff5645f341b75438af208b02528c144f010ba32e6", "035d82d6b91fc700dede554ace0100ee3bd76d0aa8104e120be5910c3ac0dfe2d5"},
	}

	for _, tc := range testCases {
		privateKey, _ := PrivateKeyFromString(tc.privateKey)
		publicKey, _ := PublicKeyFromString(tc.publicKey)

		puk := privateKey.PublicKey()
		if !puk.Equals(publicKey) {
			t.Fatalf("expected: %v, got: %v", publicKey, puk)
		}
	}
}

func TestRecoverPublicKey(t *testing.T) {
	for _, tc := range testCases {
		hash := crypto.SHA256D([]byte(tc.message))

		signature, _ := SignatureFromString(tc.signature)

		recoveredPublicKey, err := signature.RecoverPublicKey(hash)
		if err != nil {
			t.Fatal(err)
		}

		if !recoveredPublicKey.Equals(publicKey) {
			t.Fatalf("expected: %v, got: %v", recoveredPublicKey, recoveredPublicKey)
		}
	}
}

func TestRecoverPublicKeyRejectsMalleableSignature(t *testing.T) {
	tc := testCases[0]
	signature, _ := SignatureFromString(tc.signature)

	// manipulate signature's s-value
	s := new(big.Int).SetBytes(signature[32:64])
	s.Sub(n, s)

	copy(signature[32:64], s.Bytes())

	if signature.hasLowSValue() {
		t.Fatal("signature should now have high s-value")
	}

	hash := crypto.SHA256D([]byte(tc.message))
	_, err := signature.RecoverPublicKey(hash)
	if err == nil || !strings.Contains(err.Error(), "low s-value") {
		t.Fatalf("did not fail with expected error. got: %v", err)
	}
}

func TestRecoverPublicKeyRejectsInvalidSignature(t *testing.T) {
	tc := testCases[0]
	signature, _ := SignatureFromString(tc.signature)

	copy(signature[1:], []byte("invalid"))

	hash := crypto.SHA256D([]byte(tc.message))
	puk, _ := signature.RecoverPublicKey(hash)
	if puk.Equals(publicKey) {
		t.Fatalf("recovered public key should not have been the same")
	}
}
