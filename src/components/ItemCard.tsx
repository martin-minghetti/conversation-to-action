import Link from 'next/link';
import type { Item, ItemType, ItemStatus } from '@/lib/database.types';
import ConfidenceBadge from './ConfidenceBadge';

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

interface ItemCardProps {
  item: Item;
}

export default function ItemCard({ item }: ItemCardProps) {
  const type = TYPE_CONFIG[item.type];
  const status = STATUS_CONFIG[item.status];

  return (
    <Link href={`/items/${item.id}`} className="block group">
      <div className="rounded-2xl p-5 bg-surface-0 shadow-[var(--shadow-neu-raised)] hover:shadow-[var(--shadow-neu-hover)] transition-shadow duration-200">
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <span className={`inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-xl ${type.className}`}>
            {type.label}
          </span>
          <span className={`inline-flex items-center px-2.5 py-1 rounded-xl text-[11px] font-semibold ${status.className}`}>
            {status.label}
          </span>
          <ConfidenceBadge confidence={item.confidence} />
        </div>

        <h3 className="font-medium text-text-primary mb-1.5 leading-snug group-hover:text-accent transition-colors duration-150">
          {item.title}
        </h3>

        {item.description && (
          <p className="text-sm text-text-secondary line-clamp-2 leading-relaxed">{item.description}</p>
        )}

        <div className="mt-3 flex flex-wrap gap-3 text-xs text-text-muted">
          {item.owner && (
            <span>assigned to <span className="text-text-secondary">{item.owner}</span></span>
          )}
          {item.dedup_match_id && (
            <span className="font-mono">
              matches {item.dedup_match_id}
              {item.dedup_similarity != null && (
                <span className="text-status-pending ml-1">{Math.round(item.dedup_similarity * 100)}%</span>
              )}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
