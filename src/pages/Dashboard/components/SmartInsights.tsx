import React from 'react';
import { Card } from '../../../components/ui/Card';
import type { DashboardMetrics } from '../useDashboardMetrics';
import { PieChart as PieIcon, TrendingUp } from 'lucide-react';

interface Props {
  metrics: DashboardMetrics;
  formatCurrency: (v: number) => string;
}

export const SmartInsights: React.FC<Props> = ({ metrics, formatCurrency }) => {
  return (
    <Card className="bg-gradient-to-br from-bg-primary to-bg-secondary relative overflow-hidden h-full">
      <div className="absolute right-0 top-0 w-64 h-64 bg-accent-blue/5 rounded-full blur-3xl pointer-events-none" />
      <div className="relative z-10 flex flex-col h-full">
        <h3 className="font-semibold text-text-primary mb-6 flex items-center gap-2">
          <PieIcon size={18} className="text-accent-blue" />
          Smart Insights
        </h3>
        <div className="space-y-4 flex-1">
          <div className="p-4 rounded-xl bg-white/60 border border-black/5 backdrop-blur-md shadow-sm">
            <p className="text-sm text-text-primary font-medium leading-relaxed">
              Your overall allotment rate of <span className="font-bold text-accent-blue">{metrics.successRate.toFixed(1)}%</span> is {metrics.successRate > 10 ? 'above' : 'below'} the retail average.
            </p>
          </div>
          {metrics.blockedAmount > 0 && (
            <div className="p-4 rounded-xl bg-white/60 border border-black/5 backdrop-blur-md shadow-sm">
              <p className="text-sm text-text-primary font-medium leading-relaxed">
                You have <span className="font-bold text-accent-orange">{formatCurrency(metrics.blockedAmount)}</span> currently blocked. Expect unblocking or allotment soon.
              </p>
            </div>
          )}
          {metrics.bestPerformingIpo && (
            <div className="p-4 rounded-xl bg-accent-green/10 border border-accent-green/20 backdrop-blur-md shadow-sm flex gap-3 items-start">
              <TrendingUp size={20} className="text-accent-green shrink-0 mt-0.5" />
              <p className="text-sm text-accent-green font-semibold leading-relaxed">
                Your best performing IPO is {metrics.bestPerformingIpo.name} at {metrics.bestPerformingIpo.pnlPercent.toFixed(1)}% ROI.
              </p>
            </div>
          )}
          {!metrics.bestPerformingIpo && metrics.availableUncommitted > 0 && (
            <div className="p-4 rounded-xl bg-white/60 border border-black/5 backdrop-blur-md shadow-sm">
              <p className="text-sm text-text-primary font-medium leading-relaxed">
                You have {formatCurrency(metrics.availableUncommitted)} available to invest in upcoming IPOs.
              </p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
