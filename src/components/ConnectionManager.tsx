"use client";

import { useEffect, useState } from "react";
import type { ConnectionRole, ConnectionType } from "@/lib/database.types";

interface Connection {
  id: string;
  workspace_id: string;
  type: ConnectionType;
  role: ConnectionRole;
  config: Record<string, unknown>;
  status: string;
  created_at: string;
  updated_at: string;
}

const TYPE_LABELS: Record<ConnectionType, string> = {
  anthropic: "Anthropic",
  slack: "Slack",
  discord: "Discord",
  whatsapp: "WhatsApp",
  linear: "Linear",
  notion: "Notion",
};

const TYPE_ROLES: Record<ConnectionType, ConnectionRole> = {
  anthropic: "ai",
  slack: "source",
  discord: "source",
  whatsapp: "source",
  linear: "sink",
  notion: "sink",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-status-pushed">
      <span className="w-2 h-2 rounded-full bg-status-pushed inline-block shadow-[var(--shadow-neu-sm)]" />
      {status}
    </span>
  );
}

function AddForm({
  type,
  onSave,
  onCancel,
}: {
  type: ConnectionType;
  onSave: (credentials: string, config: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [credentials, setCredentials] = useState("");
  const [config, setConfig] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await onSave(credentials, config);
    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 p-4 rounded-2xl bg-surface-0 shadow-[var(--shadow-neu-inset)] space-y-3">
      <div>
        <label className="block text-xs font-semibold text-text-secondary mb-1.5">API Key / Token</label>
        <input
          type="password"
          value={credentials}
          onChange={(e) => setCredentials(e.target.value)}
          required
          placeholder="Paste your key here"
          className="w-full text-sm rounded-xl px-3 py-2 bg-surface-0 text-text-primary placeholder:text-text-muted shadow-[var(--shadow-neu-inset)] focus:outline-none focus:ring-2 focus:ring-accent/30 transition-colors"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-text-secondary mb-1.5">
          Config JSON <span className="text-text-muted font-normal">(optional)</span>
        </label>
        <input
          type="text"
          value={config}
          onChange={(e) => setConfig(e.target.value)}
          placeholder='{"channel": "general"}'
          className="w-full text-sm rounded-xl px-3 py-2 bg-surface-0 text-text-primary placeholder:text-text-muted font-mono shadow-[var(--shadow-neu-inset)] focus:outline-none focus:ring-2 focus:ring-accent/30 transition-colors"
        />
      </div>
      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={saving} className="text-sm px-5 py-2 bg-accent text-white font-semibold rounded-xl shadow-[var(--shadow-neu-sm)] hover:shadow-[var(--shadow-neu-raised)] disabled:opacity-50 transition-shadow">
          {saving ? "Saving..." : "Save"}
        </button>
        <button type="button" onClick={onCancel} className="text-sm px-5 py-2 bg-surface-0 text-text-secondary font-medium rounded-xl shadow-[var(--shadow-neu-sm)] hover:text-text-primary transition-all">
          Cancel
        </button>
      </div>
    </form>
  );
}

function ConnectionSection({
  title, types, connections, adding, onAdd, onSave, onCancel,
}: {
  title: string; types: ConnectionType[]; connections: Connection[]; adding: string | null;
  onAdd: (type: ConnectionType) => void;
  onSave: (type: ConnectionType, credentials: string, config: string) => Promise<void>;
  onCancel: () => void;
}) {
  const sectionConnections = connections.filter((c) => types.includes(c.type));

  return (
    <section className="space-y-3">
      <h2 className="text-[10px] font-semibold text-text-muted uppercase tracking-widest">{title}</h2>
      <div className="rounded-2xl bg-surface-0 shadow-[var(--shadow-neu-raised)]">
        {sectionConnections.length === 0 && !types.some((t) => adding === t) && (
          <p className="text-sm text-text-muted px-5 py-4">No connections yet.</p>
        )}
        {sectionConnections.map((conn, i) => (
          <div key={conn.id} className={`flex items-center justify-between px-5 py-4 ${i > 0 ? 'border-t border-border' : ''}`}>
            <span className="text-sm font-medium text-text-primary">{TYPE_LABELS[conn.type]}</span>
            <StatusBadge status={conn.status} />
          </div>
        ))}
        {types.map((type) => adding === type && (
          <div key={type} className="px-5 py-4">
            <p className="text-sm font-medium text-text-primary mb-1">Add {TYPE_LABELS[type]}</p>
            <AddForm type={type} onSave={(creds, cfg) => onSave(type, creds, cfg)} onCancel={onCancel} />
          </div>
        ))}
      </div>
      <div className="flex gap-2 flex-wrap">
        {types.filter((t) => !connections.some((c) => c.type === t)).map((type) => (
          <button key={type} onClick={() => onAdd(type)} className="text-xs px-3 py-1.5 rounded-xl bg-surface-0 text-text-muted font-medium shadow-[var(--shadow-neu-sm)] hover:text-text-secondary hover:shadow-[var(--shadow-neu-raised)] transition-all duration-200">
            + {TYPE_LABELS[type]}
          </button>
        ))}
      </div>
    </section>
  );
}

export default function ConnectionManager({ workspaceId }: { workspaceId: string }) {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [adding, setAdding] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/connections").then((r) => r.json()).then((data) => { setConnections(Array.isArray(data) ? data : []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  async function handleSave(type: ConnectionType, credentials: string, configStr: string) {
    let config: Record<string, unknown> = {};
    if (configStr.trim()) { try { config = JSON.parse(configStr); } catch { /* ignore */ } }
    const res = await fetch("/api/connections", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceId, type, role: TYPE_ROLES[type], config, credentials }) });
    if (res.ok) { const created = await res.json(); setConnections((prev) => [...prev, { ...created, workspace_id: workspaceId, config: {}, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }]); setAdding(null); }
  }

  if (loading) return <p className="text-sm text-text-muted">Loading connections...</p>;

  return (
    <div className="space-y-8">
      <ConnectionSection title="AI Provider" types={["anthropic"]} connections={connections} adding={adding} onAdd={setAdding} onSave={handleSave} onCancel={() => setAdding(null)} />
      <ConnectionSection title="Sources" types={["slack", "discord", "whatsapp"]} connections={connections} adding={adding} onAdd={setAdding} onSave={handleSave} onCancel={() => setAdding(null)} />
      <ConnectionSection title="Sinks" types={["linear", "notion"]} connections={connections} adding={adding} onAdd={setAdding} onSave={handleSave} onCancel={() => setAdding(null)} />
    </div>
  );
}
