import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import type { DashboardFilters } from './useDashboardMetrics';
import { useDashboardMetrics } from './useDashboardMetrics';
import { mapIpo, mapDematAccount, mapPerson } from '../../lib/mappers';

import { DashboardHeader } from './components/DashboardHeader';
import { FinancialSummary } from './components/FinancialSummary';
import { ActionRequired } from './components/ActionRequired';
import { MoneyFlow } from './components/MoneyFlow';
import { IPOAnalytics } from './components/IPOAnalytics';
import { HoldingsOverview } from './components/HoldingsOverview';
import { PnLAnalytics } from './components/PnLAnalytics';
import { Distribution } from './components/Distribution';
import { RecentTransactions } from './components/RecentTransactions';
import { SmartInsights } from './components/SmartInsights';

export const Dashboard: React.FC = () => {
  const [filters, setFilters] = useState<DashboardFilters>({
    dateRange: 'ALL_TIME',
    accountId: 'ALL',
    ipoId: 'ALL'
  });

  const { data: allIpos } = useQuery({
    queryKey: ['ipos-list-dash'],
    queryFn: async () => {
      const { data } = await supabase.from('ipos').select('*');
      return (data || []).map(mapIpo);
    }
  });

  const { data: allDemats } = useQuery({
    queryKey: ['demat-list-dash'],
    queryFn: async () => {
      const { data } = await supabase.from('demat_accounts').select('*');
      return (data || []).map(mapDematAccount);
    }
  });

  const { data: allPeople } = useQuery({
    queryKey: ['people-list-dash'],
    queryFn: async () => {
      const { data } = await supabase.from('people').select('*');
      return (data || []).map(mapPerson);
    }
  });

  const { data: metrics, isLoading, error, refetch } = useDashboardMetrics(filters);

  const formatCurrency = (val: number = 0) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center min-h-[60vh] flex-col gap-4 text-center px-4">
        <div className="text-accent-red font-bold text-xl">Dashboard Error</div>
        <pre className="text-sm text-text-secondary bg-black/5 p-4 rounded-xl max-w-2xl overflow-auto text-left whitespace-pre-wrap">
          {String(error)}
          {'\n'}
          {(error as any)?.stack}
        </pre>
      </div>
    );
  }

  if (isLoading || !metrics) {
    return (
      <div className="flex h-full w-full items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent-blue/20 border-t-accent-blue" />
      </div>
    );
  }

  return (
    <div className="space-y-2 pb-20 max-w-7xl mx-auto px-4 md:px-0">
      <DashboardHeader 
        filters={filters} 
        setFilters={setFilters} 
        allIpos={allIpos || []} 
        allDemats={allDemats || []} 
        allPeople={allPeople || []}
        onRefresh={() => refetch()} 
      />

      <ActionRequired metrics={metrics} />

      <FinancialSummary metrics={metrics} formatCurrency={formatCurrency} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <MoneyFlow metrics={metrics} formatCurrency={formatCurrency} />
        </div>
        <div className="lg:col-span-1">
          <SmartInsights metrics={metrics} formatCurrency={formatCurrency} />
        </div>
      </div>

      <IPOAnalytics metrics={metrics} formatCurrency={formatCurrency} />

      <HoldingsOverview metrics={metrics} formatCurrency={formatCurrency} />

      <PnLAnalytics metrics={metrics} formatCurrency={formatCurrency} />

      <Distribution metrics={metrics} formatCurrency={formatCurrency} />

      <RecentTransactions metrics={metrics} formatCurrency={formatCurrency} />
    </div>
  );
};
