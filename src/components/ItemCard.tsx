import Link from 'next/link';
import type { Item, ItemType, ItemStatus } from '@/lib/database.types';
import ConfidenceBadge from './ConfidenceBadge';

const TYPE_CONFIG: Record<ItemType, { emoji: string; borderClass: string; bgClass: string; label: string }> = {
  bug:      { emoji: '🐛', borderClass: 'border-red-300',    bgClass: 'bg-red-50',    label: 'Bug' },
  feature:  { emoji: '🆕', borderClass: 'border-blue-300',   bgClass: 'bg-blue-50',   label: 'Feature' },
  task:     { emoji: '☑️', borderClass: 'border-gray-300',   bgClass: 'bg-gray-50',   label: 'Task' },
  decision: { emoji: '🧠', borderClass: 'border-purple-300', bgClass: 'bg-purple-50', label: 'Decision' },
};

const STATUS_CONFIG: Record<ItemStatus, { label: string; className: string }> = {
  pending:  { label: 'Pending',  className: 'bg-yellow-100 text-yellow-800' },
  approved: { label: 'Approved', className: 'bg-blue-100 text-blue-800' },
  rejected: { label: 'Rejected', className: 'bg-gray-100 text-gray-500 line-through' },
  pushed:   { label: 'Pushed',   className: 'bg-green-100 text-green-800' },
  failed:   { label: 'Failed',   className: 'bg-red-100 text-red-800' },
};

interface ItemCardProps {
  item: Item;
}

export default function ItemCard({ item }: ItemCardProps) {
  const type = TYPE_CONFIG[item.type];
  const status = STATUS_CONFIG[item.status];

  return (
    <Link href={`/items/${item.id}`} className="block">
      <div className={`border-l-4 rounded-lg p-4 ${type.borderClass} ${type.bgClass} hover:shadow-md transition-shadow`}>
        <div className="flex items-center gap-2 flex-wrap mb-2">
          {/* Type badge */}
          <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded bg-white border border-current">
            {type.emoji} {type.label}
          </span>

          {/* Status badge */}
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${status.className}`}>
            {status.label}
          </span>

          {/* Confidence */}
          <ConfidenceBadge confidence={item.confidence} />
        </div>

        <h3 className="font-semibold text-gray-900 mb-1 leading-snug">{item.title}</h3>

        {item.description && (
          <p className="text-sm text-gray-600 line-clamp-2">{item.description}</p>
        )}

        <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
          {item.owner && (
            <span>Owner: <span className="font-medium text-gray-700">{item.owner}</span></span>
          )}
          {item.dedup_match_id && (
            <span>
              Matches <span className="font-mono text-gray-700">{item.dedup_match_id.slice(0, 8)}</span>
              {item.dedup_similarity != null && (
                <span className="ml-1">({Math.round(item.dedup_similarity * 100)}% similar)</span>
              )}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
