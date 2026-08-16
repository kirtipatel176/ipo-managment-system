/**
 * useDashboardMetrics — Money-Flow Engine v2
 *
 * Computes all dashboard metrics from the live database.
 * Core concept: TOTAL MONEY = Bank Cash + IPO Blocked (friend) + Friend Unallocated + Invested
 *
 * Returns:
 *  - moneyOverview: 4-way breakdown of total money
 *  - KPI stats
 *  - friendsMoneyRows: per-friend money breakdown
 *  - bankBalanceRows: per-bank available balance
 *  - ipoStatusCounts: IPO status breakdown
 *  - applicationStatusCounts: application status breakdown
 *  - investmentMetrics: P&L summary
 */
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/schema';

export interface MoneyOverview {
  totalMoney: number;
  bankCash: number;          // Sum of all bank available balances (gross - ipoBlocked from bank)
  ipoBlocked: number;        // Active IPO_BLOCKED allocations (friend + own)
  friendMoney: number;       // UNALLOCATED allocations with friends
  invested: number;          // INVESTED allocations (cost basis of holdings)
  unrealizedPnL: number;     // Current value - invested
  realizedPnL: number;       // Sum of realized P&L from sales
}

export interface FriendMoneyRow {
  personId: number;
  fullName: string;
  totalSent: number;         // Bank → Person transactions
  totalReturned: number;     // Person → Bank transactions
  ipoBlocked: number;        // IPO_BLOCKED allocations
  unallocated: number;       // UNALLOCATED allocations (free balance with friend)
  invested: number;          // INVESTED allocations
  currentlyHeld: number;     // ipoBlocked + unallocated + invested
}

export interface BankBalanceRow {
  accountId: number;
  accountName: string;
  bankName: string;
  grossBalance: number;      // openingBalance + received - sent
  ipoBlockedFromBank: number; // OWN_DEMAT blocked allocations from this bank
  availableBalance: number;  // gross - blocked
}

export interface IPOStatusCount {
  status: string;
  label: string;
  count: number;
}

export interface ApplicationStatusCount {
  label: string;
  count: number;
  color: string;
}

export interface ActionRequired {
  id: string;
  message: string;
  type: 'WARNING' | 'INFO' | 'SUCCESS';
  link?: string;
}

export interface DashboardMetrics {
  // ── Money Overview ────────────────────────────────────────────────────
  moneyOverview: MoneyOverview;

  // ── KPI Cards ─────────────────────────────────────────────────────────
  totalIpos: number;
  upcomingIpos: number;
  openIpos: number;
  totalApplications: number;
  totalLotsApplied: number;
  allottedApplications: number;
  notAllottedApplications: number;
  pendingApplications: number;

  // ── Sub-panels ────────────────────────────────────────────────────────
  friendsMoneyRows: FriendMoneyRow[];
  bankBalanceRows: BankBalanceRow[];
  ipoStatusCounts: IPOStatusCount[];
  applicationStatusCounts: ApplicationStatusCount[];

  // ── Investment metrics ────────────────────────────────────────────────
  totalInvested: number;
  currentPortfolioValue: number;
  unrealizedPnL: number;
  realizedPnL: number;

  // ── Legacy compatibility ──────────────────────────────────────────────
  totalSent: number;
  moneyComeBack: number;
  totalPending: number;
  friendsPendingRows: Array<{ personId: number; fullName: string; totalSent: number; moneyBack: number; pending: number }>;
  bankReceivedRows: Array<{ accountId: number; accountName: string; bankName: string; moneyReceived: number; transactions: number }>;
  banks: BankBalanceRow[];
  people: Array<{ personId: number; fullName: string; currentlyHeld: number; ipoBlocked: number; unallocated: number }>;

  // ── Action Required ───────────────────────────────────────────────────
  actions: ActionRequired[];
}

