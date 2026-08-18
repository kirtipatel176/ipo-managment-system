import React from 'react';
import { Card } from '../../../components/ui/Card';
import { motion } from 'framer-motion';
import { Wallet, Briefcase, TrendingUp, ShieldAlert, CreditCard } from 'lucide-react';
import type { DashboardMetrics } from '../useDashboardMetrics';

interface Props {
  metrics: DashboardMetrics;
  formatCurrency: (v: number) => string;
}

export const FinancialSummary: React.FC<Props> = ({ metrics, formatCurrency }) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.0 }}>
        <Card className="flex flex-col justify-center relative overflow-hidden bg-white border-black/5 py-4">
          <div className="absolute -right-3 -top-3 opacity-5 pointer-events-none">
            <Wallet size={80} />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary mb-1">Total Value</p>
          <div className="text-xl font-bold text-text-primary">{formatCurrency(metrics.currentValue + metrics.availableUncommitted + metrics.blockedAmount)}</div>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="flex flex-col justify-center relative overflow-hidden bg-white border-black/5 py-4">
          <div className="absolute -right-3 -top-3 opacity-5 pointer-events-none">
            <Briefcase size={80} />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary mb-1">Invested</p>
          <div className="text-xl font-bold text-accent-blue">{formatCurrency(metrics.totalInvested)}</div>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card className="flex flex-col justify-center relative overflow-hidden bg-white border-black/5 py-4">
          <div className="absolute -right-3 -top-3 opacity-5 pointer-events-none">
            <TrendingUp size={80} />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary mb-1">Total P&L</p>
          <div className={`text-xl font-bold flex items-center gap-1 ${metrics.totalPnL >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
            {metrics.totalPnL >= 0 ? '+' : ''}{formatCurrency(metrics.totalPnL)}
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-black/5 ml-1">
              {metrics.totalPnL >= 0 ? '+' : ''}{metrics.totalPnLPercentage.toFixed(1)}%
            </span>
          </div>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card className="flex flex-col justify-center relative overflow-hidden bg-white border-black/5 py-4">
          <div className="absolute -right-3 -top-3 opacity-5 pointer-events-none">
            <ShieldAlert size={80} />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary mb-1">IPO Blocked</p>
          <div className="text-xl font-bold text-accent-orange">{formatCurrency(metrics.blockedAmount)}</div>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <Card className="flex flex-col justify-center relative overflow-hidden bg-white border-black/5 py-4">
          <div className="absolute -right-3 -top-3 opacity-5 pointer-events-none">
            <CreditCard size={80} />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary mb-1">Available</p>
          <div className="text-xl font-bold text-text-primary">{formatCurrency(metrics.availableUncommitted)}</div>
        </Card>
      </motion.div>
    </div>
  );
};
