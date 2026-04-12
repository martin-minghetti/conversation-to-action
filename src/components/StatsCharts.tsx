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
    <div className="rounded-2xl bg-surface-0 p-6 shadow-[var(--shadow-neu-raised)]">
      <p className="text-[10px] font-semibold text-text-muted uppercase tracking-widest mb-3">{label}</p>
      <p className="text-3xl font-bold text-text-primary font-mono tabular-nums tracking-tight">
        {value}
        {suffix && <span className="text-base font-medium text-text-muted ml-0.5">{suffix}</span>}
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
    <div className="rounded-2xl bg-surface-0 p-6 shadow-[var(--shadow-neu-raised)]">
      <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-6">{title}</p>
      <div className="flex flex-col gap-5">
        {Object.entries(data).map(([key, value]) => {
          const color = colors[key] ?? '#a8adb8';
          return (
            <div key={key} className="flex items-center gap-4">
              <span className="w-20 text-xs text-text-muted capitalize text-right shrink-0 font-medium">{key}</span>
              <div
                className="flex-1 rounded-full h-7 bg-surface-0 p-[3px]"
                style={{ boxShadow: 'inset 3px 3px 6px #b8bcc5, inset -3px -3px 6px #ffffff' }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max((value / max) * 100, 5)}%`,
                    backgroundColor: color,
                    boxShadow: '2px 2px 4px #b8bcc5, -1px -1px 3px #ffffff',
                  }}
                />
              </div>
              <span className="w-8 text-xs font-mono font-bold text-text-secondary text-right shrink-0 tabular-nums">{value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const TYPE_COLORS: Record<string, string> = {
  bug:      '#d4918a',
  feature:  '#8ab4d6',
  task:     '#a8adb8',
  decision: '#b8a4d4',
};

const STATUS_COLORS: Record<string, string> = {
  pending:  '#d4b87a',
  approved: '#8ab4d6',
  rejected: '#a8adb8',
  pushed:   '#8ac4a0',
  failed:   '#d4918a',
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
