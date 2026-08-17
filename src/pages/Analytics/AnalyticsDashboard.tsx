import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { mapTransaction, mapApplication } from '../../lib/mappers';
import { Card } from '../../components/ui/Card';
import { BlurOverlay } from '../../components/ui/BlurOverlay';
import { Badge } from '../../components/ui/Badge';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, 
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { Calendar, Filter, PieChart as PieIcon, TrendingUp, TrendingDown, Target, Activity, DollarSign, RefreshCcw } from 'lucide-react';
import { cn } from '../../lib/utils';

export const AnalyticsDashboard: React.FC = () => {
  const [timeframe, setTimeframe] = useState<'ALL' | 'YTD' | 'CUSTOM'>('YTD');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedIpoId, setSelectedIpoId] = useState<number | 'ALL'>('ALL');
  const [selectedPersonId, setSelectedPersonId] = useState<number | 'ALL'>('ALL');

  // Fetch data
  const { data: txs = [], isLoading: isLoadingTxs } = useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      const { data } = await supabase.from('transactions').select('*');
      return (data || []).map(mapTransaction);
    }
  });

  const { data: apps = [], isLoading: isLoadingApps } = useQuery({
    queryKey: ['applications'],
    queryFn: async () => {
      const { data } = await supabase.from('applications').select(`
        *,
        ipo:ipo_id (ipo_name, symbol, price_per_share, lot_size),
        applicant_person:applicant_person_id (full_name),
        demat:demat_account_id (broker_name, demat_id)
      `);
      return (data || []).map(mapApplication);
    }
  });

  const { data: ipos = [] } = useQuery({
    queryKey: ['ipos-list'],
    queryFn: async () => {
      const { data } = await supabase.from('ipos').select('id, ipo_name').order('created_at', { ascending: false });
      return data || [];
    }
  });

  const { data: people = [] } = useQuery({
    queryKey: ['people-list'],
    queryFn: async () => {
      const { data } = await supabase.from('people').select('id, full_name').order('full_name');
      return data || [];
    }
  });

  const isLoading = isLoadingTxs || isLoadingApps;

  const formatCurrency = (val: number = 0) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  // Apply filters
  const filteredApps = useMemo(() => {
    return apps.filter(a => {
      if (selectedIpoId !== 'ALL' && a.ipoId !== selectedIpoId) return false;
      if (selectedPersonId !== 'ALL' && a.applicantPersonId !== selectedPersonId) return false;
      
      const d = new Date(a.createdAt);
      if (timeframe === 'YTD' && d.getFullYear() !== new Date().getFullYear()) return false;
      if (timeframe === 'CUSTOM' && d.getFullYear() !== selectedYear) return false;
      
      return true;
    });
  }, [apps, selectedIpoId, selectedPersonId, timeframe, selectedYear]);

  const filteredTxs = useMemo(() => {
    return txs.filter(t => {
      if (selectedPersonId !== 'ALL') {
        // Approximate matching since txs don't have direct personId usually, but let's assume we filter by name if needed.
        // For simplicity in UI, if person is selected, we might just not filter txs deeply, or filter by to/from names
        // Let's skip deep person filtering on txs for now unless name matches.
      }
      
      const d = new Date(t.date);
      if (timeframe === 'YTD' && d.getFullYear() !== new Date().getFullYear()) return false;
      if (timeframe === 'CUSTOM' && d.getFullYear() !== selectedYear) return false;
      
      return true;
    });
  }, [txs, selectedPersonId, timeframe, selectedYear]);

  // Derived Statistics
  const stats = useMemo(() => {
    let moneySent = 0, moneyReceived = 0, ipoSales = 0;
    
    filteredTxs.forEach(t => {
      if (t.transactionType === 'MONEY_SENT') moneySent += t.amount;
      if (t.transactionType === 'MONEY_RECEIVED' || t.transactionType === 'IPO_REFUND') moneyReceived += t.amount;
      if (t.transactionType === 'IPO_SELL') ipoSales += t.amount;
    });

    const totalApplied = filteredApps.length;
    const allotted = filteredApps.filter(a => a.allotmentStatus === 'FULL' || a.allotmentStatus === 'PARTIAL');
    const notAllotted = filteredApps.filter(a => a.allotmentStatus === 'NONE');
    const allotmentRate = totalApplied > 0 ? ((allotted.length / totalApplied) * 100).toFixed(1) : '0.0';

    const capitalBlocked = filteredApps.reduce((sum, a) => sum + a.blockedAmount, 0);
    const capitalInvested = filteredApps.reduce((sum, a) => sum + a.investmentAmount, 0);
    const capitalReleased = filteredApps.reduce((sum, a) => sum + a.refundAmount, 0);

    // Calculate Realized Profit (from sales where refund amount or sales txs indicate profit)
    // We will use the applications' profit if stored, or approximate from txs.
    // For this dashboard, let's sum up investmentAmount vs current value/sales.
    // Assuming capital invested vs sales:
    const profit = ipoSales > 0 ? ipoSales - capitalInvested : 0; // Simplified

    return { 
      moneySent, moneyReceived, ipoSales,
      totalApplied, allottedCount: allotted.length, notAllottedCount: notAllotted.length, allotmentRate,
      capitalBlocked, capitalInvested, capitalReleased, profit
    };
  }, [filteredTxs, filteredApps]);

  // Chart Data: Allotment Status Donut
  const donutData = [
    { name: 'Allotted', value: stats.allottedCount, color: '#22c55e' },
    { name: 'Not Allotted', value: stats.notAllottedCount, color: '#ef4444' },
    { name: 'Pending', value: stats.totalApplied - stats.allottedCount - stats.notAllottedCount, color: '#f59e0b' }
  ].filter(d => d.value > 0);

  // Chart Data: Flow Over Time (Monthly aggregation based on timeframe)
  const flowData = useMemo(() => {
    const data = [];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    for (let i = 0; i < 12; i++) {
      let sent = 0, received = 0, appsCount = 0;
      
      filteredTxs.forEach(t => {
        const d = new Date(t.date);
        if (d.getMonth() === i) {
          if (t.transactionType === 'MONEY_SENT') sent += t.amount;
          if (t.transactionType === 'MONEY_RECEIVED' || t.transactionType === 'IPO_REFUND') received += t.amount;
        }
      });

      filteredApps.forEach(a => {
        const d = new Date(a.createdAt);
        if (d.getMonth() === i) {
          appsCount++;
        }
      });

      data.push({ month: months[i], sent, received, apps: appsCount });
    }
    return data;
  }, [filteredTxs, filteredApps]);

  // Chart Data: Broker Performance
  const brokerData = useMemo(() => {
    const brokerMap: Record<string, { applied: number, allotted: number }> = {};
    
    filteredApps.forEach(a => {
      const broker = a.demat?.brokerName || 'Unknown';
      if (!brokerMap[broker]) brokerMap[broker] = { applied: 0, allotted: 0 };
      
      brokerMap[broker].applied++;
      if (a.allotmentStatus === 'FULL' || a.allotmentStatus === 'PARTIAL') {
        brokerMap[broker].allotted++;
      }
    });

    return Object.entries(brokerMap)
      .map(([name, data]) => ({ name, ...data, rate: ((data.allotted / data.applied) * 100).toFixed(1) }))
      .sort((a, b) => b.applied - a.applied)
      .slice(0, 5); // Top 5
  }, [filteredApps]);

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent-blue/20 border-t-accent-blue" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header & Filter Bar */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary flex items-center gap-3">
            <Activity size={28} className="text-accent-blue" /> 
            Command Center
          </h1>
          <p className="mt-1 text-text-secondary text-sm">Advanced analytics and multi-dimensional filtering.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-2 bg-bg-secondary/40 rounded-2xl border border-black/5">
          <div className="flex items-center gap-2 px-2 text-text-tertiary">
            <Filter size={16} />
          </div>
          
          <select 
            value={timeframe} 
            onChange={e => setTimeframe(e.target.value as any)}
            className="px-3 py-2 rounded-xl bg-white border border-black/10 text-sm font-medium focus:ring-2 focus:ring-accent-blue/30 outline-none w-full sm:w-auto"
          >
            <option value="YTD">Year to Date (YTD)</option>
            <option value="CUSTOM">Specific Year</option>
            <option value="ALL">All Time</option>
          </select>
          
          {timeframe === 'CUSTOM' && (
            <select 
              value={selectedYear} 
              onChange={e => setSelectedYear(Number(e.target.value))}
              className="px-3 py-2 rounded-xl bg-white border border-black/10 text-sm font-medium focus:ring-2 focus:ring-accent-blue/30 outline-none w-full sm:w-auto animate-in fade-in"
            >
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          )}

          <select 
            value={selectedIpoId} 
            onChange={e => setSelectedIpoId(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
            className="px-3 py-2 rounded-xl bg-white border border-black/10 text-sm font-medium focus:ring-2 focus:ring-accent-blue/30 outline-none w-full sm:w-auto max-w-[150px]"
          >
            <option value="ALL">All IPOs</option>
            {ipos.map(ipo => <option key={ipo.id} value={ipo.id}>{ipo.ipo_name}</option>)}
          </select>

          <select 
            value={selectedPersonId} 
            onChange={e => setSelectedPersonId(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
            className="px-3 py-2 rounded-xl bg-white border border-black/10 text-sm font-medium focus:ring-2 focus:ring-accent-blue/30 outline-none w-full sm:w-auto max-w-[150px]"
          >
            <option value="ALL">All People</option>
            {people.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="flex flex-col justify-center bg-gradient-to-br from-white to-blue-50 border-blue-100 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Target size={100} />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-accent-blue/70 mb-1 z-10">Hit Rate</p>
          <div className="flex items-baseline gap-2 z-10">
            <span className="text-3xl font-bold text-accent-blue">{stats.allotmentRate}%</span>
            <span className="text-sm font-medium text-text-tertiary">({stats.allottedCount}/{stats.totalApplied})</span>
          </div>
        </Card>

        <Card className="flex flex-col justify-center bg-gradient-to-br from-white to-orange-50 border-orange-100 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <DollarSign size={100} />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-accent-orange/70 mb-1 z-10">Capital Blocked</p>
          <div className="text-2xl font-bold text-text-primary z-10">
            {formatCurrency(stats.capitalBlocked)}
          </div>
        </Card>

        <Card className="flex flex-col justify-center bg-gradient-to-br from-white to-green-50 border-green-100 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <TrendingUp size={100} />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-accent-green/70 mb-1 z-10">Capital Invested</p>
          <div className="text-2xl font-bold text-accent-green z-10">
            {formatCurrency(stats.capitalInvested)}
          </div>
        </Card>

        <Card className="flex flex-col justify-center bg-gradient-to-br from-white to-purple-50 border-purple-100 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <RefreshCcw size={100} />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-accent-purple/70 mb-1 z-10">Capital Released</p>
          <div className="text-2xl font-bold text-accent-purple z-10">
            {formatCurrency(stats.capitalReleased)}
          </div>
        </Card>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Flow & Apps Composed Chart */}
        <Card className="lg:col-span-2 flex flex-col">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-text-primary">Capital Flow & Application Velocity</h3>
              <p className="text-xs text-text-tertiary mt-1">Monthly comparison of money movement vs total applications</p>
            </div>
          </div>
          <div className="h-80 w-full mt-auto">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={flowData} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.2}/>
                  </linearGradient>
                  <linearGradient id="colorReceived" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0.2}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#00000010" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#666' }} dy={10} />
                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#999' }} tickFormatter={v => '₹' + (v/1000) + 'k'} />
                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#999' }} />
                <Tooltip 
                  cursor={{ fill: '#00000005' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: any, name: string) => {
                    if (name === 'Applications') return [value, name];
                    return [formatCurrency(value), name];
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                <Bar yAxisId="left" dataKey="sent" name="Money Sent" fill="url(#colorSent)" radius={[4, 4, 0, 0]} barSize={20} />
                <Bar yAxisId="left" dataKey="received" name="Money Received" fill="url(#colorReceived)" radius={[4, 4, 0, 0]} barSize={20} />
                <Line yAxisId="right" type="monotone" dataKey="apps" name="Applications" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Allotment Distribution Donut */}
        <Card className="flex flex-col">
          <div className="mb-2">
            <h3 className="font-semibold text-text-primary">Allotment Distribution</h3>
            <p className="text-xs text-text-tertiary mt-1">Success vs Failure Breakdown</p>
          </div>
          <div className="h-64 w-full flex-1 flex items-center justify-center relative mt-4">
            {donutData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={95}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                    cornerRadius={8}
                  >
                    {donutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ fontSize: '14px', fontWeight: 600 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-sm text-text-tertiary">No data available</div>
            )}
            
            {/* Center Text */}
            {donutData.length > 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-bold text-text-primary">{stats.totalApplied}</span>
                <span className="text-xs font-medium text-text-tertiary">Total</span>
              </div>
            )}
          </div>
          
          {/* Custom Legend */}
          <div className="mt-4 flex flex-col gap-2">
            {donutData.map((d, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="font-medium text-text-secondary">{d.name}</span>
                </div>
                <span className="font-bold text-text-primary">{d.value}</span>
              </div>
            ))}
          </div>
        </Card>

      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Broker Performance */}
        <Card>
          <div className="mb-6">
            <h3 className="font-semibold text-text-primary">Top Broker Performance</h3>
            <p className="text-xs text-text-tertiary mt-1">Which demat accounts yield the most allotments?</p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={brokerData} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#00000010" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#444' }} width={80} />
                <Tooltip 
                  cursor={{ fill: '#00000005' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="applied" name="Total Applied" fill="#cbd5e1" radius={[0, 4, 4, 0]} barSize={12} />
                <Bar dataKey="allotted" name="Allotted" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Actionable Insights (Mocked for design complexity) */}
        <Card className="bg-gradient-to-br from-bg-primary to-bg-secondary relative overflow-hidden">
          <div className="absolute right-0 top-0 w-64 h-64 bg-accent-blue/5 rounded-full blur-3xl" />
          <div className="relative z-10">
            <h3 className="font-semibold text-text-primary mb-6 flex items-center gap-2">
              <PieIcon size={18} className="text-accent-blue" />
              Smart Insights
            </h3>
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-white/60 border border-black/5 backdrop-blur-md shadow-sm">
                <p className="text-sm text-text-primary font-medium leading-relaxed">
                  Your overall allotment rate of <span className="font-bold text-accent-blue">{stats.allotmentRate}%</span> is {parseFloat(stats.allotmentRate) > 10 ? 'above' : 'below'} the typical retail average. 
                </p>
              </div>
              <div className="p-4 rounded-xl bg-white/60 border border-black/5 backdrop-blur-md shadow-sm">
                <p className="text-sm text-text-primary font-medium leading-relaxed">
                  You have <span className="font-bold text-accent-orange">{formatCurrency(stats.capitalBlocked)}</span> currently blocked. Expect unblocking or allotment in the coming week.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-accent-green/10 border border-accent-green/20 backdrop-blur-md shadow-sm flex gap-3 items-start">
                <TrendingUp size={20} className="text-accent-green shrink-0 mt-0.5" />
                <p className="text-sm text-accent-green font-semibold leading-relaxed">
                  Optimize your chances by using diverse PANs for heavily oversubscribed IPOs. You have {people.length} profiles available.
                </p>
              </div>
            </div>
          </div>
        </Card>

      </div>
    </div>
  );
};
