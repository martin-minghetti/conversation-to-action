import Link from 'next/link';
import type { Item, ItemType, ItemStatus } from '@/lib/database.types';
import ConfidenceBadge from './ConfidenceBadge';

const TYPE_CONFIG: Record<ItemType, { emoji: string; label: string; className: string }> = {
  bug:      { emoji: '🐛', label: 'Bug',      className: 'text-type-bug bg-type-bug-bg' },
  feature:  { emoji: '✦',  label: 'Feature',  className: 'text-type-feature bg-type-feature-bg' },
  task:     { emoji: '◻',  label: 'Task',     className: 'text-type-task bg-type-task-bg' },
  decision: { emoji: '◆',  label: 'Decision', className: 'text-type-decision bg-type-decision-bg' },
};

const STATUS_CONFIG: Record<ItemStatus, { label: string; className: string }> = {
  pending:  { label: 'Pending',  className: 'text-status-pending bg-status-pending-bg' },
  approved: { label: 'Approved', className: 'text-status-approved bg-status-approved-bg' },
  rejected: { label: 'Rejected', className: 'text-status-rejected bg-status-rejected-bg' },
  pushed:   { label: 'Pushed',   className: 'text-status-pushed bg-status-pushed-bg' },
  failed:   { label: 'Failed',   className: 'text-status-failed bg-status-failed-bg' },
};

interface ItemCardProps {
  item: Item;
}

export default function ItemCard({ item }: ItemCardProps) {
  const type = TYPE_CONFIG[item.type];
  const status = STATUS_CONFIG[item.status];

  return (
    <Link href={`/items/${item.id}`} className="block group">
      <div className="border border-border rounded-lg p-4 bg-surface-1 hover:bg-surface-2 hover:border-border transition-all duration-150">
        {/* Header row */}
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded ${type.className}`}>
            {type.emoji} {type.label}
          </span>
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${status.className}`}>
            {status.label}
          </span>
          <ConfidenceBadge confidence={item.confidence} />
        </div>

        {/* Title */}
        <h3 className="font-medium text-text-primary mb-1 leading-snug group-hover:text-accent transition-colors duration-150">
          {item.title}
        </h3>

        {/* Description */}
        {item.description && (
          <p className="text-sm text-text-secondary line-clamp-2">{item.description}</p>
        )}

        {/* Footer */}
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-text-muted">
          {item.owner && (
            <span>→ <span className="text-text-secondary">{item.owner}</span></span>
          )}
          {item.dedup_match_id && (
            <span className="font-mono">
              ≈ {item.dedup_match_id}
              {item.dedup_similarity != null && (
                <span className="text-amber-400 ml-1">{Math.round(item.dedup_similarity * 100)}%</span>
              )}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
