import React from 'react';
import { Filter, Calendar, CreditCard, RefreshCcw } from 'lucide-react';
import type { DashboardFilters } from '../useDashboardMetrics';
import { Button } from '../../../components/ui/Button';

interface Props {
  filters: DashboardFilters;
  setFilters: React.Dispatch<React.SetStateAction<DashboardFilters>>;
  allIpos: any[];
  allDemats: any[];
  allPeople?: any[];
  onRefresh: () => void;
}

export const DashboardHeader: React.FC<Props> = ({ filters, setFilters, allIpos, allDemats, allPeople, onRefresh }) => {
  // Build demat label using person name + broker
  const getDematLabel = (demat: any) => {
    const person = allPeople?.find((p: any) => p.id === demat.holderPersonId);
    const name = person ? person.fullName : 'Unknown';
    return `${name} (${demat.brokerName})`;
  };

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">Command Center</h1>
        <p className="mt-1 text-text-secondary text-sm">Enterprise IPO & Capital Management Analytics.</p>
      </div>
      
      <div className="flex flex-wrap items-center gap-3">
        {/* Date Range Filter */}
        <div className="relative">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-text-tertiary">
            <Calendar size={14} />
          </div>
          <select
            value={filters.dateRange}
            onChange={e => setFilters(prev => ({ ...prev, dateRange: e.target.value as any }))}
            className="pl-9 pr-8 py-2 rounded-xl bg-white border border-black/10 text-sm font-medium text-text-primary shadow-sm hover:border-accent-blue/40 focus:outline-none focus:ring-2 focus:ring-accent-blue/30 transition-all appearance-none cursor-pointer"
          >
            <option value="ALL_TIME">All Time</option>
            <option value="TODAY">Today</option>
            <option value="THIS_WEEK">This Week</option>
            <option value="THIS_MONTH">This Month</option>
            <option value="LAST_3_MONTHS">Last 3 Months</option>
            <option value="THIS_YEAR">This Year</option>
            <option value="LAST_YEAR">Last Year</option>
          </select>
        </div>

        {/* IPO Filter */}
        <div className="relative">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-text-tertiary">
            <Filter size={14} />
          </div>
          <select
            value={filters.ipoId}
            onChange={e => setFilters(prev => ({ ...prev, ipoId: e.target.value === 'ALL' ? 'ALL' : Number(e.target.value) }))}
            className="pl-9 pr-8 py-2 rounded-xl bg-white border border-black/10 text-sm font-medium text-text-primary shadow-sm hover:border-accent-blue/40 focus:outline-none focus:ring-2 focus:ring-accent-blue/30 transition-all appearance-none cursor-pointer max-w-[180px] truncate"
          >
            <option value="ALL">All IPOs</option>
            {allIpos?.map(ipo => (
              <option key={ipo.id} value={ipo.id}>{ipo.ipoName}</option>
            ))}
          </select>
        </div>

        {/* Account Filter */}
        <div className="relative">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-text-tertiary">
            <CreditCard size={14} />
          </div>
          <select
            value={filters.accountId}
            onChange={e => setFilters(prev => ({ ...prev, accountId: e.target.value === 'ALL' ? 'ALL' : Number(e.target.value) }))}
            className="pl-9 pr-8 py-2 rounded-xl bg-white border border-black/10 text-sm font-medium text-text-primary shadow-sm hover:border-accent-blue/40 focus:outline-none focus:ring-2 focus:ring-accent-blue/30 transition-all appearance-none cursor-pointer max-w-[200px] truncate"
          >
            <option value="ALL">All Accounts</option>
            {allDemats?.map(d => (
              <option key={d.id} value={d.id}>{getDematLabel(d)}</option>
            ))}
          </select>
        </div>

        <Button variant="outline" size="sm" icon={<RefreshCcw size={14} />} onClick={onRefresh} className="bg-white">
          Refresh
        </Button>
      </div>
    </div>
  );
};
