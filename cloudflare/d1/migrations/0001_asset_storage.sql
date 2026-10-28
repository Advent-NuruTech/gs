-- AdventSkool file metadata. Product commerce rows and payment records remain
-- in Supabase during the staged migration; file bytes live only in R2.
CREATE TABLE IF NOT EXISTS storage_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  default_max_upload_bytes INTEGER NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO storage_settings (id, default_max_upload_bytes)
VALUES (1, 104857600);

CREATE TABLE IF NOT EXISTS account_storage_limits (
  account_id TEXT PRIMARY KEY,
  max_upload_bytes INTEGER,
  unlimited INTEGER NOT NULL DEFAULT 0 CHECK (unlimited IN (0, 1)),
  updated_by TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  product_kind TEXT NOT NULL CHECK (product_kind IN ('design', 'wealth')),
  product_id TEXT,
  purpose TEXT NOT NULL CHECK (purpose IN ('product_image', 'deliverable')),
  visibility TEXT NOT NULL CHECK (visibility IN ('public', 'private')),
  object_key TEXT NOT NULL UNIQUE,
  original_file_name TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  etag TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ready', 'deleted', 'failed')),
  legacy_source_url TEXT,
  migrated_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS assets_owner_idx ON assets(owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS assets_product_idx ON assets(product_kind, product_id);
CREATE INDEX IF NOT EXISTS assets_status_idx ON assets(status, created_at);
