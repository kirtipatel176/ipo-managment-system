import React from 'react';
import type { CommandCenterMetrics } from '../useDashboardMetrics';

interface HoldingsOverviewProps {
  data: CommandCenterMetrics['holdingsTable'];
  formatCurrency: (val: number) => string;
}

export const HoldingsOverview: React.FC<HoldingsOverviewProps> = ({ data, formatCurrency }) => {
  return (
    <div className="bento-card overflow-hidden">
      <div className="p-6 border-b border-black/5 bg-white/40 backdrop-blur-md">
        <h2 className="text-lg font-bold text-text-primary tracking-tight">Current Holdings</h2>
        <p className="text-[11px] text-text-secondary mt-0.5 font-medium uppercase tracking-widest">Unrealized performance of active holdings</p>
      </div>
      <div className="overflow-x-auto bg-white/40 backdrop-blur-md">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50/50 text-text-secondary uppercase text-[10px] tracking-widest font-bold border-b border-black/5">
            <tr>
              <th className="px-6 py-4 font-semibold">IPO Name</th>
              <th className="px-6 py-4 font-semibold">Holder</th>
              <th className="px-6 py-4 font-semibold text-right">Shares</th>
              <th className="px-6 py-4 font-semibold text-right">Avg Cost</th>
              <th className="px-6 py-4 font-semibold text-right">LTP</th>
              <th className="px-6 py-4 font-semibold text-right">Current Value</th>
              <th className="px-6 py-4 font-semibold text-right">Unrealized P&L</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {data.map((row) => (
              <tr key={row.id} className="table-row-hover group">
                <td className="px-6 py-4 font-semibold text-text-primary group-hover:text-accent-blue transition-colors duration-300">{row.ipoName}</td>
                <td className="px-6 py-4 text-text-secondary">{row.holderName}</td>
                <td className="px-6 py-4 text-right tabular-nums text-text-secondary">{row.qty}</td>
                <td className="px-6 py-4 text-right tabular-nums text-text-secondary">{formatCurrency(row.avgPrice)}</td>
                <td className="px-6 py-4 text-right tabular-nums text-text-secondary">{formatCurrency(row.ltp)}</td>
                <td className="px-6 py-4 text-right tabular-nums font-semibold text-text-primary">{formatCurrency(row.current)}</td>
                <td className="px-6 py-4 text-right tabular-nums">
                  <div className={`flex flex-col items-end ${row.pnl > 0 ? 'text-accent-green' : row.pnl < 0 ? 'text-accent-red' : 'text-text-secondary'}`}>
                    <span className="font-semibold text-[15px]">
                      {row.pnl > 0 ? '+' : ''}{formatCurrency(row.pnl)}
                    </span>
                    <span className="text-xs font-medium opacity-80">
                      {row.pnlPercent > 0 ? '+' : ''}{row.pnlPercent.toFixed(2)}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
