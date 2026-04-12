interface ConfidenceBadgeProps {
  confidence: number;
}

export default function ConfidenceBadge({ confidence }: ConfidenceBadgeProps) {
  const color =
    confidence >= 90
      ? 'text-status-pushed'
      : confidence >= 70
      ? 'text-status-pending'
      : 'text-type-bug';

  return (
    <span className={`inline-flex items-center font-mono text-xs font-semibold ${color}`}>
      {confidence}%
    </span>
  );
}
