import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase';
import type { ItemType, ItemStatus, Item, ItemSource } from '@/lib/database.types';
import ConfidenceBadge from '@/components/ConfidenceBadge';

const TYPE_CONFIG: Record<ItemType, { label: string; className: string }> = {
  bug:      { label: 'Bug',      className: 'text-type-bug bg-type-bug-bg' },
  feature:  { label: 'Feature',  className: 'text-type-feature bg-type-feature-bg' },
  task:     { label: 'Task',     className: 'text-type-task bg-type-task-bg' },
  decision: { label: 'Decision', className: 'text-type-decision bg-type-decision-bg' },
};

const STATUS_CONFIG: Record<ItemStatus, { label: string; className: string }> = {
  pending:  { label: 'Pending',  className: 'text-status-pending bg-status-pending-bg' },
  approved: { label: 'Approved', className: 'text-status-approved bg-status-approved-bg' },
  rejected: { label: 'Rejected', className: 'text-status-rejected bg-status-rejected-bg' },
  pushed:   { label: 'Pushed',   className: 'text-status-pushed bg-status-pushed-bg' },
  failed:   { label: 'Failed',   className: 'text-status-failed bg-status-failed-bg' },
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ItemDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createServiceClient();

  const [{ data: itemRaw }, { data: sourcesRaw }] = await Promise.all([
    supabase.from('items').select('*').eq('id', id).single(),
    supabase.from('item_sources').select('*').eq('item_id', id),
  ]);

  const item = itemRaw as Item | null;
  const sources = sourcesRaw as ItemSource[] | null;

  if (!item) notFound();

  const type = TYPE_CONFIG[item.type];
  const status = STATUS_CONFIG[item.status];

  return (
    <main className="max-w-3xl mx-auto px-6 py-12">
      <Link href="/" className="text-sm text-text-muted hover:text-text-secondary mb-8 inline-flex items-center gap-1 transition-colors">
        <span>←</span> Back to feed
      </Link>

      <div className="flex flex-wrap gap-2 mb-4">
        <span className={`inline-flex items-center px-2.5 py-1 rounded-xl text-[11px] font-semibold ${type.className}`}>{type.label}</span>
        <span className={`inline-flex items-center px-2.5 py-1 rounded-xl text-[11px] font-semibold ${status.className}`}>{status.label}</span>
        <ConfidenceBadge confidence={item.confidence} />
      </div>

      <h1 className="text-xl font-semibold text-text-primary mb-3 tracking-tight">{item.title}</h1>

      {item.description && <p className="text-text-secondary mb-8 leading-relaxed">{item.description}</p>}

      {item.owner && (
        <p className="text-sm text-text-muted mb-6">Owner: <span className="font-medium text-text-secondary">{item.owner}</span></p>
      )}

      {item.dedup_match_id && (
        <div className="rounded-2xl bg-surface-0 p-4 mb-8 text-sm text-status-pending shadow-[var(--shadow-neu-inset)]">
          <strong>Possible duplicate</strong> — matches <span className="font-mono">{item.dedup_match_id}</span>
          {item.dedup_similarity != null && <span className="ml-1">({Math.round(item.dedup_similarity * 100)}%)</span>}
        </div>
      )}

      {item.external_url && (
        <div className="mb-8">
          <a href={item.external_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-accent hover:underline">View in external tool</a>
        </div>
      )}

      {sources && sources.length > 0 && (
        <section className="mb-8">
          <h2 className="text-[10px] font-semibold text-text-muted uppercase tracking-widest mb-4">Evidence</h2>
          <div className="flex flex-col gap-3">
            {sources.map((src) => (
              <blockquote key={src.event_id} className="border-l-3 border-accent/30 pl-4 text-sm text-text-secondary italic">{src.evidence_quote}</blockquote>
            ))}
          </div>
        </section>
      )}

      {item.suggested_labels && item.suggested_labels.length > 0 && (
        <section>
          <h2 className="text-[10px] font-semibold text-text-muted uppercase tracking-widest mb-4">Labels</h2>
          <div className="flex flex-wrap gap-2">
            {item.suggested_labels.map((label) => (
              <span key={label} className="px-3 py-1 rounded-xl bg-surface-0 text-text-secondary text-xs font-mono shadow-[var(--shadow-neu-sm)]">{label}</span>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
