import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import {
  mapIpo, mapPerson, mapBankAccount, mapApplication, mapTransaction,
  mapAllocation, mapHolding, mapSale, mapDematAccount
} from '../../lib/mappers';

export interface DashboardFilters {
  dateRange: 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'LAST_3_MONTHS' | 'THIS_YEAR' | 'LAST_YEAR' | 'ALL_TIME';
  accountId: number | 'ALL'; // Demat Account ID
  ipoId: number | 'ALL';
}

export interface MoneyFlowChartData {
  period: string;
  invested: number;
  released: number;
  sales: number;
  netFlow: number;
}

export interface PnLChartData {
  period: string;
  profit: number;
}

export interface DashboardMetrics {
  // Summary
  totalInvested: number;
  currentValue: number;
  totalPnL: number;
  totalPnLPercentage: number;
  blockedAmount: number;
  releasedAmount: number;
  availableUncommitted: number;
  activeApplicationsCount: number;

  // Money Flow
  totalFlow: number;
  flowApplied: number;
  flowBlocked: number;
  flowDebited: number;
  flowReleased: number;
  flowSales: number;
  flowInvested: number;
  moneyFlowChart: MoneyFlowChartData[];

  // IPO Analytics
  totalApps: number;
  allottedApps: number;
  partialApps: number;
  notAllottedApps: number;
  pendingApps: number;
  successRate: number;
  previousSuccessRate: number;
  totalAppliedAmount: number;
  totalAllottedInvestment: number;

  // Allotment Overview
  allotmentTable: Array<{
    id: number;
    ipoName: string;
    appliedLots: number;
    allottedLots: number;
    price: number;
    invested: number;
    released: number;
    status: string;
  }>;

  // Current Holdings
  holdingsTable: Array<{
    id: number;
    ipoName: string;
    holderName: string;
    qty: number;
    avgPrice: number;
    ltp: number;
    invested: number;
    current: number;
    pnl: number;
    pnlPercent: number;
  }>;

  // Portfolio Growth Chart
  portfolioGrowthChart: Array<{
    date: string;
    value: number;
    invested: number;
  }>;

  // Profit & Loss
  realizedPnL: number;
  unrealizedPnL: number;
  pnlChart: PnLChartData[];

  // Gainers & Losers
  topGainers: Array<{ ipoName: string; pnlPercent: number; pnl: number }>;
  topLosers: Array<{ ipoName: string; pnlPercent: number; pnl: number }>;

  // IPO Performance
  bestPerformingIpo: { name: string; pnlPercent: number } | null;
  worstPerformingIpo: { name: string; pnlPercent: number } | null;
  averageIpoReturn: number;
  totalIposHeld: number;

  // Breakdown
  investmentBreakdown: Array<{ name: string; value: number; color: string }>;
  dematDistribution: Array<{ name: string; invested: number; current: number; accountId: number }>;

  // Transactions
  recentTransactions: Array<{
    id: string;
    date: string;
    type: string;
    title: string;
    subtitle: string;
    amount: number;
    isPositive: boolean;
  }>;

  // Action Required
  actions: Array<{ id: string; message: string; type: string; link: string }>;
}

function filterByDateRange(dateString: string | null | undefined, range: DashboardFilters['dateRange']): boolean {
  if (range === 'ALL_TIME') return true;
  if (!dateString) return true; // Don't exclude records with no date in non-ALL filters
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return true; // invalid date — include it
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  if (range === 'TODAY') {
    return d >= todayStart;
  }
  if (range === 'THIS_WEEK') {
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    return d >= weekStart;
  }
  if (range === 'THIS_MONTH') {
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }
  if (range === 'LAST_3_MONTHS') {
    const threeMonthsAgo = new Date(now);
    threeMonthsAgo.setMonth(now.getMonth() - 3);
    return d >= threeMonthsAgo;
  }
  if (range === 'THIS_YEAR') {
    return d.getFullYear() === now.getFullYear();
  }
  if (range === 'LAST_YEAR') {
    return d.getFullYear() === now.getFullYear() - 1;
  }
  return true;
}

