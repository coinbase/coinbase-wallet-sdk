// Copyright (c) 2019 Coinbase, Inc. See LICENSE

package store

import (
	"database/sql"
	"encoding/json"
	"fmt"

	_ "github.com/lib/pq" // register postgres adapter
	"github.com/pkg/errors"
)

// PostgresStore - persistent postgres store
type PostgresStore struct {
	db        *sql.DB
	tableName string
}

// NewPostgresStore - make a connection to a PostgreSQL instance, and return
// a PostgresStore
func NewPostgresStore(url, tableName string) (*PostgresStore, error) {
	db, err := sql.Open("postgres", url)
	if err != nil {
		return nil, errors.Wrap(err, "unable to open a postgres connection")
	}

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
