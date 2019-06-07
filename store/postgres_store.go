// Copyright (c) 2019 Coinbase, Inc. See LICENSE

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

// FindByPrefix - load all values whose key starts with the given prefix that
// were updated after since.
func (ps *PostgresStore) FindByPrefix(
	prefix string,
	since int64,
	values interface{},
) error {
	valuesValue := reflect.ValueOf(values)
	if valuesValue.Kind() != reflect.Ptr ||
		valuesValue.Elem().Kind() != reflect.Slice {
		return errors.New("values must be a pointer to a slice")
	}

	query := fmt.Sprintf(
		`SELECT value
		FROM %s
		WHERE key LIKE $1 || '%%' AND updated_at > $2 ORDER BY updated_at DESC`,
		ps.tableName,
	)
	rows, err := ps.db.Query(query, prefix, time.Unix(since, 0))
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
