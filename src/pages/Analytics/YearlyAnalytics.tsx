import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/schema';
import { Card } from '../../components/ui/Card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Calendar, TrendingUp } from 'lucide-react';

export const YearlyAnalytics: React.FC = () => {
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const txs = useLiveQuery(() => db.transactions.toArray(), []) || [];
  const apps = useLiveQuery(() => db.applications.toArray(), []) || [];

  const formatCurrency = (val: number = 0) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  const stats = useMemo(() => {
    let moneySent = 0, moneyReceived = 0, selfTransfers = 0, ipoRefunds = 0, ipoSales = 0;
    
    const yearlyTxs = txs.filter(t => new Date(t.date).getFullYear() === selectedYear);

    yearlyTxs.forEach(t => {
      if (t.transactionType === 'MONEY_SENT') moneySent += t.amount;
      if (t.transactionType === 'MONEY_RECEIVED') moneyReceived += t.amount;
      if (t.transactionType === 'SELF_TRANSFER') selfTransfers += t.amount;
      if (t.transactionType === 'IPO_REFUND') ipoRefunds += t.amount;
      if (t.transactionType === 'IPO_SELL') ipoSales += t.amount;
    });

    const yearlyApps = apps.filter(a => new Date(a.createdAt).getFullYear() === selectedYear);

    const totalApplied = yearlyApps.length;
    const allotted = yearlyApps.filter(a => a.allotmentStatus === 'FULL' || a.allotmentStatus === 'PARTIAL').length;
    const notAllotted = totalApplied - allotted;
    const allotmentRate = totalApplied > 0 ? ((allotted / totalApplied) * 100).toFixed(2) : '0.00';

    const ipoCapitalApplied = yearlyApps.reduce((sum, a) => sum + a.blockedAmount, 0);
    const ipoCapitalInvested = yearlyApps.reduce((sum, a) => sum + a.investmentAmount, 0);
    const ipoCapitalReleased = yearlyApps.reduce((sum, a) => sum + a.refundAmount, 0);

    return { 
      moneySent, moneyReceived, selfTransfers, ipoRefunds, ipoSales, 
      totalApplied, allotted, notAllotted, allotmentRate,
      ipoCapitalApplied, ipoCapitalInvested, ipoCapitalReleased
    };
  }, [txs, apps, selectedYear]);

  // Generate chart data (by month)
  const chartData = useMemo(() => {
    const data = [];
    for (let i = 1; i <= 12; i++) {
      let sent = 0, received = 0;
      txs.forEach(t => {
        const d = new Date(t.date);
        if (d.getFullYear() === selectedYear && (d.getMonth() + 1) === i) {
          if (t.transactionType === 'MONEY_SENT') sent += t.amount;
          if (t.transactionType === 'MONEY_RECEIVED' || t.transactionType === 'IPO_REFUND') received += t.amount;
        }
      });
      data.push({ month: new Date(2000, i - 1, 1).toLocaleString('default', { month: 'short' }), sent, received });
    }
    return data;
  }, [txs, selectedYear]);

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary flex items-center gap-2">
            <Calendar size={24} className="text-accent-blue" /> Yearly Analytics
          </h1>
          <p className="mt-1 text-text-secondary">Year-over-year performance and totals.</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedYear}
            onChange={e => setSelectedYear(Number(e.target.value))}
            className="px-3 py-2 rounded-xl bg-white border border-black/10 text-sm font-medium focus:ring-2 focus:ring-accent-blue/30 outline-none"
          >
            {[2024, 2025, 2026, 2027].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <h3 className="font-semibold text-text-primary mb-4 border-b border-black/5 pb-2">Money Movement</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-text-secondary">Total Money Sent</span>
              <span className="font-bold text-accent-red">{formatCurrency(stats.moneySent)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Total Money Received</span>
              <span className="font-bold text-accent-green">{formatCurrency(stats.moneyReceived + stats.ipoRefunds)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Self Transfers</span>
              <span className="font-bold text-accent-blue">{formatCurrency(stats.selfTransfers)}</span>
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold text-text-primary mb-4 border-b border-black/5 pb-2">IPO Capital</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-text-secondary">Capital Applied</span>
              <span className="font-bold text-text-primary">{formatCurrency(stats.ipoCapitalApplied)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Capital Invested</span>
              <span className="font-bold text-accent-green">{formatCurrency(stats.ipoCapitalInvested)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Capital Released</span>
              <span className="font-bold text-accent-orange">{formatCurrency(stats.ipoCapitalReleased)}</span>
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold text-text-primary mb-4 border-b border-black/5 pb-2">Application Success</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-text-secondary">Applications</span>
              <span className="font-bold text-text-primary">{stats.totalApplied}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Allotted</span>
              <span className="font-bold text-accent-green">{stats.allotted}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Not Allotted</span>
              <span className="font-bold text-accent-red">{stats.notAllotted}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-black/5">
              <span className="text-text-secondary">Allotment Rate</span>
              <span className="font-bold text-accent-blue">{stats.allotmentRate}%</span>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <h3 className="font-semibold text-text-primary mb-6 flex items-center gap-2">
          <TrendingUp size={18} className="text-accent-purple" /> Monthly Transaction Volume ({selectedYear})
        </h3>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#00000010" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#666' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#666' }} tickFormatter={v => '₹' + (v/1000) + 'k'} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} cursor={{ fill: '#00000005' }} />
              <Legend />
              <Bar dataKey="sent" name="Money Sent" fill="#ef4444" radius={[4, 4, 0, 0]} />
              <Bar dataKey="received" name="Money Received" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
};
