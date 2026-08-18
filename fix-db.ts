import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function fix() {
  const now = new Date().toISOString();

  // Resolve Dip Patel's invested allocations (IDs: 11, 12, 13, 37)
  const allocIds = [11, 12, 13, 37];
  for (const id of allocIds) {
    const { error } = await supabase.from('allocations')
      .update({ status: 'RESOLVED', updated_at: now })
      .eq('id', id);
    if (error) console.error(`Failed to resolve ${id}:`, error);
    else console.log(`Resolved allocation ${id}`);
  }
}

fix();
