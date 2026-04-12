'use client';

import { useEffect, useState } from 'react';
import type { Item, ItemType } from '@/lib/database.types';
import { createBrowserClient } from '@/lib/supabase';
import ItemCard from './ItemCard';

const FILTERS: { label: string; value: ItemType | 'all' }[] = [
  { label: 'All',      value: 'all' },
  { label: '🐛 Bug',      value: 'bug' },
  { label: '🆕 Feature',  value: 'feature' },
  { label: '☑️ Task',     value: 'task' },
  { label: '🧠 Decision', value: 'decision' },
];

export default function ItemFeed() {
  const [items, setItems] = useState<Item[]>([]);
  const [filter, setFilter] = useState<ItemType | 'all'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createBrowserClient();

    async function fetchItems() {
      const { data } = await supabase
        .from('items')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (data) setItems(data);
      setLoading(false);
    }

    fetchItems();

    const channel = supabase
      .channel('items-feed')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'items' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setItems((prev) => [payload.new as Item, ...prev].slice(0, 50));
          } else if (payload.eventType === 'UPDATE') {
            setItems((prev) =>
              prev.map((item) => (item.id === (payload.new as Item).id ? (payload.new as Item) : item))
            );
          } else if (payload.eventType === 'DELETE') {
            setItems((prev) => prev.filter((item) => item.id !== (payload.old as Item).id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filtered = filter === 'all' ? items : items.filter((item) => item.type === filter);

  return (
    <div>
      {/* Filter buttons */}
      <div className="flex flex-wrap gap-2 mb-6">
        {FILTERS.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === value
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center text-gray-400 py-16 text-sm">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-gray-400 py-16 text-sm">No items yet...</div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
