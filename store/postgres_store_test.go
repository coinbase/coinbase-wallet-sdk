// Copyright (c) 2018-2020 WalletLink.org <https://www.walletlink.org/>
// Copyright (c) 2018-2020 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

package store

import (
	"database/sql"
	"testing"
	"time"

	_ "github.com/lib/pq" // register postgres adapter
	"github.com/stretchr/testify/require"
	"github.com/walletlink/walletlink/config"
)

var db *sql.DB

func setup(t *testing.T) {
	var err error
	db, err = sql.Open("postgres", config.PostgresURL)
	require.Nil(t, err)

	_, err = db.Query("TRUNCATE store CASCADE")
	require.Nil(t, err)
}

func teardown() {
	db.Close()
	db = nil
}

func TestPostgresStoreNonExisting(t *testing.T) {
	setup(t)
	defer teardown()

	ps, err := NewPostgresStore(config.PostgresURL, "store", 5, 5, time.Minute)
	require.Nil(t, err)
	defer ps.Close()

	foo := dummy{}
	ok, err := ps.Get("foo", &foo)
	require.False(t, ok)
	require.Nil(t, err)
}

func TestPostgresStoreGetSet(t *testing.T) {
	setup(t)
	defer teardown()

	ps, err := NewPostgresStore(config.PostgresURL, "store", 5, 5, time.Minute)
	require.Nil(t, err)
	defer ps.Close()

	foo := dummy{X: 10, Y: 20}
	err = ps.Set("foo", &foo)
	require.Nil(t, err)

	bar := dummy{X: 111, Y: 222}
	err = ps.Set("bar", &bar)
	require.Nil(t, err)

	loadedFoo := dummy{}
	ok, err := ps.Get("foo", &loadedFoo)
	require.True(t, ok)
	require.Nil(t, err)

	require.Equal(t, 10, loadedFoo.X)
	require.Equal(t, 20, loadedFoo.Y)

	var j string
	err = db.QueryRow("SELECT value FROM store WHERE key = $1", "foo").Scan(&j)
	require.Nil(t, err)
	require.JSONEq(t, `{"x": 10, "y": 20}`, j)

	loadedBar := dummy{}
	ok, err = ps.Get("bar", &loadedBar)
	require.True(t, ok)
	require.Nil(t, err)

	require.Equal(t, 111, loadedBar.X)
	require.Equal(t, 222, loadedBar.Y)

	j = ""
	err = db.QueryRow("SELECT value FROM store WHERE key = $1", "bar").Scan(&j)
	require.Nil(t, err)
	require.JSONEq(t, `{"x": 111, "y": 222}`, j)
}

func TestPosgresStoreOverwrite(t *testing.T) {
	setup(t)
	defer teardown()

	ps, err := NewPostgresStore(config.PostgresURL, "store", 5, 5, time.Minute)
	require.Nil(t, err)
	defer ps.Close()

	foo := dummy{X: 10, Y: 20}
	err = ps.Set("foo", &foo)
	require.Nil(t, err)

	newFoo := dummy{X: 123, Y: 456}
	err = ps.Set("foo", &newFoo)
	require.Nil(t, err)

	loadedFoo := dummy{}
	ok, err := ps.Get("foo", &loadedFoo)
	require.True(t, ok)
	require.Nil(t, err)

	require.Equal(t, 123, loadedFoo.X)
	require.Equal(t, 456, loadedFoo.Y)

	var j string
	err = db.QueryRow("SELECT value FROM store WHERE key = $1", "foo").Scan(&j)
	require.Nil(t, err)
	require.JSONEq(t, `{"x": 123, "y": 456}`, j)
}

func TestPostgresStoreRemove(t *testing.T) {
	setup(t)
	defer teardown()

	ps, err := NewPostgresStore(config.PostgresURL, "store", 5, 5, time.Minute)
	require.Nil(t, err)
	defer ps.Close()

	foo := dummy{X: 10, Y: 20}
	err = ps.Set("foo", &foo)
	require.Nil(t, err)

	err = ps.Remove("foo")
	require.Nil(t, err)

	loadedFoo := dummy{}
	ok, err := ps.Get("foo", &loadedFoo)
	require.False(t, ok)
	require.Nil(t, err)

	n := -1
	err = db.QueryRow("SELECT count(*) FROM store WHERE key = $1", "foo").Scan(&n)
	require.Nil(t, err)
	require.Equal(t, 0, n)
}

func TestPostgresStoreFindByPrefix(t *testing.T) {
	setup(t)
	defer teardown()

	ps, err := NewPostgresStore(config.PostgresURL, "store", 5, 5, time.Minute)
	require.Nil(t, err)
	defer ps.Close()

	startTime := time.Now().Unix()

	foo := dummy{X: 123, Y: 20}
	err = ps.Set("prefix_foo", &foo)
	require.Nil(t, err)

	bar := dummy{X: 546, Y: 23}
	err = ps.Set("prefix_bar", &bar)
	require.Nil(t, err)

	values := []dummy{}
	err = ps.FindByPrefix("prefix", startTime, false, &values)
	require.Nil(t, err)
	require.Len(t, values, 2)
	require.Contains(t, values, foo)
	require.Contains(t, values, bar)

	values = []dummy{}
	err = ps.FindByPrefix("prefid", startTime, false, &values)
	require.Nil(t, err)
	require.Len(t, values, 0)

	values = []dummy{}
	err = ps.FindByPrefix("prefix_f", startTime, false, &values)
	require.Nil(t, err)
	require.Len(t, values, 1)
	require.Equal(t, foo, values[0])

	intValue := 1234
	err = ps.FindByPrefix("prefix", startTime, false, intValue)
	require.NotNil(t, err)

	err = ps.FindByPrefix("prefix", startTime, false, &intValue)
	require.NotNil(t, err)
}

func TestPostgresStoreMarkSeen(t *testing.T) {
	setup(t)
	defer teardown()

	ps, err := NewPostgresStore(config.PostgresURL, "store", 5, 5, time.Minute)
	require.Nil(t, err)
	defer ps.Close()

	startTime := time.Now().Unix() - 1

	foo := dummy{X: 123, Y: 20}
	err = ps.Set("prefix_foo", &foo)
	require.Nil(t, err)

	bar := dummy{X: 546, Y: 23}
	err = ps.Set("prefix_bar", &bar)
	require.Nil(t, err)

	updated, err := ps.MarkSeen("prefix_foo")
	require.True(t, updated)
	require.Nil(t, err)

	values := []dummy{}
	err = ps.FindByPrefix("prefix_", startTime, true, &values)
	require.Nil(t, err)
	require.Len(t, values, 1)
	require.Contains(t, values, bar)
}
