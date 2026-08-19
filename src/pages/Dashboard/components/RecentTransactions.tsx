import React from 'react';
import { FileText, ArrowLeftRight, ArrowDownLeft, ArrowUpRight, CornerUpLeft, Banknote, History } from 'lucide-react';
import type { CommandCenterMetrics } from '../useDashboardMetrics';

interface RecentTransactionsProps {
  data: CommandCenterMetrics['recentActivity'];
  formatCurrency: (val: number) => string;
}

export const RecentTransactions: React.FC<RecentTransactionsProps> = ({ data, formatCurrency }) => {
  return (
    <div className="bento-card p-6 group">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-8 h-8 rounded-full bg-bg-tertiary flex items-center justify-center text-text-secondary">
          <History size={16} />
        </div>
        <h2 className="text-lg font-bold text-text-primary tracking-tight">Recent activity</h2>
      </div>

      {data.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[150px] text-center border border-dashed border-border-color rounded-xl bg-bg-secondary/50">
          <p className="text-text-secondary mb-2 font-medium">No recent activity</p>
        </div>
      ) : (
        <div className="space-y-4">
          {data.map((tx) => {
            let Icon = FileText;
            let iconColor = 'text-text-secondary';
            let iconBg = 'bg-bg-tertiary';
            let amountColor = 'text-text-primary';
            let sign = '';

            // Map type-to-visuals per §4
            switch (tx.type) {
              case 'IPO_FUNDING':
                Icon = FileText;
                iconColor = 'text-accent-red';
                iconBg = 'bg-accent-red/10';
                amountColor = 'text-accent-red';
                sign = '-';
                break;
              case 'OWN_ACCOUNT_TRANSFER':
                Icon = ArrowLeftRight;
                iconColor = 'text-text-secondary';
                iconBg = 'bg-bg-tertiary';
                amountColor = 'text-text-secondary';
                sign = '';
                break;
              case 'FRIEND_FUNDING_RECEIVED':
              case 'EXTERNAL_DEPOSIT':
                Icon = ArrowDownLeft;
                iconColor = 'text-accent-green';
                iconBg = 'bg-accent-green/10';
                amountColor = 'text-accent-green';
                sign = '+';
                break;
              case 'FRIEND_SETTLEMENT':
              case 'EXTERNAL_PAYMENT':
                Icon = ArrowUpRight;
                iconColor = 'text-accent-red';
                iconBg = 'bg-accent-red/10';
                amountColor = 'text-accent-red';
                sign = '-';
                break;
              case 'IPO_REFUND':
                Icon = CornerUpLeft;
                iconColor = 'text-accent-green';
                iconBg = 'bg-accent-green/10';
                amountColor = 'text-accent-green';
                sign = '+';
                break;
              case 'IPO_SALE_PROCEEDS':
                Icon = Banknote;
                iconColor = 'text-accent-green';
                iconBg = 'bg-accent-green/10';
                amountColor = 'text-accent-green';
                sign = '+';
                break;
              default:
                break;
            }

            return (
              <div 
                key={tx.id} 
                className="flex items-center justify-between p-3 rounded-xl border border-transparent table-row-hover group"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-300 ${iconBg} ${iconColor}`}>
                    <Icon size={18} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-text-primary group-hover:text-accent-blue transition-colors duration-300">{tx.title}</h3>
                    <p className="text-xs text-text-secondary mt-0.5">{tx.subtitle} • {tx.date}</p>
                  </div>
                </div>
                <div className={`font-semibold tabular-nums text-[15px] ${amountColor}`}>
                  {sign}{formatCurrency(tx.amount)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
