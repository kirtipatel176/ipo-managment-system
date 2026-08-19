import React from 'react';
import { RefreshCw } from 'lucide-react';
import type { DashboardFilters } from '../useDashboardMetrics';

interface DashboardHeaderProps {
  filters: DashboardFilters;
  setFilters: (filters: DashboardFilters) => void;
  allIpos: any[];
  onRefresh: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ filters, setFilters, allIpos, onRefresh }) => {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
      <div>
        <h1 className="text-3xl font-extrabold premium-gradient-text tracking-tight">Command Center</h1>
        <p className="text-sm text-text-secondary mt-0.5 font-medium">Overview of all capital, allocations, and performance.</p>
      </div>

      <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0 hide-scrollbar">
        <select
          value={filters.dateRange}
          onChange={(e) => setFilters({ ...filters, dateRange: e.target.value as DashboardFilters['dateRange'] })}
          className="h-10 px-4 rounded-xl border border-black/5 bg-white/70 backdrop-blur-md text-sm font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/50 shadow-sm min-w-[130px] transition-all hover:bg-white/90 cursor-pointer"
        >
          <option value="TODAY">Today</option>
          <option value="THIS_WEEK">This Week</option>
          <option value="THIS_MONTH">This Month</option>
          <option value="LAST_3_MONTHS">Last 3 Months</option>
          <option value="THIS_YEAR">This Year</option>
          <option value="ALL_TIME">All Time</option>
        </select>

        <select
          value={filters.ipoId}
          onChange={(e) => setFilters({ ...filters, ipoId: e.target.value === 'ALL' ? 'ALL' : Number(e.target.value) })}
          className="h-10 px-4 rounded-xl border border-black/5 bg-white/70 backdrop-blur-md text-sm font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/50 shadow-sm min-w-[150px] max-w-[220px] truncate transition-all hover:bg-white/90 cursor-pointer"
        >
          <option value="ALL">All IPOs</option>
          {allIpos.map(i => (
            <option key={i.id} value={i.id}>{i.ipoName}</option>
          ))}
        </select>

        <button
          onClick={onRefresh}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-black/5 bg-white/70 backdrop-blur-md text-text-secondary hover:bg-white hover:text-accent-blue transition-all shadow-sm shrink-0 hover:-translate-y-0.5"
          title="Refresh Data"
        >
          <RefreshCw size={18} />
        </button>
      </div>
    </div>
  );
};
