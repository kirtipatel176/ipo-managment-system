/**
 * Dashboard — IPO Management Overview
 *
 * Displays:
 *  - IPO filter dropdown (All / specific IPO)
 *  - 9 KPI stat cards matching the Excel header
 *  - Friends Money Pending table
 *  - IPO Status breakdown table
 *  - Money Received By Bank table
 *  - Bank Balance widget
 *  - Money With People widget
 */
import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useDashboardMetrics } from './useDashboardMetrics';
import { useIPOFilter } from '../../hooks/useIPOFilter';
import { db } from '../../db/schema';
import {
  TrendingUp, Users, Landmark, RefreshCcw, ChevronDown, Filter,
  ArrowUpRight, AlertCircle, CheckCircle2, Clock
} from 'lucide-react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { selectedIpoId, setSelectedIpoId } = useIPOFilter();
  const metrics = useDashboardMetrics(selectedIpoId);
  const allIpos = useLiveQuery(() => db.ipos.toArray(), []);

  const [showSeedConfirm, setShowSeedConfirm] = useState(false);

  const formatCurrency = (val: number = 0) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  const handleReseed = async () => {
    const { seedDatabase } = await import('../../db/seedData');
    await seedDatabase();
    setShowSeedConfirm(false);
  };

  if (!metrics) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent-blue/20 border-t-accent-blue" />
      </div>
    );
  }

  const selectedIpo = allIpos?.find(i => i.id === selectedIpoId);

  // ── Money Overview 4-way breakdown ────────────────────────────────
  const mo = metrics.moneyOverview;

  // ── KPI cards definition ─────────────────────────────────────────────
  const kpiCards = [
    {
      label: 'Total IPOs',
      value: metrics.totalIpos,
      type: 'number' as const,
      icon: <TrendingUp size={18} />,
      color: 'blue',
      sub: `${metrics.openIpos} open`,
    },
    {
      label: 'Upcoming IPOs',
      value: metrics.upcomingIpos,
      type: 'number' as const,
      icon: <Clock size={18} />,
      color: 'purple',
      sub: 'upcoming',
    },
    {
      label: 'Open IPOs',
      value: metrics.openIpos,
      type: 'number' as const,
      icon: <ArrowUpRight size={18} />,
      color: 'green',
      sub: 'currently open',
    },
    {
      label: 'Total Applications',
      value: metrics.totalApplications,
      type: 'number' as const,
      icon: <Users size={18} />,
      color: 'orange',
      sub: `${metrics.pendingApplications} pending allotment`,
    },
    {
      label: 'Total Lots Applied',
      value: metrics.totalLotsApplied,
      type: 'number' as const,
      icon: <CheckCircle2 size={18} />,
      color: 'blue',
      sub: `across all applications`,
    },
    {
      label: 'Allotted',
      value: metrics.allottedApplications,
      type: 'number' as const,
      icon: <CheckCircle2 size={18} />,
      color: 'green',
      sub: 'applications allotted',
    },
    {
      label: 'Not Allotted',
      value: metrics.notAllottedApplications,
      type: 'number' as const,
      icon: <AlertCircle size={18} />,
      color: metrics.notAllottedApplications > 0 ? 'red' : 'green',
      sub: 'applications nil',
    },
    {
      label: 'Unrealized P&L',
      value: metrics.unrealizedPnL,
      type: 'currency' as const,
      icon: <TrendingUp size={18} />,
      color: metrics.unrealizedPnL >= 0 ? 'green' : 'red',
      sub: 'on current holdings',
      highlight: metrics.unrealizedPnL !== 0,
    },
    {
      label: 'Total Pending',
      value: metrics.totalPending,
      type: 'currency' as const,
      icon: <AlertCircle size={18} />,
      color: metrics.totalPending > 0 ? 'red' : 'green',
      sub: 'to recover from friends',
      highlight: metrics.totalPending > 0,
    },
  ];

  const colorMap: Record<string, { bg: string; text: string; icon: string; border: string }> = {
    blue:   { bg: 'bg-accent-blue/8',   text: 'text-accent-blue',   icon: 'bg-accent-blue/15',   border: 'border-accent-blue/15' },
    green:  { bg: 'bg-accent-green/8',  text: 'text-accent-green',  icon: 'bg-accent-green/15',  border: 'border-accent-green/15' },
    orange: { bg: 'bg-accent-orange/8', text: 'text-accent-orange', icon: 'bg-accent-orange/15', border: 'border-accent-orange/15' },
    purple: { bg: 'bg-accent-purple/8', text: 'text-accent-purple', icon: 'bg-accent-purple/15', border: 'border-accent-purple/15' },
    red:    { bg: 'bg-accent-red/8',    text: 'text-accent-red',    icon: 'bg-accent-red/15',    border: 'border-accent-red/15' },
  };

  return (
    <div className="space-y-6 pb-20">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">IPO Management Dashboard</h1>
          <p className="mt-1 text-text-secondary">Track your IPO applications, money flow, and friend balances.</p>
        </div>
        <div className="flex items-center gap-3">
          {/* IPO Filter Dropdown */}
          <div className="relative">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-text-tertiary">
              <Filter size={14} />
            </div>
            <select
              value={selectedIpoId ?? ''}
              onChange={e => setSelectedIpoId(e.target.value === '' ? null : Number(e.target.value))}
              className="pl-9 pr-8 py-2 rounded-xl bg-white border border-black/10 text-sm font-medium text-text-primary shadow-sm hover:border-accent-blue/40 focus:outline-none focus:ring-2 focus:ring-accent-blue/30 transition-all appearance-none cursor-pointer"
            >
              <option value="">All IPOs</option>
              {allIpos?.map(ipo => (
                <option key={ipo.id} value={ipo.id}>{ipo.ipoName}</option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-2.5 flex items-center pointer-events-none text-text-tertiary">
              <ChevronDown size={14} />
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            icon={<RefreshCcw size={14} />}
            onClick={() => setShowSeedConfirm(true)}
          >
            Reset Data
          </Button>
        </div>
      </div>

      {/* Seed confirm banner */}
      {showSeedConfirm && (
        <div className="flex items-center gap-4 rounded-xl border border-accent-orange/30 bg-accent-orange/5 p-4">
          <AlertCircle size={18} className="text-accent-orange shrink-0" />
          <p className="flex-1 text-sm text-text-primary">
            This will <strong>wipe all data</strong> and reload the real seed data from the Excel sheet. Confirm?
          </p>
          <Button size="sm" variant="outline" onClick={handleReseed}>Yes, Reset</Button>
          <Button size="sm" variant="ghost" onClick={() => setShowSeedConfirm(false)}>Cancel</Button>
        </div>
      )}

      {/* Active IPO banner */}
      {selectedIpo && (
        <div className="flex items-center gap-3 rounded-xl border border-accent-blue/20 bg-accent-blue/5 px-4 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-blue/15">
            <Filter size={14} className="text-accent-blue" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-text-primary">Filtered: {selectedIpo.ipoName}</p>
            <p className="text-xs text-text-secondary">
              ₹{selectedIpo.pricePerShare}/share · {selectedIpo.lotSize} shares/lot · ₹{(selectedIpo.pricePerShare * selectedIpo.lotSize).toLocaleString('en-IN')}/lot
            </p>
          </div>
          <Badge variant="info">{selectedIpo.status.replace('_', ' ')}</Badge>
          <button onClick={() => setSelectedIpoId(null)} className="text-xs text-text-tertiary hover:text-text-primary transition-colors">
            Clear ×
          </button>
        </div>
      )}

      {/* ── Action Required ────────────────────────────────────────────── */}
      {metrics.actions && metrics.actions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col gap-3"
        >
          <div className="flex items-center gap-2 px-1">
            <AlertCircle size={16} className="text-accent-orange" />
            <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">Action Required</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {metrics.actions.map(action => {
               const borderColors = { WARNING: 'border-l-accent-orange', INFO: 'border-l-accent-blue', SUCCESS: 'border-l-accent-green' };
               return (
                 <Card key={action.id} className={`cursor-pointer hover:shadow-md transition-shadow border-l-4 ${borderColors[action.type]}`} onClick={() => action.link && navigate(action.link)}>
                   <p className="text-sm font-medium text-text-primary">{action.message}</p>
                 </Card>
               );
            })}
          </div>
        </motion.div>
      )}

      {/* ── Total Money Overview ────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="overflow-hidden border border-black/5" noPadding>
          <div className="px-5 py-4 border-b border-black/5 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-text-primary">Total Money Overview</h3>
              <p className="text-xs text-text-secondary mt-0.5">Real-time 4-way breakdown of all your money</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-text-tertiary uppercase tracking-wider">Total</p>
              <p className="text-2xl font-bold text-text-primary">{formatCurrency(mo.totalMoney)}</p>
              <div className="mt-1 flex items-center justify-end gap-1">
                <CheckCircle2 size={12} className="text-accent-green" />
                <span className="text-[10px] uppercase font-bold text-accent-green">Reconciled ✓</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 divide-x divide-y divide-black/5 md:grid-cols-4 md:divide-y-0">
            {[
              { label: 'Bank Cash', value: mo.bankCash, color: 'text-accent-blue', bg: 'bg-accent-blue/5', desc: 'Available in bank accounts' },
              { label: 'IPO Blocked', value: mo.ipoBlocked, color: 'text-accent-orange', bg: 'bg-accent-orange/5', desc: 'Blocked for applications' },
              { label: 'Friend Money', value: mo.friendMoney, color: 'text-accent-purple', bg: 'bg-accent-purple/5', desc: 'Held by friends (unallocated)' },
              { label: 'Invested', value: mo.invested, color: 'text-accent-green', bg: 'bg-accent-green/5', desc: 'In Demat as shares' },
            ].map(item => (
              <div key={item.label} className={`${item.bg} px-5 py-4`}>
                <p className="text-xs font-medium uppercase tracking-wider text-text-tertiary">{item.label}</p>
                <p className={`text-xl font-bold mt-1 ${item.color}`}>{formatCurrency(item.value)}</p>
                <p className="text-xs text-text-tertiary mt-0.5">{item.desc}</p>
              </div>
            ))}
          </div>
          {(mo.unrealizedPnL !== 0 || mo.realizedPnL !== 0) && (
            <div className="border-t border-black/5 px-5 py-3 flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-text-secondary">Unrealized P&L:</span>
                <span className={`font-semibold ${mo.unrealizedPnL >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                  {mo.unrealizedPnL >= 0 ? '+' : ''}{formatCurrency(mo.unrealizedPnL)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-text-secondary">Realized P&L:</span>
                <span className={`font-semibold ${mo.realizedPnL >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                  {mo.realizedPnL >= 0 ? '+' : ''}{formatCurrency(mo.realizedPnL)}
                </span>
              </div>
            </div>
          )}
        </Card>
      </motion.div>

      {/* ── Money Distribution & IPO Pipeline ───────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
          <Card>
            <h3 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
              <Landmark size={16} className="text-accent-blue" /> Money Distribution
            </h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Bank Cash', value: mo.bankCash, color: '#3b82f6' },
                      { name: 'IPO Blocked', value: mo.ipoBlocked, color: '#f97316' },
                      { name: 'Friend Money', value: mo.friendMoney, color: '#a855f7' },
                      { name: 'Invested', value: mo.invested, color: '#22c55e' }
                    ].filter(d => d.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {([
                      { name: 'Bank Cash', value: mo.bankCash, color: '#3b82f6' },
                      { name: 'IPO Blocked', value: mo.ipoBlocked, color: '#f97316' },
                      { name: 'Friend Money', value: mo.friendMoney, color: '#a855f7' },
                      { name: 'Invested', value: mo.invested, color: '#22c55e' }
                    ].filter(d => d.value > 0)).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.2 }}>
          <Card>
            <h3 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
              <TrendingUp size={16} className="text-accent-purple" /> IPO Pipeline
            </h3>
            <div className="flex flex-col justify-center h-64 px-4">
              <div className="flex items-center justify-between relative w-full">
                <div className="absolute top-1/2 left-4 right-4 h-[2px] bg-black/5 -translate-y-1/2 z-0"></div>
                {metrics.ipoStatusCounts.map((status, i) => (
                  <div key={status.status} className="flex flex-col items-center gap-3 z-10 bg-white px-2">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm shadow-sm border-2 ${status.count > 0 ? 'border-accent-blue text-accent-blue bg-accent-blue/5' : 'border-black/10 text-text-tertiary bg-white'}`}>
                      {status.count}
                    </div>
                    <span className={`text-xs font-medium ${status.count > 0 ? 'text-text-primary' : 'text-text-tertiary'}`}>
                      {status.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* ── 9 KPI Stat Cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {kpiCards.slice(0, 5).map((card, i) => {
          const c = colorMap[card.color];
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.04 }}
            >
              <Card className={`flex flex-col gap-2 border ${c.border} ${card.highlight ? c.bg : ''}`}>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wider text-text-tertiary">{card.label}</p>
                  <div className={`flex h-7 w-7 items-center justify-center rounded-full ${c.icon} ${c.text}`}>
                    {card.icon}
                  </div>
                </div>
                <div className={`text-2xl font-bold tracking-tight ${c.text}`}>
                  {card.type === 'currency' ? formatCurrency(card.value as number) : card.value}
                </div>
                <p className="text-xs text-text-tertiary">{card.sub}</p>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.slice(5).map((card, i) => {
          const c = colorMap[card.color];
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: (i + 5) * 0.04 }}
            >
              <Card className={`flex flex-col gap-2 border ${c.border} ${card.highlight ? c.bg : ''}`}>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wider text-text-tertiary">{card.label}</p>
                  <div className={`flex h-7 w-7 items-center justify-center rounded-full ${c.icon} ${c.text}`}>
                    {card.icon}
                  </div>
                </div>
                <div className={`text-2xl font-bold tracking-tight ${c.text}`}>
                  {card.type === 'currency' ? formatCurrency(card.value as number) : card.value}
                </div>
                <p className="text-xs text-text-tertiary">{card.sub}</p>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* ── Main Panels Grid ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">

        {/* Friends Money Pending — 3 cols */}
        <Card className="lg:col-span-3 overflow-hidden" noPadding>
          <div className="flex items-center justify-between border-b border-black/5 px-5 py-4">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-accent-purple" />
              <h3 className="font-semibold text-text-primary">Friends — Money Pending</h3>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/people')}>
              View All
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/5 bg-bg-secondary/40 text-xs uppercase tracking-wider text-text-tertiary">
                  <th className="px-5 py-3 text-left font-medium">Person</th>
                  <th className="px-5 py-3 text-right font-medium">Total Sent</th>
                  <th className="px-5 py-3 text-right font-medium">Come Back</th>
                  <th className="px-5 py-3 text-right font-medium">Pending</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {metrics.friendsPendingRows.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-text-tertiary text-sm">
                      No friend transactions yet.
                    </td>
                  </tr>
                )}
                {metrics.friendsPendingRows.map((row, i) => (
                  <motion.tr
                    key={row.personId}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="hover:bg-bg-secondary/30 transition-colors"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-purple/10 text-xs font-bold text-accent-purple">
                          {row.fullName.substring(0, 2).toUpperCase()}
                        </div>
                        <span className="font-medium text-text-primary">{row.fullName}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right font-medium text-text-primary">
                      {row.totalSent > 0 ? formatCurrency(row.totalSent) : <span className="text-text-tertiary">—</span>}
                    </td>
                    <td className="px-5 py-3 text-right text-accent-green font-medium">
                      {row.moneyBack > 0 ? formatCurrency(row.moneyBack) : <span className="text-text-tertiary">—</span>}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {row.pending > 0 ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-accent-orange">
                          {formatCurrency(row.pending)}
                        </span>
                      ) : (
                        <Badge variant="success">Settled</Badge>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Right column — IPO Status + Bank Received — 2 cols */}
        <div className="lg:col-span-2 flex flex-col gap-6">

          {/* IPO Status Panel */}
          <Card noPadding className="overflow-hidden">
            <div className="flex items-center gap-2 border-b border-black/5 px-5 py-4">
              <TrendingUp size={16} className="text-accent-blue" />
              <h3 className="font-semibold text-text-primary">IPO Status</h3>
            </div>
            <div className="divide-y divide-black/5">
              {metrics.ipoStatusCounts.map(row => (
                <div key={row.status} className="flex items-center justify-between px-5 py-3 hover:bg-bg-secondary/30 transition-colors">
                  <span className="text-sm text-text-secondary">{row.label}</span>
                  <span className={`text-sm font-bold ${row.count > 0 ? 'text-text-primary' : 'text-text-tertiary'}`}>
                    {row.count}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* Money Received By Bank Panel */}
          <Card noPadding className="overflow-hidden flex-1">
            <div className="flex items-center gap-2 border-b border-black/5 px-5 py-4">
              <Landmark size={16} className="text-accent-green" />
              <h3 className="font-semibold text-text-primary">Money Received By Bank</h3>
            </div>
            {metrics.bankReceivedRows.length === 0 ? (
              <div className="px-5 py-6 text-center text-sm text-text-tertiary">No refunds received yet.</div>
            ) : (
              <div className="divide-y divide-black/5">
                {metrics.bankReceivedRows.map(row => (
                  <div key={row.accountId} className="flex items-center justify-between px-5 py-3 hover:bg-bg-secondary/30 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-text-primary">{row.accountName}</p>
                      <p className="text-xs text-text-tertiary">{row.transactions} transaction{row.transactions !== 1 ? 's' : ''}</p>
                    </div>
                    <span className="text-sm font-bold text-accent-green">{formatCurrency(row.moneyReceived)}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* ── Bottom: Bank Balances + Money With People ─────────────────── */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">

        {/* Bank Balances */}
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-text-primary flex items-center gap-2">
              <Landmark size={16} className="text-accent-blue" /> Bank Balances
            </h3>
            <Button variant="ghost" size="sm" onClick={() => navigate('/accounts')}>View All</Button>
          </div>
          <div className="space-y-4">
            {metrics.banks.filter(b => b.availableBalance !== 0).map(bank => (
              <div key={bank.accountId} className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-text-primary">{bank.accountName}</span>
                  <span className={`font-bold ${bank.availableBalance >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                    {formatCurrency(bank.availableBalance)}
                  </span>
                </div>
              </div>
            ))}
            {metrics.banks.length === 0 && (
              <p className="text-sm text-text-tertiary">No accounts configured.</p>
            )}
          </div>
        </Card>

        {/* Top People by Pending */}
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-text-primary flex items-center gap-2">
              <Users size={16} className="text-accent-purple" /> Top Pending (People)
            </h3>
            <Button variant="ghost" size="sm" onClick={() => navigate('/people')}>View All</Button>
          </div>
          <div className="space-y-3">
            {metrics.friendsPendingRows
              .filter(r => r.pending > 0)
              .slice(0, 5)
              .map(row => (
                <div key={row.personId} className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-orange/10 text-xs font-bold text-accent-orange">
                    {row.fullName.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{row.fullName}</p>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-bg-tertiary">
                      <div
                        className="h-full rounded-full bg-accent-orange transition-all duration-700"
                        style={{ width: `${Math.min(100, (row.pending / Math.max(...metrics.friendsPendingRows.map(r => r.pending), 1)) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-accent-orange whitespace-nowrap">{formatCurrency(row.pending)}</span>
                </div>
              ))}
            {metrics.friendsPendingRows.filter(r => r.pending > 0).length === 0 && (
              <p className="text-sm text-text-tertiary flex items-center gap-2">
                <CheckCircle2 size={16} className="text-accent-green" /> All settled!
              </p>
            )}
          </div>
        </Card>
      </div>

      {/* ── Upcoming IPO Events ────────────────────────────────────────── */}
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-text-primary flex items-center gap-2">
            <Clock size={16} className="text-accent-blue" /> Upcoming IPO Events
          </h3>
          <Button variant="ghost" size="sm" onClick={() => navigate('/ipos')}>View All</Button>
        </div>
        <div className="space-y-4">
          {allIpos?.filter(ipo => ipo.status !== 'COMPLETED' && ipo.status !== 'LISTED').slice(0, 5).map(ipo => (
             <div key={ipo.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-bg-secondary/20 rounded-xl border border-black/5 hover:bg-bg-secondary/40 transition-colors">
               <div className="flex-1">
                 <p className="text-sm font-semibold text-text-primary">{ipo.ipoName}</p>
                 <p className="text-xs text-text-secondary">{ipo.companyName}</p>
               </div>
               <div className="flex flex-wrap gap-4">
                 <div className="flex flex-col">
                   <span className="text-[10px] uppercase text-text-tertiary font-medium tracking-wider">Open</span>
                   <span className="text-xs font-semibold text-text-primary">{new Date(ipo.openDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</span>
                 </div>
                 <div className="flex flex-col">
                   <span className="text-[10px] uppercase text-text-tertiary font-medium tracking-wider">Close</span>
                   <span className="text-xs font-semibold text-text-primary">{new Date(ipo.closeDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</span>
                 </div>
                 <div className="flex flex-col">
                   <span className="text-[10px] uppercase text-text-tertiary font-medium tracking-wider">Allotment</span>
                   <span className="text-xs font-semibold text-accent-purple">{new Date(ipo.allotmentDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</span>
                 </div>
                 <div className="flex flex-col">
                   <span className="text-[10px] uppercase text-text-tertiary font-medium tracking-wider">Listing</span>
                   <span className="text-xs font-semibold text-accent-green">{new Date(ipo.listingDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</span>
                 </div>
               </div>
             </div>
          ))}
          {allIpos?.filter(ipo => ipo.status !== 'COMPLETED' && ipo.status !== 'LISTED').length === 0 && (
             <p className="text-sm text-text-tertiary">No upcoming IPO events.</p>
          )}
        </div>
      </Card>

    </div>
  );
};
