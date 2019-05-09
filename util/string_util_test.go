// Copyright (c) 2019 Coinbase, Inc. See LICENSE

package util

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestIsBlankString(t *testing.T) {
	require.True(t, IsBlankString(""))
	require.True(t, IsBlankString("\n"))
	require.True(t, IsBlankString("\t"))
	require.True(t, IsBlankString(" "))
	require.True(t, IsBlankString("  \t  \n \t\n  "))
}

func TestIsHexString(t *testing.T) {
	require.True(t, IsHexString(""))
	require.True(t, IsHexString("a"))
	require.True(t, IsHexString("cafebabe"))
	require.True(t, IsHexString("1234567890abcdef"))

	require.False(t, IsHexString("g"))
	require.False(t, IsHexString(" "))
	require.False(t, IsHexString("cafe babe"))
	require.False(t, IsHexString("cafebaby"))
	require.False(t, IsHexString("abcd-1234"))
}
