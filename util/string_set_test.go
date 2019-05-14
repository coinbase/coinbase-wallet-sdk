// Copyright (c) 2019 Coinbase, Inc. See LICENSE

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
