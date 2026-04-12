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
    <div className="rounded-lg border border-border bg-surface-1 px-5 py-4">
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
    <div className="rounded-lg border border-border bg-surface-1 px-5 py-5">
      <p className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-5">{title}</p>
      <div className="flex flex-col gap-3.5">
        {Object.entries(data).map(([key, value]) => (
          <div key={key} className="flex items-center gap-3">
            <span className="w-20 text-xs text-text-muted capitalize text-right shrink-0">{key}</span>
            <div className="flex-1 bg-surface-2 rounded-full h-2 overflow-hidden">
              <div
                className="h-2 rounded-full transition-all duration-700"
                style={{
                  width: `${(value / max) * 100}%`,
                  backgroundColor: colors[key] ?? '#63636e',
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
  bug:      '#f87171',
  feature:  '#60a5fa',
  task:     '#a1a1aa',
  decision: '#c084fc',
};

const STATUS_COLORS: Record<string, string> = {
  pending:  '#fbbf24',
  approved: '#60a5fa',
  rejected: '#63636e',
  pushed:   '#34d399',
  failed:   '#f87171',
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
