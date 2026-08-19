import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import type { DashboardFilters } from './useDashboardMetrics';
import { useDashboardMetrics } from './useDashboardMetrics';
import { mapIpo } from '../../lib/mappers';

import { DashboardHeader } from './components/DashboardHeader';
import { ActionRequired } from './components/ActionRequired';
import { FinancialSummary } from './components/FinancialSummary';
import { MoneyFlow } from './components/MoneyFlow';
import { Distribution } from './components/Distribution';
import { SmartInsights } from './components/SmartInsights';
import { ApplicationsByIPO } from './components/ApplicationsByIPO';
import { BankAccountsOverview } from './components/BankAccountsOverview';
import { PeopleSettlements } from './components/PeopleSettlements';
import { HoldingsOverview } from './components/HoldingsOverview';
import { RecentTransactions } from './components/RecentTransactions';

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

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } }
  };

  return (
    <div className="min-h-screen premium-gradient-bg -mx-4 -mt-4 px-4 pt-4 sm:-mx-6 sm:-mt-6 sm:px-6 sm:pt-6">
      <motion.div 
        className="space-y-6 pb-20 max-w-7xl mx-auto mt-4"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
      <motion.div variants={itemVariants}>
        <DashboardHeader 
          filters={filters} 
          setFilters={setFilters} 
          allIpos={allIpos || []} 
          onRefresh={() => refetch()} 
        />
      </motion.div>

      <motion.div variants={itemVariants}>
        <ActionRequired actions={metrics.actionsRequired} />
      </motion.div>

      <motion.div variants={itemVariants}>
        <FinancialSummary metrics={metrics} formatCurrency={formatCurrency} />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <MoneyFlow data={metrics.moneyFlowChart} formatCurrency={formatCurrency} />
        </motion.div>
        <div className="lg:col-span-1 space-y-6">
          <motion.div variants={itemVariants}>
            <Distribution data={metrics.assetDistribution} formatCurrency={formatCurrency} />
          </motion.div>
          <motion.div variants={itemVariants}>
            <SmartInsights insights={metrics.smartInsights} />
          </motion.div>
        </div>
      </div>

      <motion.div variants={itemVariants}>
        <ApplicationsByIPO data={metrics.applicationsByIPO} formatCurrency={formatCurrency} />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div variants={itemVariants}>
          <BankAccountsOverview data={metrics.bankAccounts} formatCurrency={formatCurrency} />
        </motion.div>
        <motion.div variants={itemVariants}>
          <PeopleSettlements data={metrics.peopleSettlements} formatCurrency={formatCurrency} />
        </motion.div>
      </div>

      {metrics.holdingsTable.length > 0 && (
        <motion.div variants={itemVariants}>
          <HoldingsOverview data={metrics.holdingsTable} formatCurrency={formatCurrency} />
        </motion.div>
      )}

      <motion.div variants={itemVariants}>
        <RecentTransactions data={metrics.recentActivity} formatCurrency={formatCurrency} />
      </motion.div>
      </motion.div>
    </div>
  );
};
