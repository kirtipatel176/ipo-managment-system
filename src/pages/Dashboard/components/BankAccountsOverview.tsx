import React from 'react';
import { Building2, CheckCircle2, AlertCircle } from 'lucide-react';
import type { CommandCenterMetrics } from '../useDashboardMetrics';

interface BankAccountsOverviewProps {
  data: CommandCenterMetrics['bankAccounts'];
  formatCurrency: (val: number) => string;
}

export const BankAccountsOverview: React.FC<BankAccountsOverviewProps> = ({ data, formatCurrency }) => {
  return (
    <div className="bento-card p-6 h-full flex flex-col group">
      <div className="flex items-center gap-2 mb-6">
        <Building2 size={20} className="text-text-secondary" />
        <h2 className="text-lg font-semibold text-text-primary">Bank accounts</h2>
      </div>

      <div className="space-y-4 flex-1">
        {data.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center border border-dashed border-border-color rounded-xl p-4 bg-bg-secondary/50">
          <p className="text-text-secondary font-medium">No bank accounts linked</p>
        </div>
        ) : (
          data.map(account => (
            <div 
              key={account.id} 
              className="p-4 rounded-xl border border-white/40 bg-white/40 backdrop-blur-md hover:bg-white/80 hover:shadow-premium transition-all duration-300 flex flex-col gap-3 group"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-text-primary tracking-tight group-hover:text-accent-blue transition-colors">{account.name}</h3>
                  <p className="text-[11px] font-medium text-text-secondary mt-0.5">{account.bankName}</p>
                </div>
                <div title={account.reconciled ? "Reconciled" : "Reconciliation needed"}>
                  {account.reconciled ? (
                    <CheckCircle2 size={16} className="text-accent-green opacity-70" />
                  ) : (
                    <AlertCircle size={16} className="text-amber-500" />
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-black/5">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-text-secondary/70">Cash</p>
                  <p className="text-sm font-semibold tabular-nums">{formatCurrency(account.cash)}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-text-secondary/70">Blocked</p>
                  <p className="text-sm font-semibold tabular-nums text-amber-600">
                    {account.blocked > 0 ? formatCurrency(account.blocked) : '₹0'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-text-secondary/70">Available</p>
                  <p className="text-sm font-semibold tabular-nums text-accent-green">
                    {formatCurrency(account.available)}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
