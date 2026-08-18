import React from 'react';
import { Card } from '../../../components/ui/Card';
import type { DashboardMetrics } from '../useDashboardMetrics';
import { ArrowDownLeft, ArrowUpRight, Activity } from 'lucide-react';

interface Props {
  metrics: DashboardMetrics;
  formatCurrency: (v: number) => string;
}

export const RecentTransactions: React.FC<Props> = ({ metrics, formatCurrency }) => {
  return (
    <Card noPadding className="flex flex-col">
      <div className="flex items-center justify-between border-b border-black/5 px-6 py-4 bg-bg-secondary/30">
        <h3 className="font-semibold text-text-primary text-sm flex items-center gap-2">
          <Activity size={16} className="text-accent-blue" />
          Recent Activity
        </h3>
        <span className="text-xs text-text-tertiary">{metrics.recentTransactions.length} items</span>
      </div>
      <div className="divide-y divide-black/5">
        {metrics.recentTransactions.length === 0 ? (
          <p className="text-sm text-text-tertiary text-center py-8">No recent activity found.</p>
        ) : (
          metrics.recentTransactions.map(tx => (
            <div key={tx.id} className="flex items-center justify-between px-6 py-3 hover:bg-bg-secondary/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${tx.isPositive ? 'bg-accent-green/10 text-accent-green' : 'bg-accent-red/10 text-accent-red'}`}>
                  {tx.isPositive ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary">{tx.title}</p>
                  <p className="text-[11px] text-text-secondary">{tx.subtitle} • {tx.date}</p>
                </div>
              </div>
              <span className={`text-sm font-semibold ${tx.isPositive ? 'text-accent-green' : 'text-text-primary'}`}>
                {tx.isPositive ? '+' : '-'}{formatCurrency(Math.abs(tx.amount))}
              </span>
            </div>
          ))
        )}
      </div>
    </Card>
  );
};
