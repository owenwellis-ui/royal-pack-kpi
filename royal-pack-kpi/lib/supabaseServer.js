import { createClient } from '@supabase/supabase-js';

// This client is only ever imported from server-side code (route handlers).
// The anon key is read from a plain (non-NEXT_PUBLIC_) env var, so it never
// reaches the browser bundle. Access to the site itself is gated by the
// shared-password middleware.
export function getSupabaseServerClient() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
}
