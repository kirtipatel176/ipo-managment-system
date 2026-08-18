import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { mapHolding, mapIpo, mapPerson, mapBankAccount } from '../../lib/mappers';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { TransactionEngine } from '../../engine/TransactionEngine';
import { PieChart, Briefcase, TrendingUp, ArrowUpRight, ArrowDownRight, Search, RefreshCw, Edit3 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Pagination } from '../../components/ui/Pagination';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../contexts/AuthContext';
import { BlurOverlay } from '../../components/ui/BlurOverlay';

export const Holdings: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const sellSubmitting = useRef(false);
  const refreshing = useRef(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  const [sellingHolding, setSellingHolding] = useState<any>(null);
  const [editingPriceHolding, setEditingPriceHolding] = useState<any>(null);
  const [newPrice, setNewPrice] = useState<number>(0);
  const [sellForm, setSellForm] = useState<{
    sharesToSell: number;
    sellPrice: number;
    charges: number;
    bankAccountId: number;
    date: string;
    utr: string;
    profitMode: 'ALL_MINE' | 'ALL_FRIENDS' | 'SPLIT';
    profitSplitRatio: number;
    proceedsDestination: 'FRIEND_BALANCE' | 'BANK_ACCOUNT';
    targetBankAccountId: number;
  }>({
    sharesToSell: 0,
    sellPrice: 0,
    charges: 0,
    bankAccountId: 0,
    date: new Date().toISOString().split('T')[0],
    utr: '',
    profitMode: 'ALL_MINE',
    profitSplitRatio: 50,
    proceedsDestination: 'FRIEND_BALANCE',
    targetBankAccountId: 0
  });
  
  const { data: bankAccounts } = useQuery({
    queryKey: ['banksActive'],
    queryFn: async () => {
      const { data } = await supabase.from('bank_accounts').select('*').eq('is_active', true);
      return (data || []).map(mapBankAccount);
    }
  });

  const { data: holdingsData, isLoading } = useQuery({
    queryKey: ['holdingsData'],
    queryFn: async () => {
      const [
        { data: hData },
        { data: iData },
        { data: pData }
      ] = await Promise.all([
        supabase.from('holdings').select('*'),
        supabase.from('ipos').select('*'),
        supabase.from('people').select('*')
      ]);

      const holdings = (hData || []).map(mapHolding);
      const ipos = (iData || []).map(mapIpo);
      const people = (pData || []).map(mapPerson);

      return holdings.map(holding => {
        const ipo = ipos.find(i => i.id === holding.ipoId);
        const person = people.find(p => p.id === holding.personId);

        return {
          ...holding,
          ipoName: ipo?.ipoName || 'Unknown IPO',
          symbol: ipo?.symbol || 'N/A',
          personName: person?.fullName || 'Unknown Person',
          isSelf: person?.isSelf || false,
        };
      });
    }
  });

  // Auto-refresh holdings prices on first load
  useEffect(() => {
    const autoRefresh = async () => {
      try {
        await TransactionEngine.refreshAllHoldingPrices();
        queryClient.invalidateQueries({ queryKey: ['holdingsData'] });
      } catch {
        // Silent fail on auto-refresh — user can manually trigger
      }
    };
    autoRefresh();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRefreshPrices = async () => {
    if (refreshing.current) return;
    refreshing.current = true;
    try {
      const updatedCount = await TransactionEngine.refreshAllHoldingPrices();
      queryClient.invalidateQueries({ queryKey: ['holdingsData'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
      toast.success(
        updatedCount > 0
          ? `${updatedCount} holding(s) updated with latest market prices.`
          : 'All holdings are already up to date.',
        'Prices Refreshed'
      );
    } catch (error: any) {
      toast.error(error.message ?? 'Failed to refresh prices.', 'Refresh Error');
    } finally {
      refreshing.current = false;
    }
  };

  const handleUpdatePrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPriceHolding || newPrice <= 0) return;
    try {
      // Update the IPO's current_market_price so all holdings for that IPO refresh
      await supabase.from('ipos').update({
        current_market_price: newPrice,
        updated_at: new Date().toISOString(),
      }).eq('id', editingPriceHolding.ipoId);

      // Also directly update this holding
      await TransactionEngine.updateHoldingPrice(editingPriceHolding.id, newPrice);
      queryClient.invalidateQueries({ queryKey: ['holdingsData'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
      toast.success(
        `Market price for ${editingPriceHolding.ipoName} updated to ₹${newPrice.toLocaleString('en-IN')}.`,
        'Price Updated'
      );
      setEditingPriceHolding(null);
    } catch (error: any) {
      toast.error(error.message ?? 'Failed to update price.', 'Update Error');
    }
  };

  const handleOpenSell = (holding: any) => {
    setSellingHolding(holding);
    setSellForm({
      sharesToSell: holding.shares,
      sellPrice: holding.currentPrice,
      charges: 0,
      bankAccountId: bankAccounts?.[0]?.id || 0,
      date: new Date().toISOString().split('T')[0],
      utr: '',
      profitMode: 'ALL_MINE',
      profitSplitRatio: 50,
      proceedsDestination: 'FRIEND_BALANCE',
      targetBankAccountId: bankAccounts?.[0]?.id || 0
    });
  };

  const handleSellSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sellingHolding) return;
    if (sellingHolding.isSelf && !sellForm.bankAccountId) return;
    if (!sellingHolding.isSelf && sellForm.proceedsDestination === 'BANK_ACCOUNT' && !sellForm.targetBankAccountId) return;
    if (sellSubmitting.current) return;
    sellSubmitting.current = true;
    try {
      await TransactionEngine.sellHolding(
        sellingHolding.id,
        Number(sellForm.sharesToSell),
        Number(sellForm.sellPrice),
        Number(sellForm.charges),
        Number(sellForm.bankAccountId),
        sellForm.date,
        sellForm.utr || undefined,
        sellingHolding.isSelf ? undefined : {
          mode: sellForm.profitMode,
          splitRatio: Number(sellForm.profitSplitRatio),
          proceedsDestination: sellForm.proceedsDestination,
          targetBankAccountId: Number(sellForm.targetBankAccountId)
        }
      );
      queryClient.invalidateQueries({ queryKey: ['holdingsData'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['salesData'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
      toast.success(
        `${sellForm.sharesToSell} shares of ${sellingHolding.ipoName} sold successfully.`,
        'Holding Sold'
      );
      setSellingHolding(null);
    } catch (error: any) {
      toast.error(error.message ?? 'Failed to process sale.', 'Sale Error');
    } finally {
      sellSubmitting.current = false;
    }
  };

  const filteredHoldings = holdingsData?.filter(holding => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      holding.ipoName.toLowerCase().includes(searchLower) ||
      holding.personName.toLowerCase().includes(searchLower) ||
      holding.symbol.toLowerCase().includes(searchLower)
    );
  }) || [];

  const paginatedHoldings = filteredHoldings.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const formatCurrency = (val: number = 0) => 
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  const formatPercentage = (val: number = 0) => 
    new Intl.NumberFormat('en-IN', { style: 'percent', minimumFractionDigits: 2 }).format(val / 100);

  const totalInvested = holdingsData?.reduce((acc, curr) => acc + (curr.shares * curr.averageCost), 0) || 0;
  const totalCurrentValue = holdingsData?.reduce((acc, curr) => acc + curr.currentValue, 0) || 0;
  const totalUnrealizedProfit = holdingsData?.reduce((acc, curr) => acc + curr.unrealizedProfit, 0) || 0;
  const totalROI = totalInvested > 0 ? (totalUnrealizedProfit / totalInvested) * 100 : 0;

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent-blue/20 border-t-accent-blue" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Portfolio Holdings</h1>
          <p className="mt-1 text-text-secondary">Track your active IPO investments and unrealized gains.</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          icon={<RefreshCw size={14} />}
          onClick={handleRefreshPrices}
          disabled={!user}
        >
          Refresh Prices
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card className="flex flex-col justify-center bg-gradient-to-br from-bg-primary to-bg-secondary border-black/5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-text-secondary">
            <Briefcase size={16} /> Total Invested
          </div>
          <div className="text-3xl font-bold tracking-tight text-text-primary">
            {formatCurrency(totalInvested)}
          </div>
        </Card>

        <Card className="flex flex-col justify-center bg-gradient-to-br from-bg-primary to-bg-secondary border-black/5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-text-secondary">
            <PieChart size={16} /> Current Value
          </div>
          <div className="text-3xl font-bold tracking-tight text-text-primary">
            {formatCurrency(totalCurrentValue)}
          </div>
        </Card>

        <Card className={`flex flex-col justify-center border-black/5 shadow-sm ${totalUnrealizedProfit >= 0 ? 'bg-accent-green/5' : 'bg-accent-red/5'}`}>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-text-secondary">
            <TrendingUp size={16} /> Unrealized P&L
          </div>
          <div className="flex items-end gap-3">
            <div className={`text-3xl font-bold tracking-tight ${totalUnrealizedProfit >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
              {totalUnrealizedProfit >= 0 ? '+' : ''}{formatCurrency(totalUnrealizedProfit)}
            </div>
            <div className={`flex items-center gap-1 text-sm font-medium mb-1 ${totalUnrealizedProfit >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
              {totalUnrealizedProfit >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
              {formatPercentage(totalROI)}
            </div>
          </div>
        </Card>
      </div>

      <div>
        <div className="flex flex-col gap-4 border-b border-black/5 pb-4 mb-6 md:flex-row md:items-center md:justify-between">
          <h2 className="text-lg font-semibold text-text-primary">Your Assets</h2>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            <Input 
              icon={<Search size={16} />} 
              placeholder="Search holdings..." 
              className="w-full sm:max-w-[200px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        {paginatedHoldings.length === 0 ? (
          <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed border-2 bg-transparent shadow-none">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-bg-secondary text-text-tertiary mb-4">
              <Briefcase size={32} />
            </div>
            <h3 className="text-lg font-semibold text-text-primary mb-2">No Holdings Yet</h3>
            <p className="text-text-secondary max-w-sm">
              Allotted IPOs that are successfully transferred to your portfolio will appear here.
            </p>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedHoldings.map((holding, index) => {
                const isProfit = holding.unrealizedProfit >= 0;
              return (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  key={holding.id}
                >
                  <Card className="h-full flex flex-col hover:shadow-md transition-shadow group relative overflow-hidden">
                    {/* Top Accent Line */}
                    <div className={`absolute top-0 left-0 right-0 h-1 ${isProfit ? 'bg-accent-green' : 'bg-accent-red'}`} />
                    
                    <div className="flex items-start justify-between mb-6 pt-2">
                      <div>
                        <h3 className="text-lg font-semibold tracking-tight text-text-primary leading-tight line-clamp-1" title={holding.ipoName}>
                          {holding.ipoName}
                        </h3>
                        <p className="text-xs font-medium text-text-tertiary mt-1">
                          {holding.symbol} • Held by <span className="text-text-secondary">{holding.personName}</span>
                        </p>
                      </div>
                      <Badge variant={isProfit ? 'success' : 'danger'} className="shrink-0 flex items-center gap-1">
                        {isProfit ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                        {formatPercentage(holding.unrealizedROI)}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6 flex-1">
                      <div>
                        <p className="text-xs font-medium text-text-tertiary mb-1">Quantity</p>
                        <BlurOverlay blurLevel="blur-sm">
                          <p className="text-sm font-semibold text-text-primary">{holding.shares} <span className="text-xs font-normal text-text-secondary">shares</span></p>
                        </BlurOverlay>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-text-tertiary mb-1">Avg. Cost</p>
                        <BlurOverlay blurLevel="blur-sm">
                          <p className="text-sm font-semibold text-text-primary">{formatCurrency(holding.averageCost)}</p>
                        </BlurOverlay>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-text-tertiary mb-1">Invested</p>
                        <BlurOverlay blurLevel="blur-sm">
                          <p className="text-sm font-semibold text-text-primary">{formatCurrency(holding.shares * holding.averageCost)}</p>
                        </BlurOverlay>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-text-tertiary mb-1">Current Price</p>
                        <BlurOverlay blurLevel="blur-sm">
                          <p className="text-sm font-semibold text-text-primary">{formatCurrency(holding.currentPrice)}</p>
                        </BlurOverlay>
                      </div>
                    </div>

                    <div className="mt-auto pt-4 border-t border-black/5 flex items-end justify-between">
                      <div>
                        <p className="text-xs font-medium text-text-tertiary mb-1">Current Value</p>
                        <BlurOverlay blurLevel="blur-sm">
                          <p className="text-lg font-bold text-text-primary tracking-tight">{formatCurrency(holding.currentValue)}</p>
                        </BlurOverlay>
                      </div>
                      <div className="flex items-center gap-2 text-right">
                        <div>
                          <p className="text-xs font-medium text-text-tertiary mb-1">P&L</p>
                          <BlurOverlay blurLevel="blur-sm">
                            <p className={`text-sm font-bold ${isProfit ? 'text-accent-green' : 'text-accent-red'}`}>
                              {isProfit ? '+' : ''}{formatCurrency(holding.unrealizedProfit)}
                            </p>
                          </BlurOverlay>
                        </div>
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => { setEditingPriceHolding(holding); setNewPrice(holding.currentPrice); }}
                            className="p-1.5 rounded-lg text-text-tertiary hover:text-accent-blue hover:bg-accent-blue/10 transition-colors"
                            title="Update market price"
                            disabled={!user}
                          >
                            <Edit3 size={14} />
                          </button>
                          <Button size="sm" variant="primary" onClick={() => handleOpenSell(holding)} disabled={!user}>Sell</Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
            </div>
            <Pagination 
              currentPage={currentPage}
              pageSize={pageSize}
              totalItems={filteredHoldings.length}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* Update Price Modal */}
      <Modal isOpen={!!editingPriceHolding} onClose={() => setEditingPriceHolding(null)} title={`Update Price — ${editingPriceHolding?.ipoName}`}>
        {editingPriceHolding && (
          <form onSubmit={handleUpdatePrice} className="space-y-4">
            <div className="rounded-xl bg-bg-secondary/50 p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Current Price</span>
                <span className="font-medium">{formatCurrency(editingPriceHolding.currentPrice)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Avg. Cost</span>
                <span className="font-medium">{formatCurrency(editingPriceHolding.averageCost)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Shares</span>
                <span className="font-medium">{editingPriceHolding.shares}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-primary">New Market Price (₹)</label>
              <Input 
                type="number" 
                step="0.01" 
                required 
                min="0.01"
                value={newPrice}
                onChange={e => setNewPrice(Number(e.target.value))}
              />
            </div>

            {newPrice > 0 && (
              <div className="rounded-lg bg-bg-secondary p-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">New Value</span>
                  <span className="font-semibold">{formatCurrency(editingPriceHolding.shares * newPrice)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">New P&L</span>
                  <span className={`font-semibold ${(newPrice - editingPriceHolding.averageCost) >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                    {(newPrice - editingPriceHolding.averageCost) >= 0 ? '+' : ''}
                    {formatCurrency(editingPriceHolding.shares * (newPrice - editingPriceHolding.averageCost))}
                  </span>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-black/5">
              <Button type="button" variant="ghost" onClick={() => setEditingPriceHolding(null)}>Cancel</Button>
              <Button type="submit" variant="primary">Update Price</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Sell Modal */}
      <Modal isOpen={!!sellingHolding} onClose={() => setSellingHolding(null)} title={`Sell ${sellingHolding?.ipoName}`}>
        {sellingHolding && (
          <form onSubmit={handleSellSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-primary">Shares to Sell (Max {sellingHolding.shares})</label>
                <Input 
                  type="number" required min="1" max={sellingHolding.shares}
                  value={sellForm.sharesToSell}
                  onChange={e => setSellForm({...sellForm, sharesToSell: Number(e.target.value)})}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-primary">Sell Price (₹)</label>
                <Input 
                  type="number" step="0.01" required min="0"
                  value={sellForm.sellPrice}
                  onChange={e => setSellForm({...sellForm, sellPrice: Number(e.target.value)})}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-primary">Charges/Taxes (₹)</label>
                <Input 
                  type="number" step="0.01" min="0"
                  value={sellForm.charges}
                  onChange={e => setSellForm({...sellForm, charges: Number(e.target.value)})}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-primary">Date</label>
                <Input 
                  type="date" required
                  value={sellForm.date}
                  onChange={e => setSellForm({...sellForm, date: e.target.value})}
                />
              </div>
            </div>

            {sellingHolding.isSelf ? (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-primary">Receive Money In</label>
                <select 
                  required
                  value={sellForm.bankAccountId}
                  onChange={e => setSellForm({...sellForm, bankAccountId: Number(e.target.value)})}
                  className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-text-primary focus:border-accent-blue focus:outline-none focus:ring-2 focus:ring-accent-blue/20"
                >
                  <option value={0}>Select Bank Account</option>
                  {bankAccounts?.map(b => (
                    <option key={b.id} value={b.id}>{b.bankName} - {b.accountName}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="space-y-4 rounded-xl border border-black/5 bg-bg-secondary/50 p-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text-primary">Profit Ownership</label>
                  <select 
                    value={sellForm.profitMode}
                    onChange={e => setSellForm({...sellForm, profitMode: e.target.value as any})}
                    className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-text-primary focus:border-accent-blue focus:outline-none focus:ring-2 focus:ring-accent-blue/20"
                  >
                    <option value="ALL_MINE">100% Mine (They owe me all profit)</option>
                    <option value="ALL_FRIENDS">100% {sellingHolding.personName}'s</option>
                    <option value="SPLIT">Split Profit</option>
                  </select>
                </div>
                {sellForm.profitMode === 'SPLIT' && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-text-primary">My Profit Share (%)</label>
                    <Input 
                      type="number" min="0" max="100"
                      value={sellForm.profitSplitRatio}
                      onChange={e => setSellForm({...sellForm, profitSplitRatio: Number(e.target.value)})}
                    />
                  </div>
                )}
                <div className="space-y-1.5 pt-2 border-t border-black/5">
                  <label className="text-sm font-medium text-text-primary">Proceeds Destination</label>
                  <select 
                    value={sellForm.proceedsDestination}
                    onChange={e => setSellForm({...sellForm, proceedsDestination: e.target.value as any})}
                    className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-text-primary focus:border-accent-blue focus:outline-none focus:ring-2 focus:ring-accent-blue/20"
                  >
                    <option value="FRIEND_BALANCE">Keep in {sellingHolding.personName}'s Balance</option>
                    <option value="BANK_ACCOUNT">Transferred to my Bank immediately</option>
                  </select>
                </div>
                {sellForm.proceedsDestination === 'BANK_ACCOUNT' && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-text-primary">Receive Money In</label>
                    <select 
                      required
                      value={sellForm.targetBankAccountId}
                      onChange={e => setSellForm({...sellForm, targetBankAccountId: Number(e.target.value)})}
                      className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-text-primary focus:border-accent-blue focus:outline-none focus:ring-2 focus:ring-accent-blue/20"
                    >
                      <option value={0}>Select Bank Account</option>
                      {bankAccounts?.map(b => (
                        <option key={b.id} value={b.id}>{b.bankName} - {b.accountName}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {sellingHolding.isSelf && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-primary">UTR Number (Optional)</label>
                <Input 
                  value={sellForm.utr}
                  onChange={e => setSellForm({...sellForm, utr: e.target.value})}
                  placeholder="Bank reference number"
                />
              </div>
            )}
            
            <div className="rounded-lg bg-bg-secondary p-4 mt-2">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-text-secondary">Gross Sale</span>
                <span className="font-medium">₹{(sellForm.sharesToSell * sellForm.sellPrice).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-text-secondary">Charges</span>
                <span className="font-medium text-accent-red">-₹{sellForm.charges.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-sm mb-3">
                <span className="text-text-secondary">Cost of Sold Shares</span>
                <span className="font-medium">-₹{(sellForm.sharesToSell * sellingHolding.averageCost).toLocaleString('en-IN', {maximumFractionDigits: 0})}</span>
              </div>
              <div className="flex justify-between border-t border-black/10 pt-2 font-semibold mb-2">
                <span>Total Realized P&L</span>
                <span className={(sellForm.sharesToSell * sellForm.sellPrice - sellForm.charges - sellForm.sharesToSell * sellingHolding.averageCost) >= 0 ? 'text-accent-green' : 'text-accent-red'}>
                  ₹{(sellForm.sharesToSell * sellForm.sellPrice - sellForm.charges - sellForm.sharesToSell * sellingHolding.averageCost).toLocaleString('en-IN', {maximumFractionDigits: 0})}
                </span>
              </div>
              {!sellingHolding.isSelf && (
                <div className="bg-bg-primary rounded border border-black/5 p-2 mt-2 space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-text-secondary">Our Profit Share</span>
                    <span className="text-accent-green">
                      ₹{(() => {
                        const pnl = (sellForm.sharesToSell * sellForm.sellPrice - sellForm.charges - sellForm.sharesToSell * sellingHolding.averageCost);
                        if (sellForm.profitMode === 'ALL_MINE') return pnl.toLocaleString('en-IN', {maximumFractionDigits: 0});
                        if (sellForm.profitMode === 'ALL_FRIENDS') return '0';
                        return (pnl * (sellForm.profitSplitRatio / 100)).toLocaleString('en-IN', {maximumFractionDigits: 0});
                      })()}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-text-secondary">Amount Returned to Us</span>
                    <span className="text-text-primary font-bold">
                      ₹{(() => {
                        const cost = sellForm.sharesToSell * sellingHolding.averageCost;
                        const pnl = (sellForm.sharesToSell * sellForm.sellPrice - sellForm.charges - cost);
                        let ourPnl = pnl;
                        if (sellForm.profitMode === 'ALL_FRIENDS') ourPnl = 0;
                        if (sellForm.profitMode === 'SPLIT') ourPnl = pnl * (sellForm.profitSplitRatio / 100);
                        return (cost + ourPnl).toLocaleString('en-IN', {maximumFractionDigits: 0});
                      })()}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-black/5">
              <Button type="button" variant="ghost" onClick={() => setSellingHolding(null)}>Cancel</Button>
              <Button type="submit" variant="primary">Confirm Sale</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
