import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function GET() {
  const supabase = createServiceClient();

  const { data: dataRaw, error } = await supabase
    .from('items')
    .select('type, status, confidence, created_at');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const items = (dataRaw ?? []) as Array<{ type: string; status: string; confidence: number; created_at: string }>;
  const totalItems = items.length;

  // byType
  const byType = { bug: 0, feature: 0, task: 0, decision: 0 };
  for (const item of items) {
    if (item.type in byType) byType[item.type as keyof typeof byType]++;
  }

  // byStatus
  const byStatus = { pending: 0, approved: 0, rejected: 0, pushed: 0, failed: 0 };
  for (const item of items) {
    if (item.status in byStatus) byStatus[item.status as keyof typeof byStatus]++;
  }

  // avgConfidence (overall)
  const withConfidence = items.filter((i) => i.confidence != null);
  const avgConfidence =
    withConfidence.length > 0
      ? Math.round(withConfidence.reduce((sum, i) => sum + i.confidence, 0) / withConfidence.length)
      : 0;

  // avgApprovedConfidence
  const approved = items.filter((i) => (i.status === 'approved' || i.status === 'pushed') && i.confidence != null);
  const avgApprovedConfidence =
    approved.length > 0
      ? Math.round(approved.reduce((sum, i) => sum + i.confidence, 0) / approved.length)
      : 0;

  // avgRejectedConfidence
  const rejected = items.filter((i) => i.status === 'rejected' && i.confidence != null);
  const avgRejectedConfidence =
    rejected.length > 0
      ? Math.round(rejected.reduce((sum, i) => sum + i.confidence, 0) / rejected.length)
      : 0;

  // approvalRate
  const approvedCount = byStatus.approved + byStatus.pushed;
  const decidedCount = approvedCount + byStatus.rejected;
  const approvalRate = decidedCount > 0 ? Math.round((approvedCount / decidedCount) * 100) : 0;

  return NextResponse.json({
    totalItems,
    byType,
    byStatus,
    avgConfidence,
    avgApprovedConfidence,
    avgRejectedConfidence,
    approvalRate,
  });
}
