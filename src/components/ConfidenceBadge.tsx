interface ConfidenceBadgeProps {
  confidence: number;
}

export default function ConfidenceBadge({ confidence }: ConfidenceBadgeProps) {
  const color =
    confidence >= 90
      ? 'text-emerald-400'
      : confidence >= 70
      ? 'text-amber-400'
      : 'text-red-400';

  return (
    <span className={`inline-flex items-center font-mono text-xs font-medium ${color}`}>
      {confidence}%
    </span>
  );
}
