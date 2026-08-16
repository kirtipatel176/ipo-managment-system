import { db } from './schema';

/**
 * Seeds the database with real IPO management data.
 *
 * Architecture v2 (Money-Flow Engine):
 *  - DematAccount is a first-class entity
 *  - Kirti Patel has isSelf = true
 *  - Applications use applicationType (FRIEND_DEMAT / OWN_DEMAT)
 *  - All amounts auto-calculated from lots × lotSize × price
 *  - Allocations properly track money location
 *
 * IPOs: Dhoot Transmission, Molbio Diagnostics, Milky Mist Dairy Food, Shiprocket Ltd, Behari Lal Engineering
 * People: Ashish, Dip, Kirti (self), Krina, Manav, Mukesh, Sandip, Shah Abhi, Shrina, Suresh
 * Banks: SBI, HDFC, ICICI
 * Demat: Kirti-Zerodha, Mukesh-Zerodha, Sandip-Groww, Ashish-Groww, Dip-Groww, Shrina-Angel One
 */
export async function seedDatabase() {
  const now = new Date().toISOString();

  await db.transaction('rw', [
    db.bankAccounts, db.people, db.dematAccounts, db.ipos, db.applications,
    db.transactions, db.allocations, db.journeyEvents,
    db.holdings, db.sales, db.reconciliations
  ], async () => {

    // ── Clear everything ─────────────────────────────────────────────────
    await db.bankAccounts.clear();
    await db.people.clear();
    await db.dematAccounts.clear();
    await db.ipos.clear();
    await db.applications.clear();
    await db.transactions.clear();
    await db.allocations.clear();
    await db.journeyEvents.clear();
    await db.holdings.clear();
    await db.sales.clear();
    await db.reconciliations.clear();

    // ── Sample data removed for manual testing ────────────────────────────
    console.log('[Seed] Database cleared successfully for manual testing.');
  });
}

