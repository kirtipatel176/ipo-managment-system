import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { db } from './db/schema.ts'
import { seedDatabase } from './db/seedData.ts'

async function syncIpoStatuses() {
  const ipos = await db.ipos.toArray();
  const today = new Date().toISOString().split('T')[0];
  
  const updates = [];
  for (const ipo of ipos) {
    let newStatus = ipo.status;
    
    if (ipo.status === 'UPCOMING' || ipo.status === 'OPEN') {
      if (ipo.closeDate && ipo.closeDate < today) {
        newStatus = 'CLOSED';
      } else if (ipo.openDate && ipo.openDate <= today && (!ipo.closeDate || ipo.closeDate >= today)) {
        newStatus = 'OPEN';
      } else if (ipo.openDate && ipo.openDate > today) {
        newStatus = 'UPCOMING';
      }
    }
    
    if (newStatus !== ipo.status) {
      updates.push(db.ipos.update(ipo.id!, { status: newStatus as any }));
    }
  }
  
  if (updates.length > 0) {
    await Promise.all(updates);
    console.log(`✅ Auto-synced ${updates.length} IPO statuses based on dates.`);
  }
}

// Auto-seed real data on first load if the DB is empty
async function initApp() {
  const ipoCount = await db.ipos.count();
  if (ipoCount === 0) {
    await seedDatabase();
    console.log('✅ Database initialized with real seed data.');
  }

  await syncIpoStatuses();

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

initApp();

