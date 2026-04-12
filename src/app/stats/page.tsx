import StatsCharts from '@/components/StatsCharts';

export default function StatsPage() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Stats</h1>
        <p className="mt-1 text-gray-500 text-sm">Extraction quality and pipeline metrics.</p>
      </div>
      <StatsCharts />
    </main>
  );
}