export function useDashboardMetrics(ipoId?: number | null): DashboardMetrics | undefined {
  return useLiveQuery(async () => {
    const allIpos      = await db.ipos.toArray();
    const allPeople    = await db.people.filter(p => p.isActive).toArray();
    const allBanks     = await db.bankAccounts.filter(b => b.isActive).toArray();
    const allApps      = await db.applications.toArray();
    const allTxs       = await db.transactions.where('status').equals('COMPLETED').toArray();
    const allAllocs    = await db.allocations.filter(a => a.status === 'ACTIVE').toArray();
    const allHoldings  = await db.holdings.toArray();
    const allSales     = await db.sales.toArray();

    // ── Apply IPO filter ──────────────────────────────────────────────────
    const filteredApps = ipoId ? allApps.filter(a => a.ipoId === ipoId) : allApps;

    // ── IPO Status Counts ─────────────────────────────────────────────────
    const statusBuckets: Record<string, number> = {
      UPCOMING: 0, OPEN: 0, CLOSED: 0, ALLOTMENT_PENDING: 0, COMPLETED: 0,
    };
    for (const ipo of allIpos) {
      const s = ipo.status;
      if (s === 'UPCOMING') statusBuckets.UPCOMING++;
      else if (s === 'OPEN') statusBuckets.OPEN++;
      else if (s === 'CLOSED' || s === 'ALLOTTED' || s === 'NOT_ALLOTTED' || s === 'REFUND_PENDING') statusBuckets.CLOSED++;
      else if (s === 'ALLOTMENT_PENDING') statusBuckets.ALLOTMENT_PENDING++;
      else if (s === 'COMPLETED' || s === 'LISTED') statusBuckets.COMPLETED++;
    }

    const ipoStatusCounts: IPOStatusCount[] = [
      { status: 'UPCOMING',          label: 'Upcoming',   count: statusBuckets.UPCOMING },
      { status: 'OPEN',              label: 'Open',       count: statusBuckets.OPEN },
      { status: 'CLOSED',            label: 'Closed',     count: statusBuckets.CLOSED },
      { status: 'ALLOTMENT_PENDING', label: 'Allotment',  count: statusBuckets.ALLOTMENT_PENDING },
      { status: 'COMPLETED',         label: 'Completed',  count: statusBuckets.COMPLETED },
    ];

    // ── Application Status Counts ─────────────────────────────────────────
    const applied       = filteredApps.filter(a => a.allotmentStatus === 'PENDING').length;
    const allotted      = filteredApps.filter(a => a.allotmentStatus === 'FULL' || a.allotmentStatus === 'PARTIAL').length;
    const notAllotted   = filteredApps.filter(a => a.allotmentStatus === 'NIL').length;
    const applicationStatusCounts: ApplicationStatusCount[] = [
      { label: 'Applied (Pending)', count: applied,    color: 'blue' },
      { label: 'Allotted',          count: allotted,   color: 'green' },
      { label: 'Not Allotted',      count: notAllotted, color: 'red' },
    ];

    // ── Bank Balances ─────────────────────────────────────────────────────
    const bankBalanceRows: BankBalanceRow[] = allBanks.map(b => {
      const txsForBank = allTxs.filter(t =>
        t.fromBankAccountId === b.id || t.toBankAccountId === b.id
      );
      let received = 0; let sent = 0;
      for (const t of txsForBank) {
        // SELF_TRANSFER: count both sides (net effect = 0 across all banks)
        if (t.toBankAccountId === b.id)   received += t.amount;
        if (t.fromBankAccountId === b.id) sent     += t.amount;
      }
      const grossBalance = b.openingBalance + received - sent;

      // IPO blocked from this bank (OWN_DEMAT bank-level blocks)
      const ipoBlockedFromBank = allAllocs
        .filter(a =>
          a.purpose === 'IPO_BLOCKED' &&
          a.currentHolderType === 'BANK' &&
          a.currentHolderId === b.id
        )
        .reduce((s, a) => s + a.amount, 0);

      return {
        accountId: b.id!,
        accountName: b.accountName,
        bankName: b.bankName,
        grossBalance,
        ipoBlockedFromBank,
        availableBalance: grossBalance - ipoBlockedFromBank,
      };
    });

    // ── Money Overview (4-way breakdown) ─────────────────────────────────
    // Bank Cash = sum of available balances (after own IPO blocks)
    const bankCash = bankBalanceRows.reduce((s, b) => s + b.availableBalance, 0);

    // IPO Blocked = all active IPO_BLOCKED allocations
    const ipoBlockedTotal = allAllocs
      .filter(a => a.purpose === 'IPO_BLOCKED')
      .reduce((s, a) => s + a.amount, 0);

    // Friend Money = UNALLOCATED allocations held by friends (not yet applied)
    const friendMoney = allAllocs
      .filter(a => a.purpose === 'UNALLOCATED' && a.currentHolderType === 'PERSON')
      .reduce((s, a) => s + a.amount, 0);

    // Invested = INVESTED allocations (cost basis, not market value)
    const invested = allAllocs
      .filter(a => a.purpose === 'INVESTED')
      .reduce((s, a) => s + a.amount, 0);

    // P&L
    const currentPortfolioValue = allHoldings.reduce((s, h) => s + h.currentValue, 0);
    const totalInvested = allHoldings.reduce((s, h) => s + h.shares * h.averageCost, 0);
    const unrealizedPnL = currentPortfolioValue - totalInvested;
    const realizedPnL = allSales.reduce((s, sale) => s + sale.realizedPnL, 0);

    const totalMoney = bankCash + ipoBlockedTotal + friendMoney + invested;

    const moneyOverview: MoneyOverview = {
      totalMoney, bankCash, ipoBlocked: ipoBlockedTotal,
      friendMoney, invested, unrealizedPnL, realizedPnL,
    };

    // ── Friend Money Rows ─────────────────────────────────────────────────
    const friendsMoneyRows: FriendMoneyRow[] = await Promise.all(
      allPeople.map(async p => {
        const personAllocs = allAllocs.filter(a => a.currentHolderType === 'PERSON' && a.currentHolderId === p.id!);
        const ipoBlocked   = personAllocs.filter(a => a.purpose === 'IPO_BLOCKED').reduce((s, a) => s + a.amount, 0);
        const unallocated  = personAllocs.filter(a => a.purpose === 'UNALLOCATED').reduce((s, a) => s + a.amount, 0);
        const inv          = personAllocs.filter(a => a.purpose === 'INVESTED').reduce((s, a) => s + a.amount, 0);

        const sentTxs = allTxs.filter(t => t.toPersonId === p.id! && !!t.fromBankAccountId);
        const returnTxs = allTxs.filter(t => t.fromPersonId === p.id! && !!t.toBankAccountId);
        const totalSent     = sentTxs.reduce((s, t) => s + t.amount, 0);
        const totalReturned = returnTxs.reduce((s, t) => s + t.amount, 0);

        return {
          personId: p.id!, fullName: p.fullName,
          totalSent, totalReturned,
          ipoBlocked, unallocated, invested: inv,
          currentlyHeld: ipoBlocked + unallocated + inv,
        };
      })
    );

    // ── Legacy: Friends Pending Rows (for Dashboard panel) ───────────────
    const friendsPendingRows = friendsMoneyRows
      .filter(r => !allPeople.find(p => p.id === r.personId)?.isSelf)
      .map(r => ({
        personId: r.personId,
        fullName: r.fullName,
        totalSent: r.totalSent,
        moneyBack: r.totalReturned,
        pending: Math.max(0, r.totalSent - r.totalReturned),
      }))
      .sort((a, b) => b.pending - a.pending);

    // ── Legacy: Bank Received Rows ────────────────────────────────────────
    const bankReceivedMap = new Map<number, { amount: number; count: number }>();
    for (const tx of allTxs) {
      if (tx.transactionType === 'IPO_REFUND' && tx.toBankAccountId) {
        const curr = bankReceivedMap.get(tx.toBankAccountId) ?? { amount: 0, count: 0 };
        bankReceivedMap.set(tx.toBankAccountId, { amount: curr.amount + tx.amount, count: curr.count + 1 });
      }
    }
    const bankReceivedRows = allBanks
      .map(b => {
        const data = bankReceivedMap.get(b.id!) ?? { amount: 0, count: 0 };
        return { accountId: b.id!, accountName: b.accountName, bankName: b.bankName, moneyReceived: data.amount, transactions: data.count };
      })
      .filter(r => r.moneyReceived > 0);

    // ── Legacy KPI stats ──────────────────────────────────────────────────
    const sentTxs = allTxs.filter(t => t.transactionType === 'MONEY_SENT' || t.transactionType === 'IPO_REFUND');
    const totalSent     = allTxs.filter(t => t.transactionType === 'MONEY_SENT' && !!t.toPersonId).reduce((s, t) => s + t.amount, 0);
    const moneyComeBack = allTxs.filter(t => t.transactionType === 'IPO_REFUND' && !!t.toBankAccountId).reduce((s, t) => s + t.amount, 0);
    const totalPending  = Math.max(0, totalSent - moneyComeBack);

    // ── Action Required ───────────────────────────────────────────────────
    const actions: ActionRequired[] = [];
    
    // 1. Pending from friends
    friendsPendingRows.filter(r => r.pending > 0).forEach(r => {
      actions.push({
        id: `pending-${r.personId}`,
        message: `₹${r.pending.toLocaleString('en-IN')} pending return from ${r.fullName}`,
        type: 'WARNING',
        link: '/people'
      });
    });

    // 2. IPO Events (Allotment / Listing)
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    
    allIpos.forEach(ipo => {
      if (ipo.allotmentDate === today) {
        actions.push({ id: `allot-${ipo.id}`, message: `${ipo.ipoName} allotment is today`, type: 'INFO', link: '/ipos' });
      } else if (ipo.allotmentDate === tomorrow) {
        actions.push({ id: `allot-tmr-${ipo.id}`, message: `${ipo.ipoName} allotment is tomorrow`, type: 'INFO', link: '/ipos' });
      }
      
      if (ipo.listingDate === today) {
        actions.push({ id: `list-${ipo.id}`, message: `${ipo.ipoName} lists today`, type: 'SUCCESS', link: '/ipos' });
      } else if (ipo.listingDate === tomorrow) {
        actions.push({ id: `list-tmr-${ipo.id}`, message: `${ipo.ipoName} lists tomorrow`, type: 'INFO', link: '/ipos' });
      }
    });

    // 3. Unallocated friend money (available for reuse)
    friendsMoneyRows.filter(r => r.unallocated > 0).forEach(r => {
      actions.push({
        id: `reuse-${r.personId}`,
        message: `₹${r.unallocated.toLocaleString('en-IN')} released and available for reuse with ${r.fullName}`,
        type: 'SUCCESS',
        link: '/people'
      });
    });

    return {
      moneyOverview,
      totalIpos: allIpos.length,
      upcomingIpos: statusBuckets.UPCOMING,
      openIpos: statusBuckets.OPEN,
      totalApplications: filteredApps.length,
      totalLotsApplied: filteredApps.reduce((s, a) => s + a.appliedLots, 0),
      allottedApplications: allotted,
      notAllottedApplications: notAllotted,
      pendingApplications: applied,
      friendsMoneyRows,
      bankBalanceRows,
      ipoStatusCounts,
      applicationStatusCounts,
      totalInvested,
      currentPortfolioValue,
      unrealizedPnL,
      realizedPnL,
      totalSent,
      moneyComeBack,
      totalPending,
      friendsPendingRows,
      bankReceivedRows,
      banks: bankBalanceRows,
      people: friendsMoneyRows.map(r => ({
        personId: r.personId, fullName: r.fullName,
        currentlyHeld: r.currentlyHeld, ipoBlocked: r.ipoBlocked, unallocated: r.unallocated,
      })),
      actions,
    };
  }, [ipoId]);
}
