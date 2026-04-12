'use client';

import { useEffect, useState } from 'react';

interface Stats {
  totalItems: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
  avgConfidence: number;
  avgApprovedConfidence: number;
  avgRejectedConfidence: number;
  approvalRate: number;
}

interface StatCardProps {
  label: string;
  value: number | string;
  suffix?: string;
}

function StatCard({ label, value, suffix }: StatCardProps) {
  return (
    <div className="rounded-xl bg-surface-1 px-5 py-5 shadow-[var(--shadow-neu-raised)]">
      <p className="text-[10px] font-medium text-text-muted uppercase tracking-widest mb-2">{label}</p>
      <p className="text-2xl font-semibold text-text-primary font-mono tabular-nums">
        {value}
        {suffix && <span className="text-sm font-normal text-text-muted ml-0.5">{suffix}</span>}
      </p>
    </div>
  );
}

interface BarChartProps {
  title: string;
  data: Record<string, number>;
  colors: Record<string, string>;
}

function BarChart({ title, data, colors }: BarChartProps) {
  const max = Math.max(...Object.values(data), 1);

  return (
    <div className="rounded-xl bg-surface-1 px-5 py-5 shadow-[var(--shadow-neu-raised)]">
      <p className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-5">{title}</p>
      <div className="flex flex-col gap-4">
        {Object.entries(data).map(([key, value]) => (
          <div key={key} className="flex items-center gap-3">
            <span className="w-20 text-xs text-text-muted capitalize text-right shrink-0">{key}</span>
            <div className="flex-1 rounded-full h-2.5 overflow-hidden shadow-[var(--shadow-neu-inset)]">
              <div
                className="h-2.5 rounded-full transition-all duration-700"
                style={{
                  width: `${(value / max) * 100}%`,
                  backgroundColor: colors[key] ?? '#5e5e7a',
                }}
              />
            </div>
            <span className="w-8 text-xs font-mono font-medium text-text-secondary text-right shrink-0 tabular-nums">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const TYPE_COLORS: Record<string, string> = {
  bug:      '#e8786a',
  feature:  '#6ea8e4',
  task:     '#9595b2',
  decision: '#b48ee4',
};

const STATUS_COLORS: Record<string, string> = {
  pending:  '#e4c36e',
  approved: '#6ea8e4',
  rejected: '#5e5e7a',
  pushed:   '#6ee4a8',
  failed:   '#e8786a',
};

export default function StatsCharts() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch('/api/stats')
      .then((res) => res.json())
      .then((data) => setStats(data));
  }, []);

  if (!stats) {
    return (
      <div className="text-center text-text-muted py-20 text-sm">Loading stats...</div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Items"       value={stats.totalItems} />
        <StatCard label="Approval Rate"     value={stats.approvalRate}          suffix="%" />
        <StatCard label="Avg Confidence"    value={stats.avgConfidence}         suffix="%" />
        <StatCard label="Approved Conf"     value={stats.avgApprovedConfidence} suffix="%" />
      </div>

      <BarChart title="By Type"   data={stats.byType}   colors={TYPE_COLORS}   />
      <BarChart title="By Status" data={stats.byStatus} colors={STATUS_COLORS} />
    </div>
  );
}
