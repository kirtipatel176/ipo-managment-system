/**
 * Enterprise Dashboard — IPO Management Overview
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { mapIpo } from '../../lib/mappers';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { BlurOverlay } from '../../components/ui/BlurOverlay';
import { useDashboardMetrics } from './useDashboardMetrics';
import { useIPOFilter } from '../../hooks/useIPOFilter';
import {
  TrendingUp, Users, Landmark, RefreshCcw, ChevronDown, Filter,
  AlertCircle, CheckCircle2, Clock, Wallet,
  Briefcase, Activity
} from 'lucide-react';
import { motion } from 'framer-motion';
import { 
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { selectedIpoId, setSelectedIpoId } = useIPOFilter();
  const { data: metrics, isLoading: isMetricsLoading } = useDashboardMetrics(selectedIpoId);
  const { data: allIpos, isLoading: isIposLoading } = useQuery({
    queryKey: ['ipos'],
    queryFn: async () => {
      const { data } = await supabase.from('ipos').select('*');
      return (data || []).map(mapIpo);
    }
  });

  const [showSeedConfirm, setShowSeedConfirm] = useState(false);

  const formatCurrency = (val: number = 0) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  const handleReseed = async () => {
    console.log('Seeding is disabled');
    setShowSeedConfirm(false);
  };

  if (isMetricsLoading || isIposLoading || !metrics) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent-blue/20 border-t-accent-blue" />
      </div>
    );
  }

  const selectedIpo = allIpos?.find(i => i.id === selectedIpoId);
  const mo = metrics.moneyOverview;

  // Preparing data for the new Bank Liquidity Bar Chart
  const bankLiquidityData = metrics.banks
    .filter(b => b.availableBalance > 0)
    .sort((a, b) => b.availableBalance - a.availableBalance)
    .slice(0, 6) // Top 6 banks for chart
    .map(b => ({
      name: b.accountName.substring(0, 10) + (b.accountName.length > 10 ? '...' : ''),
      balance: b.availableBalance,
      fullTitle: b.accountName
    }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-black/10 shadow-premium rounded-lg text-sm">
          <p className="font-semibold text-text-primary mb-1">{payload[0].payload?.fullTitle || label}</p>
          <p className="text-accent-blue font-bold">{formatCurrency(payload[0].value)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Overview</h1>
          <p className="mt-1 text-text-secondary text-sm">Enterprise IPO & Capital Management Dashboard.</p>
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
              <option value="">Global View (All IPOs)</option>
              {allIpos?.map(ipo => (
                <option key={ipo.id} value={ipo.id}>{ipo.ipoName}</option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-2.5 flex items-center pointer-events-none text-text-tertiary">
              <ChevronDown size={14} />
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            icon={<RefreshCcw size={14} />}
            onClick={() => setShowSeedConfirm(true)}
            className="bg-white hover:bg-bg-secondary"
          >
            Reset
          </Button>
        </div>
      </div>

      {showSeedConfirm && (
        <div className="flex items-center gap-4 rounded-xl border border-accent-orange/30 bg-accent-orange/5 p-4 shadow-sm">
          <AlertCircle size={18} className="text-accent-orange shrink-0" />
          <p className="flex-1 text-sm text-text-primary">
            This will <strong>wipe all data</strong> and reload the real seed data from the Excel sheet. Confirm?
          </p>
          <Button size="sm" variant="outline" onClick={handleReseed}>Yes, Reset</Button>
          <Button size="sm" variant="ghost" onClick={() => setShowSeedConfirm(false)}>Cancel</Button>
        </div>
      )}

      {selectedIpo && (
        <div className="flex items-center gap-3 rounded-xl border border-accent-blue/20 bg-accent-blue/5 px-4 py-3 shadow-sm">
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
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="flex flex-col gap-3">
          <div className="flex items-center gap-2 px-1">
            <Activity size={16} className="text-accent-orange" />
            <h2 className="text-xs font-bold text-text-primary uppercase tracking-wider">Action Required</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {metrics.actions.map(action => {
               const borderColors: Record<string, string> = { WARNING: 'border-l-accent-orange', INFO: 'border-l-accent-blue', SUCCESS: 'border-l-accent-green' };
               return (
                 <Card key={action.id} className={`cursor-pointer hover:shadow-md transition-shadow border-l-4 ${borderColors[action.type]}`} onClick={() => action.link && navigate(action.link)}>
                   <p className="text-sm font-medium text-text-primary">{action.message}</p>
                 </Card>
               );
            })}
          </div>
        </motion.div>
      )}

      {/* ── TIER 1: Hero Financial Metrics (Bento Box Row 1) ────────────── */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.0 }} className="h-full">
          <Card className="relative overflow-hidden flex flex-col justify-between h-full group">
            <div className="absolute -right-6 -top-6 text-accent-blue/5 group-hover:text-accent-blue/10 transition-colors pointer-events-none">
              <Wallet size={120} strokeWidth={1} />
            </div>
            <div className="relative z-10">
              <p className="text-xs font-medium uppercase tracking-wider text-text-tertiary">Total Capital</p>
              <BlurOverlay blurLevel="blur-md">
                <h2 className="text-3xl font-bold tracking-tight text-text-primary mt-1">{formatCurrency(mo.totalMoney)}</h2>
              </BlurOverlay>
              <div className="mt-4 flex items-center gap-2 text-xs font-medium text-accent-green bg-accent-green/10 w-fit px-2 py-1 rounded-md">
                <CheckCircle2 size={12} /> 100% Reconciled
              </div>
            </div>
          </Card>
        </motion.div>
        
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="h-full">
          <Card className="flex flex-col justify-between h-full">
            <div>
              <div className="flex justify-between items-start">
                <p className="text-xs font-medium uppercase tracking-wider text-text-tertiary">Total Invested</p>
                <div className="p-2 bg-accent-green/10 text-accent-green rounded-lg"><Briefcase size={16} /></div>
              </div>
              <BlurOverlay blurLevel="blur-md">
                <h2 className="text-2xl font-bold tracking-tight text-text-primary mt-2">{formatCurrency(mo.invested)}</h2>
              </BlurOverlay>
            </div>
            <div className="mt-4 pt-4 border-t border-black/5 text-xs text-text-secondary flex justify-between">
              <span>Unrealized P&L:</span>
              <BlurOverlay blurLevel="blur-md">
                <span className={`font-semibold ${mo.unrealizedPnL >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                  {mo.unrealizedPnL >= 0 ? '+' : ''}{formatCurrency(mo.unrealizedPnL)}
                </span>
              </BlurOverlay>
            </div>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="h-full">
          <Card className="flex flex-col justify-between h-full">
            <div>
              <div className="flex justify-between items-start">
                <p className="text-xs font-medium uppercase tracking-wider text-text-tertiary">Bank Liquidity</p>
                <div className="p-2 bg-accent-blue/10 text-accent-blue rounded-lg"><Landmark size={16} /></div>
              </div>
              <BlurOverlay blurLevel="blur-md">
                <h2 className="text-2xl font-bold tracking-tight text-text-primary mt-2">{formatCurrency(mo.bankCash)}</h2>
              </BlurOverlay>
            </div>
            <div className="mt-4 pt-4 border-t border-black/5 text-xs text-text-secondary flex justify-between">
              <span>Blocked for IPOs:</span>
              <BlurOverlay blurLevel="blur-md">
                <span className="font-semibold text-accent-orange">{formatCurrency(mo.ipoBlocked)}</span>
              </BlurOverlay>
            </div>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="h-full">
          <Card className="flex flex-col justify-between h-full">
            <div>
              <div className="flex justify-between items-start">
                <p className="text-xs font-medium uppercase tracking-wider text-text-tertiary">Receivables (Friends)</p>
                <div className="p-2 bg-accent-purple/10 text-accent-purple rounded-lg"><Users size={16} /></div>
              </div>
              <BlurOverlay blurLevel="blur-md">
                <h2 className="text-2xl font-bold tracking-tight text-text-primary mt-2">{formatCurrency(mo.friendMoney)}</h2>
              </BlurOverlay>
            </div>
            <div className="mt-4 pt-4 border-t border-black/5 text-xs text-text-secondary flex justify-between">
              <span>Pending Recovery:</span>
              <BlurOverlay blurLevel="blur-md">
                <span className={`font-semibold ${metrics.totalPending > 0 ? 'text-accent-red' : 'text-text-tertiary'}`}>
                  {formatCurrency(metrics.totalPending)}
                </span>
              </BlurOverlay>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* ── TIER 2: Visual Analytics (Charts) ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="h-[360px] flex flex-col">
            <h3 className="font-semibold text-text-primary text-sm flex items-center gap-2 mb-2">
              <Activity size={16} className="text-accent-blue" /> Capital Allocation
            </h3>
            <div className="flex-1 relative w-full h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Bank Cash', value: mo.bankCash, color: '#635bff' },
                      { name: 'IPO Blocked', value: mo.ipoBlocked, color: '#f5a623' },
                      { name: 'Friend Money', value: mo.friendMoney, color: '#8d49f7' },
                      { name: 'Invested', value: mo.invested, color: '#22c55e' }
                    ].filter(d => d.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={110}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {([
                      { name: 'Bank Cash', value: mo.bankCash, color: '#635bff' },
                      { name: 'IPO Blocked', value: mo.ipoBlocked, color: '#f5a623' },
                      { name: 'Friend Money', value: mo.friendMoney, color: '#8d49f7' },
                      { name: 'Invested', value: mo.invested, color: '#22c55e' }
                    ].filter(d => d.value > 0)).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              {/* Custom Legend Overlay */}
              <div className="absolute right-0 top-1/2 -translate-y-1/2 flex flex-col gap-3 pr-4">
                {[
                  { name: 'Bank Cash', value: mo.bankCash, color: 'bg-accent-blue' },
                  { name: 'IPO Blocked', value: mo.ipoBlocked, color: 'bg-accent-orange' },
                  { name: 'Friend Money', value: mo.friendMoney, color: 'bg-accent-purple' },
                  { name: 'Invested', value: mo.invested, color: 'bg-accent-green' }
                ].filter(d => d.value > 0).map(item => (
                  <div key={item.name} className="flex flex-col items-end">
                    <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                      {item.name} <div className={`w-2 h-2 rounded-full ${item.color}`} />
                    </div>
                    <span className="font-semibold text-sm text-text-primary">{formatCurrency(item.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Card className="h-[360px] flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-semibold text-text-primary text-sm flex items-center gap-2">
                <Landmark size={16} className="text-accent-blue" /> Bank Liquidity Analysis
              </h3>
              <Button variant="ghost" size="sm" onClick={() => navigate('/accounts')}>View All</Button>
            </div>
            
            {bankLiquidityData.length > 0 ? (
              <div className="flex-1 w-full h-full pb-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={bankLiquidityData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e3e8ee" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#697386', fontSize: 11 }} 
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#697386', fontSize: 11 }}
                      tickFormatter={(value) => `₹${(value/1000)}k`}
                    />
                    <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: '#f7f9fc' }} />
                    <Bar dataKey="balance" fill="#635bff" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-sm text-text-tertiary">
                No bank balances available.
              </div>
            )}
          </Card>
        </motion.div>
      </div>

      {/* ── TIER 3: Operational Metrics ────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* IPO Pipeline Process Tracker */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="lg:col-span-2">
          <Card className="h-full flex flex-col justify-center">
            <h3 className="font-semibold text-text-primary text-sm flex items-center gap-2 mb-6">
              <TrendingUp size={16} className="text-accent-purple" /> IPO Pipeline
            </h3>
            <div className="flex items-center justify-between relative w-full h-24 px-6">
              <div className="absolute top-1/2 left-10 right-10 h-0.5 bg-bg-tertiary -translate-y-1/2 z-0"></div>
              {metrics.ipoStatusCounts.map((status) => {
                const isActive = status.count > 0;
                return (
                  <div key={status.status} className="flex flex-col items-center gap-3 z-10 bg-white px-2">
                    <div className={`h-12 w-12 rounded-full flex items-center justify-center font-bold text-lg shadow-sm border-2 transition-all ${isActive ? 'border-accent-blue text-accent-blue bg-accent-blue-light' : 'border-bg-tertiary text-text-tertiary bg-white'}`}>
                      {status.count}
                    </div>
                    <span className={`text-xs font-semibold ${isActive ? 'text-text-primary' : 'text-text-tertiary'}`}>
                      {status.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        </motion.div>

        {/* Application Stats Mini-Grid */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="lg:col-span-2 grid grid-cols-2 gap-4">
           {[
            { label: 'Total Apps', val: metrics.totalApplications, icon: <Users size={16} />, color: 'text-accent-blue', bg: 'bg-accent-blue-light' },
            { label: 'Lots Applied', val: metrics.totalLotsApplied, icon: <CheckCircle2 size={16} />, color: 'text-accent-blue', bg: 'bg-accent-blue-light' },
            { label: 'Allotted', val: metrics.allottedApplications, icon: <CheckCircle2 size={16} />, color: 'text-accent-green', bg: 'bg-accent-green-light' },
            { label: 'Not Allotted', val: metrics.notAllottedApplications, icon: <AlertCircle size={16} />, color: 'text-accent-orange', bg: 'bg-accent-orange-light' },
           ].map((stat, i) => (
             <Card key={i} className="flex flex-col justify-center items-center py-5">
               <div className={`p-2 rounded-full ${stat.bg} ${stat.color} mb-2`}>
                 {stat.icon}
               </div>
               <div className="text-xl font-bold text-text-primary">{stat.val}</div>
               <div className="text-xs text-text-secondary mt-1">{stat.label}</div>
             </Card>
           ))}
        </motion.div>
      </div>

      {/* ── TIER 4: Actionable Data Tables ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left: Friends Pending */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
          <Card noPadding className="overflow-hidden flex flex-col h-full">
            <div className="flex items-center justify-between border-b border-black/5 px-6 py-4 bg-bg-secondary/30">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-accent-purple" />
                <h3 className="font-semibold text-text-primary text-sm">Actionable Receivables (Friends)</h3>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/people')}>View Details</Button>
            </div>
            
            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-black/5 text-xs text-text-tertiary">
                    <th className="px-6 py-3 text-left font-medium">Entity</th>
                    <th className="px-6 py-3 text-right font-medium">Pending Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {metrics.friendsPendingRows.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="px-6 py-8 text-center text-text-tertiary text-sm">
                        <CheckCircle2 size={24} className="mx-auto mb-2 text-accent-green/50" />
                        No pending receivables.
                      </td>
                    </tr>
                  ) : (
                    metrics.friendsPendingRows.slice(0, 5).map((row) => (
                      <tr key={row.personId} className="hover:bg-bg-secondary/40 transition-colors">
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-purple/10 text-xs font-bold text-accent-purple">
                              {row.fullName.substring(0, 2).toUpperCase()}
                            </div>
                            <span className="font-medium text-text-primary">{row.fullName}</span>
                          </div>
                        </td>
                        <td className="px-6 py-3 text-right">
                          <BlurOverlay blurLevel="blur-md">
                            {row.pending > 0 ? (
                              <span className="inline-flex items-center gap-1 font-semibold text-accent-red">
                                {formatCurrency(row.pending)}
                              </span>
                            ) : (
                              <Badge variant="success">Settled</Badge>
                            )}
                          </BlurOverlay>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </motion.div>

        {/* Right: Upcoming IPO Events */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}>
          <Card noPadding className="overflow-hidden flex flex-col h-full">
            <div className="flex items-center justify-between border-b border-black/5 px-6 py-4 bg-bg-secondary/30">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-accent-blue" />
                <h3 className="font-semibold text-text-primary text-sm">Upcoming IPO Events</h3>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/ipos')}>Pipeline</Button>
            </div>
            
            <div className="p-4 space-y-3 flex-1 overflow-y-auto">
              {allIpos?.filter(ipo => ipo.status !== 'COMPLETED' && ipo.status !== 'LISTED').slice(0, 5).map(ipo => (
                 <div key={ipo.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-white border border-black/5 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                   <div className="flex-1">
                     <p className="text-sm font-semibold text-text-primary">{ipo.ipoName}</p>
                     <p className="text-xs text-text-secondary">{ipo.companyName}</p>
                   </div>
                   <div className="flex flex-wrap gap-4">
                     <div className="flex flex-col">
                       <span className="text-[10px] uppercase text-text-tertiary font-medium tracking-wider">Close</span>
                       <span className="text-xs font-semibold text-text-primary">{new Date(ipo.closeDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</span>
                     </div>
                     <div className="flex flex-col">
                       <span className="text-[10px] uppercase text-text-tertiary font-medium tracking-wider">Allot</span>
                       <span className="text-xs font-semibold text-accent-purple">{new Date(ipo.allotmentDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</span>
                     </div>
                   </div>
                 </div>
              ))}
              {allIpos?.filter(ipo => ipo.status !== 'COMPLETED' && ipo.status !== 'LISTED').length === 0 && (
                 <div className="flex items-center justify-center h-full text-sm text-text-tertiary py-8">
                   No upcoming IPO events in the pipeline.
                 </div>
              )}
            </div>
          </Card>
        </motion.div>

      </div>

    </div>
  );
};
