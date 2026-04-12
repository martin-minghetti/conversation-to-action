import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase';
import type { ItemType, ItemStatus } from '@/lib/database.types';
import ConfidenceBadge from '@/components/ConfidenceBadge';

const TYPE_CONFIG: Record<ItemType, { emoji: string; label: string; className: string }> = {
  bug:      { emoji: '🐛', label: 'Bug',      className: 'bg-red-100 text-red-800' },
  feature:  { emoji: '🆕', label: 'Feature',  className: 'bg-blue-100 text-blue-800' },
  task:     { emoji: '☑️', label: 'Task',     className: 'bg-gray-100 text-gray-700' },
  decision: { emoji: '🧠', label: 'Decision', className: 'bg-purple-100 text-purple-800' },
};

const STATUS_CONFIG: Record<ItemStatus, { label: string; className: string }> = {
  pending:  { label: 'Pending',  className: 'bg-yellow-100 text-yellow-800' },
  approved: { label: 'Approved', className: 'bg-blue-100 text-blue-800' },
  rejected: { label: 'Rejected', className: 'bg-gray-100 text-gray-500 line-through' },
  pushed:   { label: 'Pushed',   className: 'bg-green-100 text-green-800' },
  failed:   { label: 'Failed',   className: 'bg-red-100 text-red-800' },
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ItemDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createServiceClient();

  const [{ data: item }, { data: sources }] = await Promise.all([
    supabase.from('items').select('*').eq('id', id).single(),
    supabase.from('item_sources').select('*').eq('item_id', id),
  ]);

  if (!item) notFound();

  const type = TYPE_CONFIG[item.type];
  const status = STATUS_CONFIG[item.status];

  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      {/* Back */}
      <Link href="/" className="text-sm text-gray-500 hover:text-gray-800 mb-6 inline-block">
        ← Back to feed
      </Link>

      {/* Badges */}
      <div className="flex flex-wrap gap-2 mb-4">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${type.className}`}>
          {type.emoji} {type.label}
        </span>
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${status.className}`}>
          {status.label}
        </span>
        <ConfidenceBadge confidence={item.confidence} />
      </div>

      {/* Title */}
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{item.title}</h1>

      {/* Description */}
      {item.description && (
        <p className="text-gray-600 mb-6 leading-relaxed">{item.description}</p>
      )}

      {/* Meta */}
      {item.owner && (
        <p className="text-sm text-gray-500 mb-4">
          Owner: <span className="font-medium text-gray-800">{item.owner}</span>
        </p>
      )}

      {/* Dedup match */}
      {item.dedup_match_id && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 text-sm text-yellow-800">
          <strong>Possible duplicate</strong> — matches item{' '}
          <span className="font-mono">{item.dedup_match_id}</span>
          {item.dedup_similarity != null && (
            <span className="ml-1">({Math.round(item.dedup_similarity * 100)}% similarity)</span>
          )}
        </div>
      )}

      {/* External link (pushed) */}
      {item.external_url && (
        <div className="mb-6">
          <a
            href={item.external_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
          >
            View in external tool ↗
          </a>
        </div>
      )}

      {/* Evidence */}
      {sources && sources.length > 0 && (
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Evidence</h2>
          <div className="flex flex-col gap-3">
            {sources.map((src) => (
              <blockquote
                key={src.event_id}
                className="border-l-4 border-gray-300 pl-4 text-sm text-gray-600 italic"
              >
                {src.evidence_quote}
              </blockquote>
            ))}
          </div>
        </section>
      )}

      {/* Suggested labels */}
      {item.suggested_labels && item.suggested_labels.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Labels</h2>
          <div className="flex flex-wrap gap-2">
            {item.suggested_labels.map((label) => (
              <span
                key={label}
                className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs font-medium"
              >
                {label}
              </span>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
