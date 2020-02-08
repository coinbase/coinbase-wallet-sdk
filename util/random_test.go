// Copyright (c) 2018-2020 WalletLink.org <https://www.walletlink.org/>
// Copyright (c) 2018-2020 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

package util

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestRandomBytes(t *testing.T) {
	b1, err := RandomBytes(8)
	require.Nil(t, err)
	b2, err := RandomBytes(8)
	require.Nil(t, err)
	b3, err := RandomBytes(8)
	require.Nil(t, err)

	require.NotEqual(t, b1, b2)
	require.NotEqual(t, b2, b3)
	require.NotEqual(t, b3, b1)

	b, err := RandomBytes(0)
	require.Nil(t, err)
	require.Len(t, b, 0)
	b, err = RandomBytes(1)
	require.Nil(t, err)
	require.Len(t, b, 1)
	b, err = RandomBytes(16)
	require.Nil(t, err)
	require.Len(t, b, 16)
}

func TestRandomHex(t *testing.T) {
	b1, err := RandomHex(8)
	require.Nil(t, err)
	require.True(t, IsHexString(b1))
	b2, err := RandomHex(8)
	require.Nil(t, err)
	require.True(t, IsHexString(b2))
	b3, err := RandomHex(8)
	require.Nil(t, err)
	require.True(t, IsHexString(b3))

	require.NotEqual(t, b1, b2)
	require.NotEqual(t, b2, b3)
	require.NotEqual(t, b3, b1)

	b, err := RandomHex(0)
	require.Nil(t, err)
	require.True(t, IsHexString(b))
	require.Len(t, b, 0)
	b, err = RandomHex(1)
	require.Nil(t, err)
	require.True(t, IsHexString(b))
	require.Len(t, b, 2)
	b, err = RandomHex(16)
	require.Nil(t, err)
	require.True(t, IsHexString(b))
	require.Len(t, b, 32)
}
