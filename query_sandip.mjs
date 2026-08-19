import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: people } = await supabase.from('people').select('*').ilike('full_name', '%sandip%');
  console.log("People:", people);
  
  if (people && people.length > 0) {
    const personId = people[0].id;
    const { data: bankAccounts } = await supabase.from('bank_accounts').select('*').eq('person_id', personId);
    console.log("Bank Accounts:", bankAccounts);
    
    const { data: demats } = await supabase.from('demat_accounts').select('*').eq('holder_person_id', personId);
    console.log("Demat Accounts:", demats);

    const { data: apps } = await supabase.from('applications').select('*').eq('applicant_person_id', personId);
    console.log("Apps as applicant:", apps);
    
    const { data: txs } = await supabase.from('transactions').select('*').or(`from_person_id.eq.${personId},to_person_id.eq.${personId}`);
    console.log("Transactions:", txs);
  } else {
      const { data: banks } = await supabase.from('bank_accounts').select('*').ilike('account_name', '%sandip%');
      console.log("Banks:", banks);
  }
}
run();
