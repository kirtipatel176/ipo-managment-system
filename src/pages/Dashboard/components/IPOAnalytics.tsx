import React from 'react';
import { Card } from '../../../components/ui/Card';
import type { DashboardMetrics } from '../useDashboardMetrics';
import { Target, Users, CheckCircle2, AlertCircle } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';

interface Props {
  metrics: DashboardMetrics;
  formatCurrency: (v: number) => string;
}

export const IPOAnalytics: React.FC<Props> = ({ metrics, formatCurrency }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
      {/* Hit Rate / Success Card */}
      <Card className="flex flex-col justify-center bg-gradient-to-br from-white to-blue-50 border-blue-100 shadow-sm relative overflow-hidden group">
        <div className="absolute -right-4 -top-4 opacity-10 pointer-events-none">
          <Target size={120} />
        </div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-accent-blue/70 mb-1 z-10">Hit Rate</p>
        <div className="flex items-baseline gap-2 z-10">
          <span className="text-4xl font-bold text-accent-blue">{metrics.successRate.toFixed(1)}%</span>
        </div>
        <p className="text-[11px] text-text-tertiary z-10 mt-2 font-medium">
          {metrics.allottedApps + metrics.partialApps} Allotted out of {metrics.totalApps - metrics.pendingApps} resolved
        </p>
      </Card>

      {/* Application Stats */}
      <Card className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4 py-6">
        <div className="flex flex-col justify-center items-center text-center">
          <div className="p-2.5 rounded-full bg-accent-blue/10 text-accent-blue mb-3">
            <Users size={18} strokeWidth={2.5} />
          </div>
          <div className="text-2xl font-bold text-text-primary">{metrics.totalApps}</div>
          <div className="text-[10px] text-text-secondary mt-1 uppercase tracking-wider font-bold">Total Apps</div>
        </div>
        <div className="flex flex-col justify-center items-center text-center">
          <div className="p-2.5 rounded-full bg-accent-green/10 text-accent-green mb-3">
            <CheckCircle2 size={18} strokeWidth={2.5} />
          </div>
          <div className="text-2xl font-bold text-text-primary">{metrics.allottedApps}</div>
          <div className="text-[10px] text-text-secondary mt-1 uppercase tracking-wider font-bold">Allotted</div>
        </div>
        <div className="flex flex-col justify-center items-center text-center">
          <div className="p-2.5 rounded-full bg-accent-orange/10 text-accent-orange mb-3">
            <AlertCircle size={18} strokeWidth={2.5} />
          </div>
          <div className="text-2xl font-bold text-text-primary">{metrics.notAllottedApps}</div>
          <div className="text-[10px] text-text-secondary mt-1 uppercase tracking-wider font-bold">Not Allotted</div>
        </div>
        <div className="flex flex-col justify-center items-center text-center">
          <div className="p-2.5 rounded-full bg-text-tertiary/10 text-text-tertiary mb-3">
            <Target size={18} strokeWidth={2.5} />
          </div>
          <div className="text-2xl font-bold text-text-primary">{metrics.pendingApps}</div>
          <div className="text-[10px] text-text-secondary mt-1 uppercase tracking-wider font-bold">Pending</div>
        </div>
      </Card>

      {/* Allotment Table */}
      <div className="lg:col-span-3">
        <Card noPadding className="overflow-hidden flex flex-col h-full">
          <div className="flex items-center justify-between border-b border-black/5 px-6 py-4 bg-bg-secondary/30">
            <h3 className="font-semibold text-text-primary text-sm">Recent Applications Overview</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/5 text-xs text-text-tertiary bg-white">
                  <th className="px-6 py-3 text-left font-medium">IPO</th>
                  <th className="px-6 py-3 text-right font-medium">Applied</th>
                  <th className="px-6 py-3 text-right font-medium">Allotted</th>
                  <th className="px-6 py-3 text-right font-medium">Invested</th>
                  <th className="px-6 py-3 text-center font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {metrics.allotmentTable.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-text-tertiary text-sm">
                      No applications found.
                    </td>
                  </tr>
                ) : (
                  metrics.allotmentTable.map(row => (
                    <tr key={row.id} className="hover:bg-bg-secondary/40 transition-colors">
                      <td className="px-6 py-3 font-medium text-text-primary">{row.ipoName}</td>
                      <td className="px-6 py-3 text-right text-text-secondary">{row.appliedLots} lot(s)</td>
                      <td className="px-6 py-3 text-right text-text-secondary">{row.allottedLots} lot(s)</td>
                      <td className="px-6 py-3 text-right font-medium">{formatCurrency(row.invested)}</td>
                      <td className="px-6 py-3 text-center">
                        <Badge 
                          variant={row.status === 'Allotted' ? 'success' : row.status === 'Partial' ? 'warning' : row.status === 'Pending' ? 'info' : 'danger'}
                        >
                          {row.status}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
};
