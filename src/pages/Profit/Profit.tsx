import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { mapSale, mapIpo, mapPerson } from '../../lib/mappers';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { TrendingUp, TrendingDown, DollarSign, ArrowUpRight, ArrowDownRight, Filter, Search, Receipt } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { motion } from 'framer-motion';
import { Pagination } from '../../components/ui/Pagination';
import { useAuth } from '../../contexts/AuthContext';
import { BlurOverlay } from '../../components/ui/BlurOverlay';

export const Profit: React.FC = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  const { data: salesData, isLoading } = useQuery({
    queryKey: ['salesData'],
    queryFn: async () => {
      const [
        { data: sData },
        { data: iData },
        { data: pData }
      ] = await Promise.all([
        supabase.from('sales').select('*').order('date', { ascending: false }),
        supabase.from('ipos').select('*'),
        supabase.from('people').select('*')
      ]);

      const sales = (sData || []).map(mapSale);
      const ipos = (iData || []).map(mapIpo);
      const people = (pData || []).map(mapPerson);

      return sales.map(sale => {
        let ipoName = 'Unknown IPO';
        let personName = 'Unknown Person';
        let symbol = 'N/A';
        
        if (sale.ipoId) {
          const ipo = ipos.find(i => i.id === sale.ipoId);
          if (ipo) {
            ipoName = ipo.ipoName;
            symbol = ipo.symbol;
          }
        }
        
        if (sale.personId) {
          const person = people.find(p => p.id === sale.personId);
          if (person) {
            personName = person.fullName;
          }
        }
        
        return {
          ...sale,
          ipoName,
          symbol,
          personName,
        };
      });
    }
  });

  const filteredSales = salesData?.filter(sale => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      sale.ipoName.toLowerCase().includes(searchLower) ||
      sale.personName.toLowerCase().includes(searchLower) ||
      sale.symbol.toLowerCase().includes(searchLower)
    );
  }) || [];

  const paginatedSales = filteredSales.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const formatCurrency = (val: number = 0) => 
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  };

  const totalRealizedProfit = salesData?.reduce((acc, curr) => acc + curr.realizedPnL, 0) || 0;
  const totalCharges = salesData?.reduce((acc, curr) => acc + curr.charges, 0) || 0;
  const netProfit = totalRealizedProfit - totalCharges;

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
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Profit & Loss</h1>
          <p className="mt-1 text-text-secondary">Review your realized gains and losses from sold holdings.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" icon={<Receipt size={16} />} disabled={!user}>Download Tax Report</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card className="flex flex-col justify-center border-black/5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-text-secondary">
            Gross Realized P&L
          </div>
          <BlurOverlay blurLevel="blur-md">
            <div className={`text-3xl font-bold tracking-tight ${totalRealizedProfit >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
              {totalRealizedProfit >= 0 ? '+' : ''}{formatCurrency(totalRealizedProfit)}
            </div>
          </BlurOverlay>
        </Card>

        <Card className="flex flex-col justify-center border-black/5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-text-secondary">
            Total Charges
          </div>
          <BlurOverlay blurLevel="blur-md">
            <div className="text-3xl font-bold tracking-tight text-accent-orange">
              -{formatCurrency(totalCharges)}
            </div>
          </BlurOverlay>
        </Card>

        <Card className={`flex flex-col justify-center border-black/5 shadow-sm relative overflow-hidden ${netProfit >= 0 ? 'bg-accent-green/5' : 'bg-accent-red/5'}`}>
          <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-10 ${netProfit >= 0 ? 'bg-accent-green' : 'bg-accent-red'}`} />
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-text-secondary">
            Net Realized P&L
          </div>
          <BlurOverlay blurLevel="blur-md">
            <div className={`flex items-end gap-3 text-3xl font-bold tracking-tight relative z-10 ${netProfit >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
              {netProfit >= 0 ? '+' : ''}{formatCurrency(netProfit)}
              {netProfit >= 0 ? <TrendingUp size={24} className="mb-1 opacity-50" /> : <TrendingDown size={24} className="mb-1 opacity-50" />}
            </div>
          </BlurOverlay>
        </Card>
      </div>

      <div>
        <div className="flex flex-col gap-4 border-b border-black/5 pb-4 mb-6 md:flex-row md:items-center md:justify-between">
          <h2 className="text-lg font-semibold text-text-primary">Recent Sales Transactions</h2>
          <div className="flex flex-col sm:flex-row flex-1 items-stretch sm:items-center gap-3 w-full sm:w-auto md:justify-end">
            <Input 
              icon={<Search size={16} />} 
              placeholder="Search sales..." 
              className="w-full sm:max-w-[200px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Button variant="outline" size="sm" icon={<Filter size={14} />} className="w-full sm:w-auto">Filter</Button>
          </div>
        </div>

        {paginatedSales.length === 0 ? (
          <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed border-2 bg-transparent shadow-none">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-bg-secondary text-text-tertiary mb-4">
              <DollarSign size={32} />
            </div>
            <h3 className="text-lg font-semibold text-text-primary mb-2">No Sale Transactions</h3>
            <p className="text-text-secondary max-w-sm">
              Sell your allotted IPOs to realize profits and see them tracked here.
            </p>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedSales.map((sale, index) => {
                const isProfit = sale.realizedPnL >= 0;
              return (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  key={sale.id}
                >
                  <Card className="h-full flex flex-col hover:shadow-md transition-shadow group">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="text-xs font-medium text-text-tertiary mb-1">{formatDate(sale.date)}</div>
                        <h3 className="text-base font-semibold tracking-tight text-text-primary leading-tight line-clamp-1" title={sale.ipoName}>
                          {sale.ipoName}
                        </h3>
                        <p className="text-xs font-medium text-text-secondary mt-1">
                          {sale.personName}
                        </p>
                      </div>
                      <Badge variant={isProfit ? 'success' : 'danger'} className="shrink-0 flex items-center gap-1 font-semibold text-sm">
                        {isProfit ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                        <BlurOverlay blurLevel="blur-sm">
                          <span>{formatCurrency(Math.abs(sale.realizedPnL))}</span>
                        </BlurOverlay>
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-y-4 gap-x-2 mb-4 flex-1 bg-bg-secondary/30 rounded-xl p-3">
                      <div>
                        <p className="text-xs font-medium text-text-tertiary mb-0.5">Shares Sold</p>
                        <BlurOverlay blurLevel="blur-sm">
                          <p className="text-sm font-semibold text-text-primary">{sale.sharesSold}</p>
                        </BlurOverlay>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-text-tertiary mb-0.5">Sell Price</p>
                        <BlurOverlay blurLevel="blur-sm">
                          <p className="text-sm font-semibold text-text-primary">{formatCurrency(sale.sellPrice)}</p>
                        </BlurOverlay>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-text-tertiary mb-0.5">Sale Value</p>
                        <BlurOverlay blurLevel="blur-sm">
                          <p className="text-sm font-semibold text-text-primary">{formatCurrency(sale.sharesSold * sale.sellPrice)}</p>
                        </BlurOverlay>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-text-tertiary mb-0.5">Charges</p>
                        <BlurOverlay blurLevel="blur-sm">
                          <p className="text-sm font-semibold text-accent-orange">{formatCurrency(sale.charges)}</p>
                        </BlurOverlay>
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
              totalItems={filteredSales.length}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>
    </div>
  );
};
