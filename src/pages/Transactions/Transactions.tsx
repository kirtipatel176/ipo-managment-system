import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { mapTransaction, mapIpo, mapBankAccount, mapPerson } from '../../lib/mappers';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Search, Filter, Download, ArrowUpRight, ArrowDownLeft, RefreshCcw, Edit2, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Pagination } from '../../components/ui/Pagination';
import { Modal } from '../../components/ui/Modal';
import { AddTransactionModal } from './AddTransactionModal';
import { TransactionDetailsModal } from './TransactionDetailsModal';

export const Transactions: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedTx, setSelectedTx] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      const [
        { data: tData },
        { data: iData },
        { data: bData },
        { data: pData }
      ] = await Promise.all([
        supabase.from('transactions').select('*').order('created_at', { ascending: false }),
        supabase.from('ipos').select('*'),
        supabase.from('bank_accounts').select('*'),
        supabase.from('people').select('*')
      ]);

      const txs = (tData || []).map(mapTransaction);
      const ipos = (iData || []).map(mapIpo);
      const banks = (bData || []).map(mapBankAccount);
      const people = (pData || []).map(mapPerson);

      return txs.map(tx => {
        let ipoName = '-';
        let fromName = '-';
        let toName = '-';

        if (tx.ipoId) {
          const ipo = ipos.find(i => i.id === tx.ipoId);
          if (ipo) ipoName = ipo.ipoName;
        }

        if (tx.fromBankAccountId) {
          const bank = banks.find(b => b.id === tx.fromBankAccountId);
          if (bank) fromName = bank.bankName;
        } else if (tx.fromPersonId) {
          const person = people.find(p => p.id === tx.fromPersonId);
          if (person) fromName = person.fullName;
        }

        if (tx.toBankAccountId) {
          const bank = banks.find(b => b.id === tx.toBankAccountId);
          if (bank) toName = bank.bankName;
        } else if (tx.toPersonId) {
          const person = people.find(p => p.id === tx.toPersonId);
          if (person) toName = person.fullName;
        }

        return { ...tx, ipoName, fromName, toName };
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (tx: any) => {
      await supabase.from('transactions').update({
        notes: tx.notes || null,
        utr: tx.utr || null,
        updated_at: new Date().toISOString()
      }).eq('id', tx.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setIsEditModalOpen(false);
      setEditingTx(null);
    }
  });

  const filteredTransactions = transactions?.filter(tx => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      (tx.utr && tx.utr.toLowerCase().includes(searchLower)) ||
      (tx.ipoName && tx.ipoName.toLowerCase().includes(searchLower)) ||
      (tx.fromName && tx.fromName.toLowerCase().includes(searchLower)) ||
      (tx.toName && tx.toName.toLowerCase().includes(searchLower)) ||
      (tx.amount && tx.amount.toString().includes(searchLower))
    );
  }) || [];

  const paginatedTransactions = filteredTransactions.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const openEditModal = (tx: any) => {
    setEditingTx({ ...tx });
    setIsEditModalOpen(true);
  };

  const handleUpdateTx = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx || !editingTx.id) return;
    updateMutation.mutate(editingTx);
  };

  const handleDeleteTx = () => {
    alert('Transactions cannot be deleted directly to maintain ledger integrity. Please process a counter-transaction (like a refund) if a correction is needed.');
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'success';
      case 'PENDING': return 'warning';
      case 'FAILED': return 'danger';
      default: return 'default';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'MONEY_SENT': return <ArrowUpRight size={16} className="text-accent-orange" />;
      case 'MONEY_RECEIVED': return <ArrowDownLeft size={16} className="text-accent-green" />;
      default: return <RefreshCcw size={16} className="text-accent-blue" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent-blue/20 border-t-accent-blue" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Transactions Ledger</h1>
          <p className="mt-1 text-text-secondary">The single source of truth for all money movements.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" icon={<Download size={16} />}>Export</Button>
          <Button variant="primary" icon={<ArrowUpRight size={16} />} onClick={() => setIsModalOpen(true)}>Add Transaction</Button>
        </div>
      </div>

      <Card noPadding className="overflow-hidden">
        {/* Filter Bar */}
        <div className="flex flex-col gap-4 border-b border-black/5 p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 items-center gap-3">
            <Input
              icon={<Search size={16} />}
              placeholder="Search UTR, Person, IPO, Amount..."
              className="w-full md:max-w-md"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="hidden items-center gap-2 md:flex">
              <Button variant="outline" size="sm" icon={<Filter size={14} />}>More Filters</Button>
            </div>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            {searchTerm && (
              <>
                <div className="flex items-center gap-1 rounded-full bg-accent-blue/10 px-3 py-1 text-xs font-medium text-accent-blue">
                  <span>Search: {searchTerm}</span>
                  <button className="ml-1 hover:text-accent-blue/70" onClick={() => setSearchTerm('')}>&times;</button>
                </div>
                <button
                  className="whitespace-nowrap px-2 text-xs font-medium text-text-secondary hover:text-text-primary"
                  onClick={() => setSearchTerm('')}
                >
                  Clear all
                </button>
              </>
            )}
          </div>
        </div>

        {/* Table */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date & UTR</TableHead>
              <TableHead className="hidden md:table-cell">Type</TableHead>
              <TableHead className="hidden sm:table-cell">From &rarr; To</TableHead>
              <TableHead className="hidden md:table-cell">IPO</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedTransactions.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-text-secondary">
                  No transactions found.
                </TableCell>
              </TableRow>
            )}
            {paginatedTransactions.map((tx, i) => (
              <motion.tr
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: i * 0.02 }}
                key={tx.id}
                className="group border-b border-black/5 transition-colors hover:bg-bg-secondary/50 cursor-pointer"
                onClick={() => setSelectedTx(tx)}
              >
                <TableCell>
                  <div className="font-medium text-text-primary">{new Date(tx.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</div>
                  <div className="font-mono text-xs text-text-tertiary">{tx.utr || '—'}</div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-bg-secondary">
                      {getTypeIcon(tx.transactionType)}
                    </div>
                    <span className="text-sm font-medium text-text-primary">
                      {tx.transactionType.replace(/_/g, ' ')}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-text-primary">{tx.fromName}</span>
                    <span className="text-text-tertiary">&rarr;</span>
                    <span className="font-medium text-text-primary">{tx.toName}</span>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <span className="text-sm text-text-secondary">{tx.ipoName}</span>
                </TableCell>
                <TableCell className="text-right">
                  <span className="font-semibold text-text-primary">
                    {formatCurrency(tx.amount)}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusVariant(tx.status) as any}>{tx.status}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); openEditModal(tx); }}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-text-tertiary transition-all hover:bg-accent-blue/10 hover:text-accent-blue"
                      title="Edit Metadata"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteTx(); }}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-text-tertiary transition-all hover:bg-accent-red/10 hover:text-accent-red"
                      title="Delete Transaction"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </TableCell>
              </motion.tr>
            ))}
          </TableBody>
        </Table>

        <Pagination
          currentPage={currentPage}
          pageSize={pageSize}
          totalItems={filteredTransactions.length}
          onPageChange={setCurrentPage}
        />
      </Card>

      <AddTransactionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      <TransactionDetailsModal isOpen={!!selectedTx} onClose={() => setSelectedTx(null)} transaction={selectedTx} />

      {/* Edit Transaction Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => { setIsEditModalOpen(false); setEditingTx(null); }} title="Edit Transaction Details">
        {editingTx && (
          <form onSubmit={handleUpdateTx} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-primary">Reference / UTR (Optional)</label>
              <Input
                value={editingTx.utr || ''}
                onChange={e => setEditingTx({ ...editingTx, utr: e.target.value })}
                placeholder="e.g. UTR123456"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-primary">Notes (Optional)</label>
              <Input
                value={editingTx.notes || ''}
                onChange={e => setEditingTx({ ...editingTx, notes: e.target.value })}
                placeholder="Add any tracking notes..."
              />
            </div>
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-black/5 mt-6">
              <Button type="button" variant="ghost" onClick={() => { setIsEditModalOpen(false); setEditingTx(null); }}>Cancel</Button>
              <Button type="submit" variant="primary">Save Changes</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
