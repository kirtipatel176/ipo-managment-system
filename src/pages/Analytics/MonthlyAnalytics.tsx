import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/schema';
import { Card } from '../../components/ui/Card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Calendar, TrendingUp, ArrowUpRight, ArrowDownLeft, RefreshCcw } from 'lucide-react';

export const MonthlyAnalytics: React.FC = () => {
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);

  const txs = useLiveQuery(() => db.transactions.toArray(), []) || [];
  const apps = useLiveQuery(() => db.applications.toArray(), []) || [];

  const formatCurrency = (val: number = 0) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  const stats = useMemo(() => {
    let moneySent = 0, moneyReceived = 0, selfTransfers = 0, ipoRefunds = 0, ipoSales = 0;
    
    // Filter transactions by month/year
    const monthlyTxs = txs.filter(t => {
      const d = new Date(t.date);
      return d.getFullYear() === selectedYear && (d.getMonth() + 1) === selectedMonth;
    });

    monthlyTxs.forEach(t => {
      if (t.transactionType === 'MONEY_SENT') moneySent += t.amount;
      if (t.transactionType === 'MONEY_RECEIVED') moneyReceived += t.amount;
      if (t.transactionType === 'SELF_TRANSFER') selfTransfers += t.amount;
      if (t.transactionType === 'IPO_REFUND') ipoRefunds += t.amount;
      if (t.transactionType === 'IPO_SELL') ipoSales += t.amount;
    });

    const monthlyApps = apps.filter(a => {
      const d = new Date(a.createdAt);
      return d.getFullYear() === selectedYear && (d.getMonth() + 1) === selectedMonth;
    });

    const totalApplied = monthlyApps.length;
    const lotsApplied = monthlyApps.reduce((sum, a) => sum + a.appliedLots, 0);
    const lotsAllotted = monthlyApps.reduce((sum, a) => sum + a.allottedLots, 0);

    return { moneySent, moneyReceived, selfTransfers, ipoRefunds, ipoSales, totalApplied, lotsApplied, lotsAllotted };
  }, [txs, apps, selectedYear, selectedMonth]);

  // Generate chart data (by day)
  const chartData = useMemo(() => {
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const data = [];
    for (let i = 1; i <= daysInMonth; i++) {
      let sent = 0, received = 0;
      txs.forEach(t => {
        const d = new Date(t.date);
        if (d.getFullYear() === selectedYear && (d.getMonth() + 1) === selectedMonth && d.getDate() === i) {
          if (t.transactionType === 'MONEY_SENT') sent += t.amount;
          if (t.transactionType === 'MONEY_RECEIVED' || t.transactionType === 'IPO_REFUND') received += t.amount;
        }
      });
      data.push({ day: i.toString(), sent, received });
    }
    return data;
  }, [txs, selectedYear, selectedMonth]);

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary flex items-center gap-2">
            <Calendar size={24} className="text-accent-blue" /> Monthly Analytics
          </h1>
          <p className="mt-1 text-text-secondary">Analyze your money flow and IPO performance by month.</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(Number(e.target.value))}
            className="px-3 py-2 rounded-xl bg-white border border-black/10 text-sm font-medium focus:ring-2 focus:ring-accent-blue/30 outline-none"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>{new Date(2000, i, 1).toLocaleString('default', { month: 'long' })}</option>
            ))}
          </select>
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="flex flex-col gap-2">
          <p className="text-xs font-medium uppercase text-text-tertiary">Money Sent</p>
          <p className="text-2xl font-bold text-accent-red">{formatCurrency(stats.moneySent)}</p>
        </Card>
        <Card className="flex flex-col gap-2">
          <p className="text-xs font-medium uppercase text-text-tertiary">Money Received</p>
          <p className="text-2xl font-bold text-accent-green">{formatCurrency(stats.moneyReceived + stats.ipoRefunds)}</p>
        </Card>
        <Card className="flex flex-col gap-2">
          <p className="text-xs font-medium uppercase text-text-tertiary">Self Transfers</p>
          <p className="text-2xl font-bold text-accent-blue">{formatCurrency(stats.selfTransfers)}</p>
        </Card>
        <Card className="flex flex-col gap-2">
          <p className="text-xs font-medium uppercase text-text-tertiary">Applications</p>
          <p className="text-2xl font-bold text-text-primary">{stats.totalApplied} <span className="text-sm font-normal text-text-secondary">({stats.lotsAllotted}/{stats.lotsApplied} lots)</span></p>
        </Card>
      </div>

      <Card>
        <h3 className="font-semibold text-text-primary mb-6 flex items-center gap-2">
          <TrendingUp size={18} className="text-accent-purple" /> Monthly Money Flow (Sent vs Received)
        </h3>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#00000010" />
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#666' }} />
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
