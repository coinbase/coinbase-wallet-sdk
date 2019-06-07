CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE store (
  key         varchar(256) PRIMARY KEY,
  value       text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX trgm_idx_store_key ON store USING gin (key gin_trgm_ops);
