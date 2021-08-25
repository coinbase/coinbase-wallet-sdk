// Copyright (c) 2018-2020 WalletLink.org <https://www.walletlink.org/>
// Copyright (c) 2018-2020 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

package store

import (
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

type dummy struct {
	X int `json:"x"`
	Y int `json:"y"`
}

func TestMemoryStoreNonExisting(t *testing.T) {
	ms := NewMemoryStore()

	foo := dummy{}
	ok, err := ms.Get("foo", &foo)
	require.False(t, ok)
	require.Nil(t, err)
}

func TestMemoryStoreSetGet(t *testing.T) {
	ms := NewMemoryStore()

	foo := dummy{X: 10, Y: 20}
	err := ms.Set("foo", &foo)
	require.Nil(t, err)

	bar := dummy{X: 111, Y: 222}
	err = ms.Set("bar", &bar)
	require.Nil(t, err)

	loadedFoo := dummy{}
	ok, err := ms.Get("foo", &loadedFoo)
	require.True(t, ok)
	require.Nil(t, err)

	require.Equal(t, 10, loadedFoo.X)
	require.Equal(t, 20, loadedFoo.Y)

	loadedBar := dummy{}
	ok, err = ms.Get("bar", &loadedBar)
	require.True(t, ok)
	require.Nil(t, err)

	require.Equal(t, 111, loadedBar.X)
	require.Equal(t, 222, loadedBar.Y)
}

func TestMemoryStoreOverwrite(t *testing.T) {
	ms := NewMemoryStore()

	foo := dummy{X: 10, Y: 20}
	err := ms.Set("foo", &foo)
	require.Nil(t, err)

	newFoo := dummy{X: 123, Y: 456}
	err = ms.Set("foo", &newFoo)
	require.Nil(t, err)

	loadedFoo := dummy{}
	ok, err := ms.Get("foo", &loadedFoo)
	require.True(t, ok)
	require.Nil(t, err)

	require.Equal(t, 123, loadedFoo.X)
	require.Equal(t, 456, loadedFoo.Y)
}

func TestMemoryStoreRemove(t *testing.T) {
	ms := NewMemoryStore()

	foo := dummy{X: 10, Y: 20}
	err := ms.Set("foo", &foo)
	require.Nil(t, err)

	err = ms.Remove("foo")
	require.Nil(t, err)

	loadedFoo := dummy{}
	ok, err := ms.Get("foo", &loadedFoo)
	require.False(t, ok)
	require.Nil(t, err)
}

func TestMemoryStoreFindByPrefix(t *testing.T) {
	ms := NewMemoryStore()

	startTime := time.Now().Unix() - 1

	foo := dummy{X: 123, Y: 20}
	err := ms.Set("prefix_foo", &foo)
	require.Nil(t, err)

	bar := dummy{X: 546, Y: 23}
	err = ms.Set("prefix_bar", &bar)
	require.Nil(t, err)

	values := []dummy{}
	err = ms.FindByPrefix("prefix", startTime, false, &values)
	require.Nil(t, err)
	require.Len(t, values, 2)
	require.Contains(t, values, foo)
	require.Contains(t, values, bar)

	values = []dummy{}
	err = ms.FindByPrefix("prefid", startTime, false, &values)
	require.Nil(t, err)
	require.Len(t, values, 0)

	values = []dummy{}
	err = ms.FindByPrefix("prefix_f", startTime, false, &values)
	require.Nil(t, err)
	require.Len(t, values, 1)
	require.Equal(t, foo, values[0])

	intValue := 1234
	err = ms.FindByPrefix("prefix", startTime, false, intValue)
	require.NotNil(t, err)

	err = ms.FindByPrefix("prefix", startTime, false, &intValue)
	require.NotNil(t, err)
}

func TestMemoryStoreMarkSeen(t *testing.T) {
	ms := NewMemoryStore()

	startTime := time.Now().Unix() - 1

	foo := dummy{X: 123, Y: 20}
	err := ms.Set("prefix_foo", &foo)
	require.Nil(t, err)

	bar := dummy{X: 546, Y: 23}
	err = ms.Set("prefix_bar", &bar)
	require.Nil(t, err)

	updated, err := ms.MarkSeen("prefix_foo")
	require.True(t, updated)
	require.Nil(t, err)

	values := []dummy{}
	err = ms.FindByPrefix("prefix_", startTime, true, &values)
	require.Nil(t, err)
	require.Len(t, values, 1)
	require.Contains(t, values, bar)
}
