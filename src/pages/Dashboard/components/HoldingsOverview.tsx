import React from 'react';
import { Card } from '../../../components/ui/Card';
import type { DashboardMetrics } from '../useDashboardMetrics';
import { Briefcase } from 'lucide-react';

interface Props {
  metrics: DashboardMetrics;
  formatCurrency: (v: number) => string;
}

export const HoldingsOverview: React.FC<Props> = ({ metrics, formatCurrency }) => {
  return (
    <Card noPadding className="overflow-hidden flex flex-col h-full">
      <div className="flex items-center justify-between border-b border-black/5 px-6 py-4 bg-bg-secondary/30">
        <h3 className="font-semibold text-text-primary text-sm flex items-center gap-2">
          <Briefcase size={16} className="text-accent-blue" />
          Current Holdings ({metrics.holdingsTable.length})
        </h3>
        <div className="text-xs text-text-tertiary">
          Total: {formatCurrency(metrics.currentValue)}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/5 text-xs text-text-tertiary bg-white">
              <th className="px-6 py-3 text-left font-medium">IPO</th>
              <th className="px-6 py-3 text-left font-medium">Holder</th>
              <th className="px-6 py-3 text-right font-medium">Qty</th>
              <th className="px-6 py-3 text-right font-medium">Avg. Cost</th>
              <th className="px-6 py-3 text-right font-medium">LTP</th>
              <th className="px-6 py-3 text-right font-medium">Invested</th>
              <th className="px-6 py-3 text-right font-medium">Current</th>
              <th className="px-6 py-3 text-right font-medium">P&L</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {metrics.holdingsTable.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-text-tertiary text-sm">
                  No active holdings.
                </td>
              </tr>
            ) : (
              metrics.holdingsTable.map(row => (
                <tr key={row.id} className="hover:bg-bg-secondary/40 transition-colors">
                  <td className="px-6 py-3 font-medium text-text-primary">{row.ipoName}</td>
                  <td className="px-6 py-3 text-text-secondary text-xs">{row.holderName}</td>
                  <td className="px-6 py-3 text-right text-text-secondary">{row.qty}</td>
                  <td className="px-6 py-3 text-right text-text-secondary">₹{row.avgPrice.toLocaleString('en-IN')}</td>
                  <td className="px-6 py-3 text-right text-text-secondary">₹{row.ltp.toLocaleString('en-IN')}</td>
                  <td className="px-6 py-3 text-right font-medium">{formatCurrency(row.invested)}</td>
                  <td className="px-6 py-3 text-right font-medium">{formatCurrency(row.current)}</td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex flex-col items-end">
                      <span className={`font-semibold ${row.pnl >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                        {row.pnl >= 0 ? '+' : ''}{formatCurrency(row.pnl)}
                      </span>
                      {row.pnlPercent !== 0 && (
                        <span className={`text-[10px] font-bold ${row.pnl >= 0 ? 'text-accent-green/80' : 'text-accent-red/80'}`}>
                          {row.pnl >= 0 ? '+' : ''}{row.pnlPercent.toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
};