export function useDashboardMetrics(filters: DashboardFilters) {
  return useQuery<DashboardMetrics | undefined>({
    queryKey: ['dashboardMetrics', filters],
    queryFn: async () => {
      const [
        { data: iposData },
        { data: peopleData },
        { data: banksData },
        { data: dematsData },
        { data: appsData },
        { data: txsData },
        { data: allocsData },
        { data: holdingsData },
        { data: salesData }
      ] = await Promise.all([
        supabase.from('ipos').select('*'),
        supabase.from('people').select('*'),
        supabase.from('bank_accounts').select('*'),
        supabase.from('demat_accounts').select('*'),
        supabase.from('applications').select('*'),
        supabase.from('transactions').select('*').eq('status', 'COMPLETED'),
        supabase.from('allocations').select('*'),
        supabase.from('holdings').select('*'),
        supabase.from('sales').select('*')
      ]);

      const allIpos = (iposData || []).map(mapIpo);
      const allPeople = (peopleData || []).map(mapPerson);
      const allBanks = (banksData || []).map(mapBankAccount);
      const allDemats = (dematsData || []).map(mapDematAccount);
      const allApps = (appsData || []).map(mapApplication);
      const allTxs = (txsData || []).map(mapTransaction);
      const allAllocs = (allocsData || []).map(mapAllocation);
      const allHoldings = (holdingsData || []).map(mapHolding);
      const allSales = (salesData || []).map(mapSale);

      // Helper: get person name from demat account
      const getPersonName = (dematAccountId: number): string => {
        const demat = allDemats.find(d => d.id === dematAccountId);
        if (!demat) return 'Unknown';
        const person = allPeople.find(p => p.id === demat.holderPersonId);
        return person ? person.fullName : demat.brokerName;
      };

      const getDematLabel = (dematAccountId: number): string => {
        const demat = allDemats.find(d => d.id === dematAccountId);
        if (!demat) return 'Unknown';
        const person = allPeople.find(p => p.id === demat.holderPersonId);
        const name = person ? person.fullName : 'Unknown';
        return `${name} (${demat.brokerName})`;
      };

      // ─── FILTER DATA ──────────────────────────────────────
      const filteredApps = allApps.filter(a => {
        if (filters.ipoId !== 'ALL' && a.ipoId !== filters.ipoId) return false;
        if (filters.accountId !== 'ALL' && a.dematAccountId !== filters.accountId) return false;
        if (!filterByDateRange(a.createdAt, filters.dateRange)) return false;
        return true;
      });

      const filteredHoldings = allHoldings.filter(h => {
        if (filters.ipoId !== 'ALL' && h.ipoId !== filters.ipoId) return false;
        if (filters.accountId !== 'ALL' && h.dematAccountId !== filters.accountId) return false;
        return true;
      });

      const filteredSales = allSales.filter(s => {
        if (filters.ipoId !== 'ALL' && s.ipoId !== filters.ipoId) return false;
        if (!filterByDateRange(s.date, filters.dateRange)) return false;
        return true;
      });

      const activeAllocs = allAllocs.filter(a => a.status === 'ACTIVE');

      const filteredTxs = allTxs.filter(t => {
        if (filters.ipoId !== 'ALL' && t.ipoId !== filters.ipoId) return false;
        if (!filterByDateRange(t.date, filters.dateRange)) return false;
        return true;
      });

      // ─── CORE FINANCIAL METRICS ────────────────────────────

      // Holdings-based metrics (actual shares held)
      const totalInvested = filteredHoldings.reduce((sum, h) => sum + (h.shares * h.averageCost), 0);
      const currentValue = filteredHoldings.reduce((sum, h) => sum + h.currentValue, 0);
      const unrealizedPnL = currentValue - totalInvested;
      const realizedPnL = filteredSales.reduce((sum, s) => sum + (s.ourProfitShare ?? s.realizedPnL ?? 0), 0);
      const totalPnL = unrealizedPnL + realizedPnL;
      const totalPnLPercentage = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;

      // Blocked = money currently locked in pending IPO applications
      const blockedAmount = activeAllocs
        .filter(a => a.purpose === 'IPO_BLOCKED')
        .reduce((sum, a) => sum + a.amount, 0);

      const activeApplicationsCount = filteredApps.filter(a => a.allotmentStatus === 'PENDING').length;

      // Released = total refunds received from not-allotted applications
      const releasedAmount = filteredApps.reduce((sum, a) => sum + (a.refundAmount || 0), 0);

      // Bank cash: opening_balance + all inflows - all outflows
      let bankCash = 0;
      allBanks.forEach(b => {
        let balance = b.openingBalance || 0;
        allTxs.forEach(t => {
          if (t.toBankAccountId === b.id) balance += (t.amount || 0);
          if (t.fromBankAccountId === b.id) balance -= (t.amount || 0);
        });
        bankCash += balance;
      });

      // Friend/person unallocated money we manage
      const friendUnallocated = activeAllocs
        .filter(a => a.purpose === 'UNALLOCATED' && a.currentHolderType === 'PERSON')
        .reduce((s, a) => s + a.amount, 0);

      const availableUncommitted = Math.max(0, bankCash - blockedAmount);

      // ─── MONEY FLOW ───────────────────────────────────────

      // flowApplied = total capital committed to IPO applications (blocked_amount)
      const flowApplied = filteredApps.reduce((sum, a) => sum + (a.blockedAmount || 0), 0);
      const flowBlocked = blockedAmount;
      // flowDebited = capital that was actually invested (allotted apps)
      const flowDebited = filteredApps.reduce((sum, a) => sum + (a.investmentAmount || 0), 0);
      const flowReleased = releasedAmount;
      const flowSales = filteredSales.reduce((sum, s) => sum + (s.sharesSold * s.sellPrice), 0);
      const flowInvested = totalInvested;
      const totalFlow = flowApplied;

      // ─── IPO APPLICATION ANALYTICS ─────────────────────────
      const totalApps = filteredApps.length;
      const allottedApps = filteredApps.filter(a => a.allotmentStatus === 'FULL').length;
      const partialApps = filteredApps.filter(a => a.allotmentStatus === 'PARTIAL').length;
      const notAllottedApps = filteredApps.filter(a => a.allotmentStatus === 'NIL').length;
      const pendingApps = filteredApps.filter(a => a.allotmentStatus === 'PENDING').length;
      const resolvedApps = totalApps - pendingApps;
      const successRate = resolvedApps > 0 ? ((allottedApps + partialApps) / resolvedApps) * 100 : 0;
      // Previous success rate: use actual data, not random
      const previousSuccessRate = successRate; // No fake data

      const totalAppliedAmount = filteredApps.reduce((sum, a) => sum + (a.blockedAmount || 0), 0);
      const totalAllottedInvestment = flowDebited;

      // ─── ALLOTMENT TABLE ──────────────────────────────────
      const allotmentTable = filteredApps.map(a => {
        const ipo = allIpos.find(i => i.id === a.ipoId);
        return {
          id: a.id ?? 0,
          ipoName: ipo?.ipoName || 'Unknown',
          appliedLots: a.appliedLots || 0,
          allottedLots: a.allottedLots || 0,
          price: a.ipoPrice || 0,
          invested: a.investmentAmount || 0,
          released: a.refundAmount || 0,
          status: a.allotmentStatus === 'PENDING' ? 'Pending'
            : a.allotmentStatus === 'FULL' ? 'Allotted'
            : a.allotmentStatus === 'PARTIAL' ? 'Partial'
            : 'Not Allotted'
        };
      }).sort((a, b) => b.id - a.id).slice(0, 15);

      // ─── HOLDINGS TABLE ───────────────────────────────────
      const holdingsTable = filteredHoldings.map(h => {
        const ipo = allIpos.find(i => i.id === h.ipoId);
        const invested = (h.shares || 0) * (h.averageCost || 0);
        const current = h.currentValue || 0;
        const pnl = h.unrealizedProfit || 0;
        const pnlPercent = h.unrealizedROI || 0;
        return {
          id: h.id ?? 0,
          ipoName: ipo?.ipoName || 'Unknown',
          holderName: getPersonName(h.dematAccountId),
          qty: h.shares || 0,
          avgPrice: h.averageCost || 0,
          ltp: h.currentPrice || 0,
          invested,
          current,
          pnl,
          pnlPercent
        };
      }).sort((a, b) => b.current - a.current);

      // Top Gainers / Losers — only from real holding data
      const topGainers = [...holdingsTable]
        .filter(h => h.pnl > 0)
        .sort((a, b) => b.pnlPercent - a.pnlPercent)
        .map(h => ({ ipoName: h.ipoName, pnlPercent: h.pnlPercent, pnl: h.pnl }))
        .slice(0, 3);
      const topLosers = [...holdingsTable]
        .filter(h => h.pnl < 0)
        .sort((a, b) => a.pnlPercent - b.pnlPercent)
        .map(h => ({ ipoName: h.ipoName, pnlPercent: h.pnlPercent, pnl: h.pnl }))
        .slice(0, 3);

      const bestPerformingIpo = topGainers.length > 0
        ? { name: topGainers[0].ipoName, pnlPercent: topGainers[0].pnlPercent }
        : null;
      const worstPerformingIpo = topLosers.length > 0
        ? { name: topLosers[0].ipoName, pnlPercent: topLosers[0].pnlPercent }
        : null;
      const averageIpoReturn = holdingsTable.length > 0
        ? holdingsTable.reduce((sum, h) => sum + h.pnlPercent, 0) / holdingsTable.length
        : 0;

      // ─── MONTHLY CHARTS (Real Data Only) ───────────────────
      const moneyFlowChart: MoneyFlowChartData[] = [];
      const pnlChart: PnLChartData[] = [];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

      const now = new Date();
      const currentYear = now.getFullYear();

      for (let i = 0; i < 12; i++) {
        let mInvested = 0;
        let mReleased = 0;
        let mSales = 0;
        let mProfit = 0;

        filteredApps.forEach(a => {
          const dateStr = a.createdAt;
          if (!dateStr) return;
          const d = new Date(dateStr);
          if (isNaN(d.getTime())) return;
          if (d.getMonth() === i && d.getFullYear() === currentYear) {
            // Use blockedAmount for capital committed (this is the actual money that moved)
            mInvested += (a.blockedAmount || 0);
            mReleased += (a.refundAmount || 0);
          }
        });

        filteredSales.forEach(s => {
          const dateStr = s.date;
          if (!dateStr) return;
          const d = new Date(dateStr);
          if (isNaN(d.getTime())) return;
          if (d.getMonth() === i && d.getFullYear() === currentYear) {
            mSales += ((s.sharesSold || 0) * (s.sellPrice || 0));
            mProfit += (s.ourProfitShare ?? s.realizedPnL ?? 0);
          }
        });

        moneyFlowChart.push({
          period: months[i],
          invested: mInvested,
          released: mReleased,
          sales: mSales,
          netFlow: mInvested - mReleased - mSales
        });

        pnlChart.push({
          period: months[i],
          profit: mProfit
        });
      }

      // ─── INVESTMENT BREAKDOWN (Real data only) ─────────────
      const investmentBreakdown = [
        { name: 'IPO Holdings', value: totalInvested, color: '#635bff' },
        { name: 'Bank Cash', value: Math.max(0, bankCash), color: '#22c55e' },
        { name: 'IPO Blocked', value: blockedAmount, color: '#f5a623' },
        { name: 'Friend Balances', value: friendUnallocated, color: '#8d49f7' }
      ].filter(d => d.value > 0);

      // ─── DEMAT / BROKER DISTRIBUTION ───────────────────────
      // Group holdings by demat account, show person name + broker
      const dematDistMap: Record<number, { invested: number; current: number }> = {};
      filteredHoldings.forEach(h => {
        const accId = h.dematAccountId;
        if (!dematDistMap[accId]) dematDistMap[accId] = { invested: 0, current: 0 };
        dematDistMap[accId].invested += ((h.shares || 0) * (h.averageCost || 0));
        dematDistMap[accId].current += (h.currentValue || 0);
      });
      const dematDistribution = Object.entries(dematDistMap).map(([accId, data]) => ({
        accountId: Number(accId),
        name: getDematLabel(Number(accId)),
        invested: data.invested,
        current: data.current
      }));

      // ─── RECENT TRANSACTIONS (Real data, sorted by date) ──
      const recentActivity: Array<{
        id: string;
        date: string;
        type: string;
        title: string;
        subtitle: string;
        amount: number;
        isPositive: boolean;
        timestamp: number;
      }> = [];

      // Add actual transactions
      filteredTxs.forEach(t => {
        const ipo = t.ipoId ? allIpos.find(i => i.id === t.ipoId) : null;
        const txType = t.transactionType || '';
        const humanType = txType.split('_').map((w: string) => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
        const isInflow = txType === 'MONEY_RECEIVED' || txType === 'IPO_REFUND' || txType === 'IPO_SELL';

        let subtitle = t.notes || '';
        if (ipo) subtitle = ipo.ipoName;
        if (!subtitle) subtitle = humanType;

        recentActivity.push({
          id: `tx-${t.id}`,
          date: t.date || '',
          type: txType,
          title: humanType,
          subtitle,
          amount: t.amount || 0,
          isPositive: isInflow,
          timestamp: t.createdAt ? new Date(t.createdAt).getTime() : 0
        });
      });

      // Add recent applications
      filteredApps.forEach(a => {
        const ipo = allIpos.find(i => i.id === a.ipoId);
        const person = getPersonName(a.dematAccountId);
        recentActivity.push({
          id: `app-${a.id}`,
          date: a.createdAt ? a.createdAt.split('T')[0] : '',
          type: 'APPLICATION',
          title: `${ipo?.ipoName || 'IPO'} Application`,
          subtitle: `${person} • ${a.appliedLots || 0} lot(s)`,
          amount: a.blockedAmount || a.investmentAmount || 0,
          isPositive: false,
          timestamp: a.createdAt ? new Date(a.createdAt).getTime() : 0
        });
      });

      const recentTransactions = recentActivity
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 10);

      // ─── ACTIONS REQUIRED (Real data) ──────────────────────
      const actions: Array<{ id: string; message: string; type: string; link: string }> = [];
      const todayStr = new Date().toISOString().split('T')[0];

      // IPOs with allotment today
      allIpos.forEach(ipo => {
        if (ipo.allotmentDate === todayStr) {
          actions.push({
            id: `allot-${ipo.id}`,
            message: `${ipo.ipoName} allotment is today — check allotment status`,
            type: 'INFO',
            link: '/applications'
          });
        }
      });

      // Pending applications (waiting for allotment)
      if (activeApplicationsCount > 0) {
        actions.push({
          id: 'pending-apps',
          message: `${activeApplicationsCount} application(s) pending allotment result`,
          type: 'WARNING',
          link: '/applications'
        });
      }

      // IPOs open for subscription
      const openIpos = allIpos.filter(i => i.status === 'OPEN' || i.status === 'UPCOMING');
      if (openIpos.length > 0) {
        openIpos.forEach(ipo => {
          actions.push({
            id: `open-${ipo.id}`,
            message: `${ipo.ipoName} is ${ipo.status === 'OPEN' ? 'open for subscription' : 'upcoming'} (${ipo.openDate})`,
            type: 'INFO',
            link: '/ipos'
          });
        });
      }

      // Friend balances to settle
      if (friendUnallocated > 0) {
        actions.push({
          id: 'friend-unalloc',
          message: `₹${friendUnallocated.toLocaleString('en-IN')} in friend accounts needs settlement`,
          type: 'SUCCESS',
          link: '/people'
        });
      }

      // Holdings with no current price update (listing pending)
      const pendingListings = filteredHoldings.filter(h => {
        const app = allApps.find(a => a.id === h.applicationId);
        return app && app.listingStatus === 'LISTING_PENDING';
      });
      if (pendingListings.length > 0) {
        const ipoNames = [...new Set(pendingListings.map(h => {
          const ipo = allIpos.find(i => i.id === h.ipoId);
          return ipo?.ipoName || 'Unknown';
        }))];
        actions.push({
          id: 'listing-pending',
          message: `${ipoNames.join(', ')} — listing pending, update market price when listed`,
          type: 'WARNING',
          link: '/holdings'
        });
      }

      // ─── PORTFOLIO GROWTH (Real cumulative data) ───────────
      // Build from actual application/holding creation dates
      const portfolioGrowthChart: Array<{ date: string; value: number; invested: number }> = [];
      // Use months that have actual activity
      const activeMonths = new Set<string>();
      filteredApps.forEach(a => {
        if (a.createdAt) {
          const d = new Date(a.createdAt);
          if (!isNaN(d.getTime())) {
            activeMonths.add(months[d.getMonth()]);
          }
        }
      });
      // Show last 6 months or active months
      const last6 = [];
      for (let i = 5; i >= 0; i--) {
        const mIdx = (now.getMonth() - i + 12) % 12;
        last6.push(months[mIdx]);
      }

      let cumulativeInvested = 0;
      let cumulativeValue = 0;
      last6.forEach(month => {
        const mIdx = months.indexOf(month);
        // Add investments from this month
        filteredApps.forEach(a => {
          if (!a.createdAt) return;
          const d = new Date(a.createdAt);
          if (isNaN(d.getTime())) return;
          if (d.getMonth() === mIdx && d.getFullYear() === currentYear) {
            cumulativeInvested += (a.investmentAmount || 0);
          }
        });
        // For the current month, use actual currentValue from holdings
        if (month === months[now.getMonth()]) {
          cumulativeValue = currentValue;
        } else {
          cumulativeValue = cumulativeInvested; // Before listing, value = invested cost
        }
        portfolioGrowthChart.push({
          date: month,
          invested: cumulativeInvested,
          value: cumulativeValue
        });
      });

      return {
        totalInvested, currentValue, totalPnL, totalPnLPercentage,
        blockedAmount, releasedAmount, availableUncommitted, activeApplicationsCount,
        totalFlow, flowApplied, flowBlocked, flowDebited, flowReleased, flowSales, flowInvested,
        moneyFlowChart,
        totalApps, allottedApps, partialApps, notAllottedApps, pendingApps, successRate, previousSuccessRate,
        totalAppliedAmount, totalAllottedInvestment,
        allotmentTable, holdingsTable,
        realizedPnL, unrealizedPnL, pnlChart,
        topGainers, topLosers, bestPerformingIpo, worstPerformingIpo, averageIpoReturn, totalIposHeld: holdingsTable.length,
        investmentBreakdown, dematDistribution, recentTransactions, actions,
        portfolioGrowthChart
      };
    },
    refetchInterval: 30000,
  });
}
