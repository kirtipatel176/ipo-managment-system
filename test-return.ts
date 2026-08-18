import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
    const personId = 7;
    const { data: unallocated } = await supabase
      .from('allocations')
      .select('*')
      .eq('status', 'ACTIVE')
      .eq('current_holder_type', 'PERSON')
      .eq('current_holder_id', personId)
      .eq('purpose', 'UNALLOCATED')
      .order('created_at', { ascending: true });
      
    let amountToReturn = 14807;
    for (const alloc of unallocated || []) {
      if (amountToReturn <= 0) break;
      if (alloc.amount <= amountToReturn) {
        console.log(`Deducting ${alloc.amount} from ${amountToReturn}`);
        amountToReturn -= alloc.amount;
      } else {
        console.log(`Deducting ${amountToReturn} from ${alloc.amount} (partially)`);
        amountToReturn = 0;
      }
    }
    console.log(`Remaining amountToReturn: ${amountToReturn}`);
}
run();
