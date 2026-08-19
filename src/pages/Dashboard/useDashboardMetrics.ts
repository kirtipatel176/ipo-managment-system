import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import {
  mapIpo, mapPerson, mapBankAccount, mapApplication, mapTransaction,
  mapHolding, mapSale
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

export interface CommandCenterMetrics {
  // Key Metrics
  bankCash: number;
  ipoBlocked: number;
  available: number;
  invested: number;
  realizedPnL: number;
  unrealizedPnL: number;
  totalValue: number;
  
  allotmentRate: number;
  reconciliationHealth: number;

  // Capital Flow Chart
  moneyFlowChart: MoneyFlowChartData[];
  
  // Smart Insights
  smartInsights: string[];

  // Applications Grouped by IPO
  applicationsByIPO: Array<{
    ipoId: number;
    ipoName: string;
    appliedLots: number;
    allottedLots: number;
    investmentAmount: number;
    statuses: { [key: string]: number };
    applicants: any[];
  }>;

  // Bank Accounts
  bankAccounts: Array<{
    id: number;
    name: string;
    bankName: string;
    cash: number;
    blocked: number;
    available: number;
    reconciled: boolean;
  }>;

  // People & Settlements
  peopleSettlements: Array<{
    personId: number;
    name: string;
    outstanding: number;
    agingDays: number;
  }>;

  // Asset Distribution
  assetDistribution: Array<{ name: string; value: number; color: string }>;

  // Holdings
  holdingsTable: any[];

  // Recent Activity
  recentActivity: Array<{
    id: string;
    date: string;
    type: string;
    title: string;
    subtitle: string;
    amount: number;
    isPositive: boolean;
    timestamp: number;
  }>;
  
  // Actions Required
  actionsRequired: Array<{ id: string; message: string; type: 'INFO' | 'WARNING' | 'SUCCESS' | 'DANGER'; link: string }>;
}

function filterByDateRange(dateString: string | null | undefined, range: DashboardFilters['dateRange']): boolean {
  if (range === 'ALL_TIME') return true;
  if (!dateString) return true;
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return true;
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
  return useQuery<CommandCenterMetrics | undefined>({
    queryKey: ['dashboardMetrics', filters],
    queryFn: async () => {
      const [
        { data: iposData },
        { data: peopleData },
        { data: banksData },
        { data: appsData },
        { data: txsData },
        { data: holdingsData },
        { data: salesData }
      ] = await Promise.all([
        supabase.from('ipos').select('*'),
        supabase.from('people').select('*'),
        supabase.from('bank_accounts').select('*'),
        supabase.from('applications').select('*'),
        supabase.from('transactions').select('*').eq('status', 'COMPLETED'),
        supabase.from('holdings').select('*'),
        supabase.from('sales').select('*')
      ]);

      const allIpos = (iposData || []).map(mapIpo);
      const allPeople = (peopleData || []).map(mapPerson);
      const allBanks = (banksData || []).map(mapBankAccount);
      const allApps = (appsData || []).map(mapApplication);
      const allTxs = (txsData || []).map(mapTransaction);
      const allHoldings = (holdingsData || []).map(mapHolding);
      const allSales = (salesData || []).map(mapSale);

      // --- FILTER DATA based on date range and IPO/Account filters ---
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

      const filteredTxs = allTxs.filter(t => {
        if (filters.ipoId !== 'ALL' && t.ipoId !== filters.ipoId) return false;
        if (!filterByDateRange(t.date, filters.dateRange)) return false;
        return true;
      });

      // ============================================
      // 1. RULE: Bank Cash
      // bank cash = opening_balance + inflows - outflows for is_active=true
      // ============================================
      let globalBankCash = 0;
      const bankAccountsList: CommandCenterMetrics['bankAccounts'] = [];

      allBanks.filter(b => b.isActive).forEach(b => {
        let balance = b.openingBalance || 0;
        allTxs.forEach(t => {
          if (t.toBankAccountId === b.id) balance += (t.amount || 0);
          if (t.fromBankAccountId === b.id) balance -= (t.amount || 0);
        });
        
        globalBankCash += balance;

        // Per account IPO blocked
        const blockedForAccount = allApps
          .filter(a => a.fundingBankAccountId === b.id && a.moneyStatus === 'BLOCKED')
          .reduce((sum, a) => sum + (a.blockedAmount || 0), 0);

        bankAccountsList.push({
          id: b.id,
          name: b.accountName,
          bankName: b.bankName,
          cash: balance,
          blocked: blockedForAccount,
          available: balance - blockedForAccount,
          reconciled: true, // Placeholder for reconciliation status
        });
      });

      // ============================================
      // 2. RULE: IPO Blocked
      // ============================================
      const ipoBlocked = allApps
        .filter(a => a.moneyStatus === 'BLOCKED')
        .reduce((sum, a) => sum + (a.blockedAmount || 0), 0);

      // ============================================
      // 3. RULE: Available
      // ============================================
      const available = globalBankCash - ipoBlocked;

      // ============================================
      // 4. RULE: Invested
      // ============================================
      const invested = filteredApps
        .filter(a => a.allotmentStatus === 'FULL' || a.allotmentStatus === 'PARTIAL')
        .reduce((sum, a) => sum + (a.investmentAmount || 0), 0);

      // ============================================
      // 5. RULE: Realized P&L
      // ============================================
      const realizedPnL = filteredSales.reduce((sum, s) => sum + (s.realizedPnL || 0), 0);

      // ============================================
      // 6. RULE: Unrealized P&L
      // ============================================
      const unrealizedPnL = filteredHoldings.reduce((sum, h) => sum + (h.unrealizedProfit || 0), 0);

      // ============================================
      // 7. RULE: Total Value
      // ============================================
      const currentHoldingsValue = filteredHoldings.reduce((sum, h) => sum + (h.currentValue || 0), 0);
      const totalValue = globalBankCash + currentHoldingsValue;

      // ============================================
      // 8. RULE: Friend / Person Outstanding
      // ============================================
      const peopleSettlements: CommandCenterMetrics['peopleSettlements'] = [];
      const nowMs = new Date().getTime();

      allPeople.filter(p => !p.isSelf).forEach(p => {
        // Funded by you
        const appsFundedByYou = allApps.filter(a => 
          a.applicantPersonId === p.id && 
          a.applicationType === 'FRIEND_DEMAT' && 
          allBanks.some(b => b.id === a.fundingBankAccountId && b.isActive)
        );

        const totalFunded = appsFundedByYou.reduce((sum, a) => sum + (a.investmentAmount || a.blockedAmount || 0), 0);

        // Deduct settlements. Since FRIEND_SETTLEMENT doesn't exist, we use MONEY_RECEIVED where fromPersonId is friend.
        const settlements = allTxs.filter(t => 
          t.fromPersonId === p.id && 
          t.transactionType === 'MONEY_RECEIVED'
        ).reduce((sum, t) => sum + (t.amount || 0), 0);

        const outstanding = totalFunded - settlements;
        
        let oldestAppDateMs = nowMs;
        if (outstanding > 0) {
            appsFundedByYou.forEach(a => {
                if (a.createdAt) {
                    const d = new Date(a.createdAt).getTime();
                    if (d < oldestAppDateMs) oldestAppDateMs = d;
                }
            });
        }
        
        const agingDays = outstanding > 0 ? Math.floor((nowMs - oldestAppDateMs) / (1000 * 60 * 60 * 24)) : 0;

        peopleSettlements.push({
          personId: p.id,
          name: p.fullName,
          outstanding,
          agingDays,
        });
      });

      // ============================================
      // 9. RULE: Allotment Rate
      // ============================================
      const resolvedApps = filteredApps.filter(a => a.allotmentStatus !== 'PENDING');
      const allottedCount = resolvedApps.filter(a => a.allotmentStatus === 'FULL' || a.allotmentStatus === 'PARTIAL').length;
      const allotmentRate = resolvedApps.length > 0 ? (allottedCount / resolvedApps.length) * 100 : 0;

      // ============================================
      // 10. RULE: Reconciliation Health
      // ============================================
      const reconciliationHealth = 0; // Placeholder

      // ============================================
      // Smart Insights Engine
      // ============================================
      const smartInsights: string[] = [];
      
      // Allotment rate vs baseline
      if (resolvedApps.length >= 5) {
        const rate = Math.round(allotmentRate);
        const relative = rate > 25 ? 'above' : (rate < 15 ? 'below' : 'within');
        smartInsights.push(`Your allotment rate of ${rate}% is ${relative} the typical retail range (15–25%).`);
      }

      // Blocked capital reminder
      if (totalValue > 0 && (ipoBlocked / totalValue) > 0.2) {
        const blockedApps = allApps.filter(a => a.moneyStatus === 'BLOCKED');
        if (blockedApps.length > 0) {
          const soonest = blockedApps.reduce((acc, curr) => {
            const ipo = allIpos.find(i => i.id === curr.ipoId);
            if (ipo && ipo.allotmentDate) {
               if (!acc) return ipo.allotmentDate;
               return new Date(ipo.allotmentDate) < new Date(acc) ? ipo.allotmentDate : acc;
            }
            return acc;
          }, '');
          
          smartInsights.push(`₹${ipoBlocked.toLocaleString('en-IN')} is currently blocked across ${blockedApps.length} applications — the earliest result is expected ${soonest ? new Date(soonest).toLocaleDateString('en-GB') : 'soon'}.`);
        }
      }

      // Available capital nudge
      const openIpos = allIpos.filter(i => i.status === 'OPEN');
      if (available > 14000 && openIpos.length > 0) {
        smartInsights.push(`You have ₹${available.toLocaleString('en-IN')} available — ${openIpos[0].ipoName} is open for subscription until ${openIpos[0].closeDate}.`);
      }

      // Outstanding aging
      const agedFriends = peopleSettlements.filter(p => p.outstanding > 0 && p.agingDays > 14);
      if (agedFriends.length > 0) {
        const p = agedFriends[0];
        smartInsights.push(`${p.name}'s ₹${p.outstanding.toLocaleString('en-IN')} has been outstanding for ${p.agingDays} days — worth a nudge.`);
      }

      // Best/worst performer
      if (filteredSales.length >= 3) {
        const sortedSales = [...filteredSales].sort((a, b) => (b.realizedPnL || 0) - (a.realizedPnL || 0));
        const best = sortedSales[0];
        if (best && best.realizedPnL && best.realizedPnL > 0) {
            const ipo = allIpos.find(i => i.id === best.ipoId);
            const returnPct = best.costBasis > 0 ? ((best.realizedPnL / best.costBasis) * 100).toFixed(1) : 0;
            smartInsights.push(`${ipo?.ipoName || 'An IPO'} was your best return this period at ${returnPct}%.`);
        }
      }

      // Duplicate UTR anomaly (mocking detect logic)
      const utrCounts: Record<string, number> = {};
      allTxs.forEach(t => {
        if (t.utr && t.utr.trim().length > 3) {
          utrCounts[t.utr] = (utrCounts[t.utr] || 0) + 1;
        }
      });
      const duplicateUtrs = Object.keys(utrCounts).filter(k => utrCounts[k] > 1);
      if (duplicateUtrs.length > 0) {
        smartInsights.push(`Two or more transactions share UTR ${duplicateUtrs[0]} — one is likely a duplicate entry.`);
      }

      if (smartInsights.length === 0) {
        smartInsights.push("Everything's reconciled and nothing needs attention right now.");
      }

      // ============================================
      // Applications Grouped by IPO
      // ============================================
      const appsByIpoMap = new Map<number, CommandCenterMetrics['applicationsByIPO'][0]>();
      
      filteredApps.forEach(a => {
        if (!appsByIpoMap.has(a.ipoId)) {
          const ipo = allIpos.find(i => i.id === a.ipoId);
          appsByIpoMap.set(a.ipoId, {
            ipoId: a.ipoId,
            ipoName: ipo?.ipoName || 'Unknown IPO',
            appliedLots: 0,
            allottedLots: 0,
            investmentAmount: 0,
            statuses: {},
            applicants: []
          });
        }
        
        const grp = appsByIpoMap.get(a.ipoId)!;
        grp.appliedLots += (a.appliedLots || 0);
        grp.allottedLots += (a.allottedLots || 0);
        grp.investmentAmount += (a.investmentAmount || 0);
        
        const status = a.allotmentStatus || 'UNKNOWN';
        grp.statuses[status] = (grp.statuses[status] || 0) + 1;
        
        const applicantName = allPeople.find(p => p.id === a.applicantPersonId)?.fullName || 'Unknown';
        grp.applicants.push({ ...a, applicantName });
      });

      const applicationsByIPO = Array.from(appsByIpoMap.values())
        .sort((a, b) => b.ipoId - a.ipoId)
        .slice(0, 15);

      // ============================================
      // Asset Distribution
      // ============================================
      const assetDistribution = [
        { name: 'Bank Cash', value: available, color: '#10b981' }, // emerald-500
        { name: 'IPO Blocked', value: ipoBlocked, color: '#f59e0b' }, // amber-500
        { name: 'Investments', value: currentHoldingsValue, color: '#6366f1' }, // indigo-500
      ].filter(d => d.value > 0);

      // ============================================
      // Recent Activity
      // ============================================
      const recentActivity: CommandCenterMetrics['recentActivity'] = [];

      filteredTxs.forEach(t => {
        let type = 'EXTERNAL_DEPOSIT'; // Default safe fallback
        if (t.transactionType === 'MONEY_SENT') type = 'EXTERNAL_PAYMENT';
        if (t.transactionType === 'MONEY_RECEIVED') type = 'EXTERNAL_DEPOSIT';
        if (t.transactionType === 'SELF_TRANSFER') type = 'OWN_ACCOUNT_TRANSFER';
        if (t.transactionType === 'IPO_REFUND') type = 'IPO_REFUND';
        if (t.transactionType === 'IPO_SELL') type = 'IPO_SALE_PROCEEDS';
        if (t.transactionType === 'IPO_BLOCKED') type = 'IPO_FUNDING';

        const isInflow = type === 'EXTERNAL_DEPOSIT' || type === 'IPO_REFUND' || type === 'IPO_SALE_PROCEEDS' || type === 'FRIEND_FUNDING_RECEIVED';

        const ipo = t.ipoId ? allIpos.find(i => i.id === t.ipoId) : null;
        let subtitle = t.notes || '';
        if (ipo) subtitle = ipo.ipoName;
        if (!subtitle) {
           subtitle = type.split('_').map((w: string) => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
        }
        
        let title = type.split('_').map((w: string) => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');

        recentActivity.push({
          id: `tx-${t.id}`,
          date: t.date || '',
          type,
          title,
          subtitle,
          amount: t.amount || 0,
          isPositive: isInflow,
          timestamp: t.createdAt ? new Date(t.createdAt).getTime() : 0
        });
      });

      const sortedRecentActivity = recentActivity
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 10);

      // ============================================
      // Actions Required
      // ============================================
      const actionsRequired: CommandCenterMetrics['actionsRequired'] = [];
      const todayStr = new Date().toISOString().split('T')[0];

      allIpos.forEach(ipo => {
        if (ipo.allotmentDate === todayStr) {
          actionsRequired.push({
            id: `allot-${ipo.id}`,
            message: `${ipo.ipoName} allotment is today`,
            type: 'INFO',
            link: '/applications'
          });
        }
      });

      const pendingAppsCount = allApps.filter(a => a.allotmentStatus === 'PENDING').length;
      if (pendingAppsCount > 0) {
        actionsRequired.push({
          id: 'pending-apps',
          message: `${pendingAppsCount} application(s) pending allotment`,
          type: 'WARNING',
          link: '/applications'
        });
      }

      openIpos.forEach(ipo => {
        actionsRequired.push({
          id: `open-${ipo.id}`,
          message: `${ipo.ipoName} is open for subscription`,
          type: 'INFO',
          link: '/ipos'
        });
      });

      if (reconciliationHealth > 0) {
        actionsRequired.push({
          id: 'reconciliation',
          message: `${reconciliationHealth} unreconciled bank account(s)`,
          type: 'DANGER',
          link: '/accounts'
        });
      }

      // ============================================
      // Holdings Table & Charts
      // ============================================
      const holdingsTable = filteredHoldings.map(h => {
        const ipo = allIpos.find(i => i.id === h.ipoId);
        const personName = allPeople.find(p => p.id === h.personId)?.fullName || 'Unknown';
        return {
          id: h.id ?? 0,
          ipoName: ipo?.ipoName || 'Unknown',
          holderName: personName,
          qty: h.shares || 0,
          avgPrice: h.averageCost || 0,
          ltp: h.currentPrice || 0,
          invested: (h.shares || 0) * (h.averageCost || 0),
          current: h.currentValue || 0,
          pnl: h.unrealizedProfit || 0,
          pnlPercent: h.unrealizedROI || 0
        };
      }).sort((a, b) => b.current - a.current);

      const moneyFlowChart: MoneyFlowChartData[] = [];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const now = new Date();
      const currentYear = now.getFullYear();

      for (let i = 0; i < 12; i++) {
        let mInvested = 0;
        let mReleased = 0;
        let mSales = 0;

        filteredApps.forEach(a => {
          if (!a.createdAt) return;
          const d = new Date(a.createdAt);
          if (isNaN(d.getTime())) return;
          if (d.getMonth() === i && d.getFullYear() === currentYear) {
            mInvested += (a.blockedAmount || 0);
            mReleased += (a.refundAmount || 0);
          }
        });

        filteredSales.forEach(s => {
          if (!s.date) return;
          const d = new Date(s.date);
          if (isNaN(d.getTime())) return;
          if (d.getMonth() === i && d.getFullYear() === currentYear) {
            mSales += ((s.sharesSold || 0) * (s.sellPrice || 0));
          }
        });

        moneyFlowChart.push({
          period: months[i],
          invested: mInvested,
          released: mReleased,
          sales: mSales,
          netFlow: mInvested - mReleased - mSales
        });
      }

      return {
        bankCash: globalBankCash,
        ipoBlocked,
        available,
        invested,
        realizedPnL,
        unrealizedPnL,
        totalValue,
        allotmentRate,
        reconciliationHealth,
        moneyFlowChart,
        smartInsights,
        applicationsByIPO,
        bankAccounts: bankAccountsList,
        peopleSettlements,
        assetDistribution,
        holdingsTable,
        recentActivity: sortedRecentActivity,
        actionsRequired: actionsRequired.sort((a, _b) => a.type === 'DANGER' ? -1 : 1).slice(0, 4)
      };
    },
    refetchInterval: 30000,
  });
}
