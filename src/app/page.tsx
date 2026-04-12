import ItemFeed from '@/components/ItemFeed';

export default function Home() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-12">
      <div className="mb-10">
        <h1 className="text-2xl font-semibold text-text-primary tracking-tight">Feed</h1>
        <p className="mt-1 text-text-muted text-sm">Extracted items from your conversations.</p>
      </div>
      <ItemFeed />
    </main>
  );
}
