import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/schema';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { PieChart, Briefcase, TrendingUp, ArrowUpRight, ArrowDownRight, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { Pagination } from '../../components/ui/Pagination';

export const Holdings: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;
  const holdingsData = useLiveQuery(async () => {
    const holdings = await db.holdings.toArray();
    const result = [];
    
    for (const holding of holdings) {
      const ipo = await db.ipos.get(holding.ipoId);
      const person = await db.people.get(holding.personId);
      
      result.push({
        ...holding,
        ipoName: ipo?.ipoName || 'Unknown IPO',
        symbol: ipo?.symbol || 'N/A',
        personName: person?.fullName || 'Unknown Person',
      });
    }
    
    return result;
  }, []);

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

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Portfolio Holdings</h1>
          <p className="mt-1 text-text-secondary">Track your active IPO investments and unrealized gains.</p>
        </div>
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
          <div className="flex items-center gap-3">
            <Input 
              icon={<Search size={16} />} 
              placeholder="Search holdings..." 
              className="max-w-[200px]"
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
                        <p className="text-sm font-semibold text-text-primary">{holding.shares} <span className="text-xs font-normal text-text-secondary">shares</span></p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-text-tertiary mb-1">Avg. Cost</p>
                        <p className="text-sm font-semibold text-text-primary">{formatCurrency(holding.averageCost)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-text-tertiary mb-1">Invested</p>
                        <p className="text-sm font-semibold text-text-primary">{formatCurrency(holding.shares * holding.averageCost)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-text-tertiary mb-1">Current Price</p>
                        <p className="text-sm font-semibold text-text-primary">{formatCurrency(holding.currentPrice)}</p>
                      </div>
                    </div>

                    <div className="mt-auto pt-4 border-t border-black/5 flex items-end justify-between">
                      <div>
                        <p className="text-xs font-medium text-text-tertiary mb-1">Current Value</p>
                        <p className="text-lg font-bold text-text-primary tracking-tight">{formatCurrency(holding.currentValue)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium text-text-tertiary mb-1">P&L</p>
                        <p className={`text-sm font-bold ${isProfit ? 'text-accent-green' : 'text-accent-red'}`}>
                          {isProfit ? '+' : ''}{formatCurrency(holding.unrealizedProfit)}
                        </p>
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
    </div>
  );
};
