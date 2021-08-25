// Copyright (c) 2018-2020 WalletLink.org <https://www.walletlink.org/>
// Copyright (c) 2018-2020 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

package util

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestStringSet(t *testing.T) {
	s := NewStringSet()

	require.Equal(t, 0, len(s))
	require.False(t, s.Contains("foo"))
	require.False(t, s.Contains("bar"))

	s.Add("foo")

	require.Equal(t, 1, len(s))
	require.True(t, s.Contains("foo"))
	require.False(t, s.Contains("bar"))

	s.Add("bar")

	require.Equal(t, 2, len(s))
	require.True(t, s.Contains("foo"))
	require.True(t, s.Contains("bar"))

	s.Remove("foo")

	require.Equal(t, 1, len(s))
	require.False(t, s.Contains("foo"))
	require.True(t, s.Contains("bar"))
}

func TestStringSetFromStringSlice(t *testing.T) {
	s := StringSetFromStringSlice([]string{})

	require.Equal(t, 0, len(s))
	require.False(t, s.Contains("foo"))

	s = StringSetFromStringSlice([]string{"foo"})

	require.Equal(t, 1, len(s))
	require.True(t, s.Contains("foo"))
	require.False(t, s.Contains("bar"))

	s = StringSetFromStringSlice([]string{"foo", "bar"})

	require.Equal(t, 2, len(s))
	require.True(t, s.Contains("foo"))
	require.True(t, s.Contains("bar"))

	s = StringSetFromStringSlice([]string{"bar"})

	require.Equal(t, 1, len(s))
	require.False(t, s.Contains("foo"))
	require.True(t, s.Contains("bar"))
}
