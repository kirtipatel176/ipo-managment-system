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
  const banks = await fetchTable('bank_accounts');
  console.log("Banks:");
  banks.forEach(b => console.log(b.id, b.account_name, b.is_active));
}
run();
