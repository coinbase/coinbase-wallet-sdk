// Copyright (c) 2018-2020 WalletLink.org <https://www.walletlink.org/>
// Copyright (c) 2018-2020 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

package store

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"reflect"
	"time"

	_ "github.com/lib/pq" // register postgres adapter
	"github.com/pkg/errors"
)

// PostgresStore - persistent postgres store
type PostgresStore struct {
	db        *sql.DB
	tableName string
}

var _ Store = (*PostgresStore)(nil)

// NewPostgresStore - make a connection to a PostgreSQL instance, and return
// a PostgresStore
func NewPostgresStore(
	url, tableName string,
	maxIdleConns, maxOpenConns int,
	maxConnMaxLifetime time.Duration,
) (*PostgresStore, error) {
	db, err := sql.Open("postgres", url)
	if err != nil {
		return nil, errors.Wrap(err, "unable to open a postgres connection")
	}

	db.SetMaxIdleConns(maxIdleConns)
	db.SetMaxOpenConns(maxOpenConns)
	db.SetConnMaxLifetime(maxConnMaxLifetime)

	return &PostgresStore{
		db:        db,
		tableName: tableName,
	}, nil
}

// Close - close PostgreSQL connection
func (ps *PostgresStore) Close() error {
	return ps.db.Close()
}

// Set - save the value to the postgres database under a given key
func (ps *PostgresStore) Set(key string, value interface{}) error {
	j, err := json.Marshal(value)
	if err != nil {
		return errors.Wrap(err, "could not serialize value")
	}

	_, err = ps.db.Exec(
		fmt.Sprintf(
			`INSERT INTO %s (key, value) VALUES ($1, $2)
			ON CONFLICT (key)
			DO UPDATE SET key = $1, value = $2, updated_at = now()`,
			ps.tableName,
		),
		key,
		string(j),
	)
	if err != nil {
		return errors.Wrap(err, "failed to insert value into postgres store")
	}

	return nil
}

// Get - load data for a given key. value passed must be a reference.
// (false, nil) is returned if key does not exist.
func (ps *PostgresStore) Get(key string, value interface{}) (bool, error) {
	var j string
	err := ps.db.QueryRow(
		fmt.Sprintf("SELECT value FROM %s WHERE key = $1", ps.tableName),
		key,
	).Scan(&j)
	if err != nil {
		if err == sql.ErrNoRows {
			return false, nil
		}
		return false, errors.Wrap(err, "failed to load value from postgres store")
	}

	if err = json.Unmarshal([]byte(j), value); err != nil {
		return false, errors.Wrap(err, "could not deserialize value")
	}

	return true, nil
}

// FindByPrefix - load all values whose key starts with the given prefix that
// were updated after since. If unseen is true, only return values that have not
// been marked seen.
func (ps *PostgresStore) FindByPrefix(
	prefix string,
	since int64,
	unseen bool,
	values interface{},
) error {
	valuesValue := reflect.ValueOf(values)
	if valuesValue.Kind() != reflect.Ptr ||
		valuesValue.Elem().Kind() != reflect.Slice {
		return errors.New("values must be a pointer to a slice")
	}

	q := fmt.Sprintf(
		`SELECT value
		FROM %s
		WHERE key LIKE $1 || '%%' AND updated_at > $2`,
		ps.tableName,
	)
	if unseen {
		q += " AND seen_at IS NULL"
	}
	q += " ORDER BY updated_at DESC"

	rows, err := ps.db.Query(q, prefix, time.Unix(since, 0))
	if err != nil {
		return errors.Wrap(err, "failed to load values from postgres store")
	}
	defer rows.Close()

	sliceType := reflect.TypeOf(values).Elem()
	elemType := sliceType.Elem()

	vs := reflect.New(sliceType).Elem()

	for rows.Next() {
		var j string
		if err = rows.Scan(&j); err != nil {
			return errors.Wrap(err, "failed to scan row")
		}

		value := reflect.New(elemType).Interface()
		if err = json.Unmarshal([]byte(j), value); err != nil {
			continue
		}

		vs = reflect.Append(vs, reflect.ValueOf(value).Elem())
	}

	reflect.ValueOf(values).Elem().Set(vs)

	return nil
}

// MarkSeen - mark the value with the given key as seen
func (ps *PostgresStore) MarkSeen(key string) (updated bool, err error) {
	result, err := ps.db.Exec(
		fmt.Sprintf(
			"UPDATE %s SET seen_at = now(), updated_at = now() WHERE key = $1",
			ps.tableName,
		),
		key,
	)
	if err != nil {
		return false, errors.Wrap(err, "failed to update value")
	}
	num, _ := result.RowsAffected()
	return num > 0, nil
}

// Remove - remove a key. does not return an error if key does not exist
func (ps *PostgresStore) Remove(key string) error {
	_, err := ps.db.Exec(
		fmt.Sprintf("DELETE FROM %s WHERE key = $1", ps.tableName),
		key,
	)
	if err != nil && err != sql.ErrNoRows {
		return errors.Wrap(err, "failed to delete value")
	}

	return nil
}
