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

// ── StatCard ─────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: number | string;
  suffix?: string;
}

function StatCard({ label, value, suffix }: StatCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-5 py-4">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-3xl font-bold text-gray-900">
        {value}
        {suffix && <span className="text-lg font-medium text-gray-400 ml-1">{suffix}</span>}
      </p>
    </div>
  );
}

// ── BarChart ──────────────────────────────────────────────────────────────────

interface BarChartProps {
  title: string;
  data: Record<string, number>;
  colors: Record<string, string>;
}

function BarChart({ title, data, colors }: BarChartProps) {
  const max = Math.max(...Object.values(data), 1);

  return (
    <div className="rounded-xl border border-gray-200 bg-white px-5 py-4">
      <p className="text-sm font-semibold text-gray-700 mb-4">{title}</p>
      <div className="flex flex-col gap-3">
        {Object.entries(data).map(([key, value]) => (
          <div key={key} className="flex items-center gap-3">
            <span className="w-20 text-xs text-gray-500 capitalize text-right shrink-0">{key}</span>
            <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
              <div
                className="h-3 rounded-full transition-all duration-500"
                style={{
                  width: `${(value / max) * 100}%`,
                  backgroundColor: colors[key] ?? '#9ca3af',
                }}
              />
            </div>
            <span className="w-6 text-xs font-semibold text-gray-700 text-right shrink-0">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── StatsCharts ───────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  bug:      '#ef4444',
  feature:  '#3b82f6',
  task:     '#9ca3af',
  decision: '#a855f7',
};

const STATUS_COLORS: Record<string, string> = {
  pending:  '#eab308',
  approved: '#3b82f6',
  rejected: '#9ca3af',
  pushed:   '#22c55e',
  failed:   '#ef4444',
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
      <div className="text-center text-gray-400 py-16 text-sm">Loading stats...</div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Items"       value={stats.totalItems} />
        <StatCard label="Approval Rate"     value={stats.approvalRate}          suffix="%" />
        <StatCard label="Avg Confidence"    value={stats.avgConfidence}         suffix="%" />
        <StatCard label="Avg Approved Conf" value={stats.avgApprovedConfidence} suffix="%" />
      </div>

      {/* Bar charts */}
      <BarChart title="By Type"   data={stats.byType}   colors={TYPE_COLORS}   />
      <BarChart title="By Status" data={stats.byStatus} colors={STATUS_COLORS} />
    </div>
  );
}
