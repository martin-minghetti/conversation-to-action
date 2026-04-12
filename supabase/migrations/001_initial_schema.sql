-- ============================================================
-- 001_initial_schema.sql
-- Initial schema for conversation-to-action
-- ============================================================

-- -------------------------------------------------------
-- workspaces
-- -------------------------------------------------------
CREATE TABLE workspaces (
  id         uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own workspaces"
  ON workspaces
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- -------------------------------------------------------
-- connections
-- -------------------------------------------------------
CREATE TABLE connections (
  id                     uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id           uuid        NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  type                   text        NOT NULL CHECK (type IN ('slack','discord','whatsapp','linear','notion','anthropic')),
  role                   text        NOT NULL CHECK (role IN ('source','sink','ai')),
  config                 jsonb       NOT NULL DEFAULT '{}',
  encrypted_credentials  text        NOT NULL,
  status                 text        NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','error')),
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own connections"
  ON connections
  FOR ALL
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE user_id = auth.uid()
    )
  );

-- -------------------------------------------------------
-- events
-- -------------------------------------------------------
CREATE TABLE events (
  id                 uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id       uuid        NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  connection_id      uuid        NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
  source_message_id  text        NOT NULL,
  channel_id         text        NOT NULL,
  thread_id          text,
  author             text        NOT NULL,
  text               text        NOT NULL,
  permalink          text,
  message_timestamp  timestamptz NOT NULL,
  processed          boolean     NOT NULL DEFAULT false,
  error              text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT events_connection_source_uniq UNIQUE (connection_id, source_message_id)
);

CREATE INDEX idx_events_unprocessed ON events (workspace_id, processed) WHERE processed = false;
CREATE INDEX idx_events_thread      ON events (connection_id, channel_id, thread_id);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own events"
  ON events
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE user_id = auth.uid()
    )
  );

-- -------------------------------------------------------
-- items
-- -------------------------------------------------------
CREATE TABLE items (
  id                   uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id         uuid        NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  type                 text        NOT NULL CHECK (type IN ('bug','feature','task','decision')),
  title                text        NOT NULL,
  description          text        NOT NULL,
  owner                text,
  confidence           integer     NOT NULL CHECK (confidence BETWEEN 0 AND 100),
  suggested_labels     text[]      NOT NULL DEFAULT '{}',
  status               text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','pushed','failed')),
  dedup_action         text        CHECK (dedup_action IN ('create','update','ambiguous')),
  dedup_match_id       text,
  dedup_similarity     real,
  external_id          text,
  external_url         text,
  source_channel_id    text        NOT NULL,
  source_thread_id     text,
  source_connection_id uuid        REFERENCES connections(id),
  review_message_id    text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_items_status ON items (workspace_id, status);

ALTER TABLE items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own items"
  ON items
  FOR ALL
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE user_id = auth.uid()
    )
  );

-- -------------------------------------------------------
-- item_sources
-- -------------------------------------------------------
CREATE TABLE item_sources (
  item_id        uuid NOT NULL REFERENCES items(id)  ON DELETE CASCADE,
  event_id       uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  evidence_quote text NOT NULL,
  PRIMARY KEY (item_id, event_id)
);

ALTER TABLE item_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own item_sources"
  ON item_sources
  FOR SELECT
  USING (
    item_id IN (
      SELECT i.id FROM items i
      JOIN workspaces w ON w.id = i.workspace_id
      WHERE w.user_id = auth.uid()
    )
  );

-- -------------------------------------------------------
-- sync_log
-- -------------------------------------------------------
CREATE TABLE sync_log (
  id               uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id          uuid        NOT NULL REFERENCES items(id)       ON DELETE CASCADE,
  connection_id    uuid        NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
  action           text        NOT NULL CHECK (action IN ('create','update','link_evidence')),
  external_id      text        NOT NULL,
  request_payload  jsonb,
  response_status  integer,
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own sync_log"
  ON sync_log
  FOR SELECT
  USING (
    item_id IN (
      SELECT i.id FROM items i
      JOIN workspaces w ON w.id = i.workspace_id
      WHERE w.user_id = auth.uid()
    )
  );
