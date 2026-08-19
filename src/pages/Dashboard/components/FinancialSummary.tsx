import React from 'react';
import type { CommandCenterMetrics } from '../useDashboardMetrics';

interface FinancialSummaryProps {
  metrics: CommandCenterMetrics;
  formatCurrency: (val: number) => string;
}

export const FinancialSummary: React.FC<FinancialSummaryProps> = ({ metrics, formatCurrency }) => {
  const cards = [
    { label: 'Total value', value: formatCurrency(metrics.totalValue) },
    { label: 'Bank cash', value: formatCurrency(metrics.bankCash) },
    { label: 'Ipo blocked', value: formatCurrency(metrics.ipoBlocked) },
    { label: 'Available', value: formatCurrency(metrics.available) },
    { label: 'Invested (cost basis)', value: formatCurrency(metrics.invested) },
    { 
      label: 'Realized p&l', 
      value: metrics.realizedPnL === 0 ? "No realized sales yet" : formatCurrency(metrics.realizedPnL),
      isText: metrics.realizedPnL === 0,
      color: metrics.realizedPnL > 0 ? 'text-accent-green' : metrics.realizedPnL < 0 ? 'text-accent-red' : ''
    },
    { 
      label: 'Unrealized p&l', 
      value: metrics.unrealizedPnL === 0 ? "No active holdings" : formatCurrency(metrics.unrealizedPnL),
      isText: metrics.unrealizedPnL === 0,
      color: metrics.unrealizedPnL > 0 ? 'text-accent-green' : metrics.unrealizedPnL < 0 ? 'text-accent-red' : ''
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
      {cards.map((card, idx) => (
        <div 
          key={idx} 
          className="bento-card p-5 flex flex-col justify-center group overflow-hidden" 
        >
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          <p className="text-[11px] text-text-secondary/80 mb-2 font-bold tracking-widest uppercase relative z-10">{card.label}</p>
          <div className={`font-extrabold tracking-tight relative z-10 ${card.isText ? 'text-sm text-text-secondary font-medium' : 'text-2xl text-slate-800'} ${card.color || ''}`}>
            {card.value}
          </div>
        </div>
      ))}
    </div>
  );
};
