-- Расширения (по необходимости)
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Основная таблица диаграмм
CREATE TABLE IF NOT EXISTS diagrams (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  registry_type TEXT,
  xml          TEXT NOT NULL,
  owner_id     BIGINT,
  version      INTEGER NOT NULL DEFAULT 1,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- История версий: хранит предыдущее состояние (снимки перед каждым update)
CREATE TABLE IF NOT EXISTS diagrams_versions (
  diagram_id   UUID NOT NULL REFERENCES diagrams(id) ON DELETE CASCADE,
  version      INTEGER NOT NULL,              -- номер "старой" версии
  name         TEXT NOT NULL,
  registry_type TEXT,
  xml          TEXT NOT NULL,
  modified_by  BIGINT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (diagram_id, version)
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_diagrams_owner_id ON diagrams(owner_id);
CREATE INDEX IF NOT EXISTS idx_diagrams_name_trgm ON diagrams USING GIN (name gin_trgm_ops);
