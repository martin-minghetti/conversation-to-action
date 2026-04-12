import ItemFeed from '@/components/ItemFeed';

export default function Home() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Conversation to Action</h1>
        <p className="mt-1 text-gray-500 text-sm">Live feed of extracted items from your conversations.</p>
      </div>
      <ItemFeed />
    </main>
  );
}
