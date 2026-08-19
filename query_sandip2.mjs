const SUPABASE_URL = 'https://zvlvztysbpdtgjenytwh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2bHZ6dHlzYnBkdGdqZW55dHdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5NzgzODUsImV4cCI6MjEwMjU1NDM4NX0.QUiVwGa3H6FqYOb-niYklcGECRB2uHNwIeT0uwfMMJ8';

async function fetchTable(table) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    }
  });
  return res.json();
}

async function run() {
  const people = await fetchTable('people');
  const sandip = people.find(p => p.full_name.toLowerCase().includes('sandip'));
  console.log("Sandip:", sandip);
  if (!sandip) return;
  
  const banks = await fetchTable('bank_accounts');
  const sandipBanks = banks.filter(b => b.person_id === sandip.id);
  console.log("Sandip Banks:", sandipBanks);
  
  const apps = await fetchTable('applications');
  const sandipApps = apps.filter(a => a.applicant_person_id === sandip.id || sandipBanks.some(b => b.id === a.funding_bank_account_id));
  console.log("Sandip Apps:", sandipApps);
  
  const txs = await fetchTable('transactions');
  const sandipTxs = txs.filter(t => t.from_person_id === sandip.id || t.to_person_id === sandip.id || sandipBanks.some(b => b.id === t.from_bank_account_id || b.id === t.to_bank_account_id));
  console.log("Sandip TXs:", sandipTxs);
}
run();
