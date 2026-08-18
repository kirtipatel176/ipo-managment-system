const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
    const { data: investedAllocs } = await supabase
      .from('allocations')
      .select('*')
      .eq('status', 'ACTIVE')
      .eq('purpose', 'INVESTED')
      .eq('ipo_id', 7)
      .eq('current_holder_id', 3);
    console.log(investedAllocs);
}
run();
