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

	s.Add("foo")

	require.Equal(t, 1, len(s))
	require.True(t, s.Contains("foo"))

	s.Add("bar")

	require.Equal(t, 2, len(s))
	require.True(t, s.Contains("bar"))

	s.Remove("foo")

	require.Equal(t, 1, len(s))
	require.False(t, s.Contains("foo"))
}
