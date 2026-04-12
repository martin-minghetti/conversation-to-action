// ============================================================
// database.types.ts
// Manually typed interfaces matching 001_initial_schema.sql
// ============================================================

// ------- Union types -------

export type ConnectionType = 'slack' | 'discord' | 'whatsapp' | 'linear' | 'notion' | 'anthropic';
export type ConnectionRole = 'source' | 'sink' | 'ai';
export type ConnectionStatus = 'active' | 'paused' | 'error';

export type ItemType = 'bug' | 'feature' | 'task' | 'decision';
export type ItemStatus = 'pending' | 'approved' | 'rejected' | 'pushed' | 'failed';
export type DedupAction = 'create' | 'update' | 'ambiguous';

export type SyncAction = 'create' | 'update' | 'link_evidence';

// ------- Table interfaces -------

export interface Workspace {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export interface Connection {
  id: string;
  workspace_id: string;
  type: ConnectionType;
  role: ConnectionRole;
  config: Record<string, unknown>;
  encrypted_credentials: string;
  status: ConnectionStatus;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  workspace_id: string;
  connection_id: string;
  source_message_id: string;
  channel_id: string;
  thread_id: string | null;
  author: string;
  text: string;
  permalink: string | null;
  message_timestamp: string;
  processed: boolean;
  error: string | null;
  created_at: string;
}

export interface Item {
  id: string;
  workspace_id: string;
  type: ItemType;
  title: string;
  description: string;
  owner: string | null;
  confidence: number;
  suggested_labels: string[];
  status: ItemStatus;
  dedup_action: DedupAction | null;
  dedup_match_id: string | null;
  dedup_similarity: number | null;
  external_id: string | null;
  external_url: string | null;
  source_channel_id: string;
  source_thread_id: string | null;
  source_connection_id: string | null;
  review_message_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ItemSource {
  item_id: string;
  event_id: string;
  evidence_quote: string;
}

// ------- Supabase Database generic type -------
// Used to type createClient<Database>() in supabase.ts

export type Database = {
  public: {
    Tables: {
      workspaces:  { Row: Workspace;    Insert: Omit<Workspace,  'id' | 'created_at'>; Update: Partial<Omit<Workspace,  'id'>>; };
      connections: { Row: Connection;   Insert: Omit<Connection, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Omit<Connection, 'id'>>; };
      events:      { Row: Event;        Insert: Omit<Event,      'id' | 'created_at'>; Update: Partial<Omit<Event,      'id'>>; };
      items:       { Row: Item;         Insert: Omit<Item,       'id' | 'created_at' | 'updated_at'>; Update: Partial<Omit<Item,       'id'>>; };
      item_sources:{ Row: ItemSource;   Insert: ItemSource;                                            Update: Partial<ItemSource>; };
      sync_log:    { Row: SyncLogEntry; Insert: Omit<SyncLogEntry,'id' | 'created_at'>;               Update: Partial<Omit<SyncLogEntry,'id'>>; };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};

export interface SyncLogEntry {
  id: string;
  item_id: string;
  connection_id: string;
  action: SyncAction;
  external_id: string;
  request_payload: Record<string, unknown> | null;
  response_status: number | null;
  created_at: string;
}
