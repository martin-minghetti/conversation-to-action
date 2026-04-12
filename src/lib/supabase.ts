import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

/**
 * Service-role client for API routes.
 * Uses SUPABASE_SERVICE_ROLE_KEY — bypasses RLS.
 * Never expose this client to the browser.
 */
export function createServiceClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

/**
 * Anon client for the browser / dashboard.
 * Uses NEXT_PUBLIC_SUPABASE_ANON_KEY — respects RLS.
 */
export function createBrowserClient() {
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient<Database>(supabaseUrl, anonKey);
}
