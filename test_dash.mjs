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
  const allPeople = await fetchTable('people');
  const allApps = await fetchTable('applications');
  const allBanks = await fetchTable('bank_accounts');
  const allTxs = await fetchTable('transactions');
  
  const p = allPeople.find(x => x.full_name === 'SANDIP PANCHAL');
  
  // Funded by you
  const appsFundedByYou = allApps.filter(a => 
    a.applicant_person_id === p.id && 
    a.application_type === 'FRIEND_DEMAT' && 
    allBanks.some(b => b.id === a.funding_bank_account_id && b.is_active)
  );
  
  const totalFunded = appsFundedByYou.reduce((sum, a) => sum + (a.investment_amount || a.blocked_amount || 0), 0);

  // Deduct settlements. Since FRIEND_SETTLEMENT doesn't exist, we use MONEY_RECEIVED where fromPersonId is friend.
  const settlements = allTxs.filter(t => 
    t.from_person_id === p.id && 
    t.transaction_type === 'MONEY_RECEIVED'
  ).reduce((sum, t) => sum + (t.amount || 0), 0);

  const outstanding = totalFunded - settlements;
  
  console.log({
    person: p.full_name,
    totalFunded,
    settlements,
    outstanding,
    appsFundedByYou: appsFundedByYou.map(a => a.id)
  });
}
run();
