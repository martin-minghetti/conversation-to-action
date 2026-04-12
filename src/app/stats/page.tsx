import StatsCharts from '@/components/StatsCharts';

export default function StatsPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-12">
      <div className="mb-10">
        <h1 className="text-2xl font-semibold text-text-primary tracking-tight">Stats</h1>
        <p className="mt-1 text-text-muted text-sm">Extraction quality and pipeline metrics.</p>
      </div>
      <StatsCharts />
    </main>
  );
}
