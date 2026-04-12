'use client';

import { useEffect, useState } from 'react';
import type { Item, ItemType } from '@/lib/database.types';
import { createBrowserClient } from '@/lib/supabase';
import ItemCard from './ItemCard';

const FILTERS: { label: string; value: ItemType | 'all' }[] = [
  { label: 'All',        value: 'all' },
  { label: '🐛 Bugs',     value: 'bug' },
  { label: '✦ Features',  value: 'feature' },
  { label: '◻ Tasks',     value: 'task' },
  { label: '◆ Decisions', value: 'decision' },
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
      <div className="flex flex-wrap gap-1.5 mb-8">
        {FILTERS.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors duration-150 ${
              filter === value
                ? 'bg-accent text-surface-0'
                : 'bg-surface-2 text-text-secondary hover:text-text-primary hover:bg-surface-3'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center text-text-muted py-20 text-sm">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-text-muted py-20 text-sm">No items yet.</div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
