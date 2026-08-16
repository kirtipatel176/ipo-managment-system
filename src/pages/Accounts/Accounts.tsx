import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Building, MoreHorizontal, Landmark, CreditCard, ArrowRight, Edit2, Trash2 } from 'lucide-react';
import { db } from '../../db/schema';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { TransactionEngine } from '../../engine/TransactionEngine';
import { motion } from 'framer-motion';
import { Pagination } from '../../components/ui/Pagination';
import { Search } from 'lucide-react';

export const Accounts: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 11;
  const [newAccount, setNewAccount] = useState({
    bankName: '',
    accountName: '',
    last4Digits: '',
    openingBalance: 0,
  });

  const openAddModal = () => {
    setEditingId(null);
    setNewAccount({ bankName: '', accountName: '', last4Digits: '', openingBalance: 0 });
    setIsModalOpen(true);
  };

  const openEditModal = (account: any) => {
    setEditingId(account.id!);
    setNewAccount({
      bankName: account.bankName,
      accountName: account.accountName,
      last4Digits: account.last4Digits || '',
      openingBalance: account.openingBalance || 0,
    });
    setIsModalOpen(true);
  };

  const accountsData = useLiveQuery(async () => {
    const banks = await db.bankAccounts.filter(b => b.isActive).toArray();
    const balances = await Promise.all(banks.map(b => TransactionEngine.getBankBalance(b.id!)));
    
    return banks.map(b => {
      const bal = balances.find(x => x.accountId === b.id);
      return { ...b, computed: bal };
    });
  }, []);

  const filteredAccounts = accountsData?.filter(acc => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      acc.bankName.toLowerCase().includes(searchLower) ||
      acc.accountName.toLowerCase().includes(searchLower) ||
      acc.last4Digits?.toLowerCase().includes(searchLower)
    );
  }) || [];

  const paginatedAccounts = filteredAccounts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccount.bankName || !newAccount.accountName) return;

    if (editingId) {
      await db.bankAccounts.update(editingId, {
        bankName: newAccount.bankName,
        accountName: newAccount.accountName,
        last4Digits: newAccount.last4Digits,
        openingBalance: newAccount.openingBalance,
        updatedAt: new Date().toISOString()
      });
    } else {
      await db.bankAccounts.add({
        ...newAccount,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    setIsModalOpen(false);
    setEditingId(null);
    setNewAccount({ bankName: '', accountName: '', last4Digits: '', openingBalance: 0 });
  };

  const handleDeleteAccount = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this account?')) {
      await db.bankAccounts.update(id, {
        isActive: false,
        updatedAt: new Date().toISOString()
      });
    }
  };

  const formatCurrency = (val: number = 0) => 
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  const getBankGradient = (index: number) => {
    const gradients = [
      'from-blue-600 to-indigo-800',
      'from-emerald-500 to-teal-700',
      'from-purple-600 to-fuchsia-800',
      'from-orange-500 to-red-700',
      'from-slate-700 to-slate-900',
    ];
    return gradients[index % gradients.length];
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Bank Accounts</h1>
          <p className="mt-1 text-text-secondary">Manage your linked personal bank accounts.</p>
        </div>
        <div className="flex flex-1 items-center gap-3 justify-end">
          <Input 
            icon={<Search size={16} />} 
            placeholder="Search accounts..." 
            className="max-w-[200px]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Button variant="primary" icon={<Plus size={16} />} onClick={openAddModal}>Add Account</Button>
        </div>
      </div>

      {accountsData?.length === 0 && (
        <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed border-2 bg-transparent shadow-none">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-bg-secondary text-text-tertiary mb-4">
            <Landmark size={32} />
          </div>
          <h3 className="text-lg font-semibold text-text-primary mb-2">No Bank Accounts</h3>
          <p className="text-text-secondary max-w-sm mb-6">
            Add your first bank account to start tracking transactions and IPO applications.
          </p>
          <Button variant="primary" icon={<Plus size={16} />} onClick={openAddModal}>Add Account</Button>
        </Card>
      )}

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedAccounts.map((account, index) => (
            <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            key={account.id}
            className="group relative overflow-hidden rounded-2xl p-6 shadow-sm border border-black/5 hover:shadow-md transition-all cursor-pointer"
          >
            {/* Background Gradient */}
            <div className={`absolute inset-0 bg-gradient-to-br ${getBankGradient(index)} opacity-[0.85] group-hover:opacity-100 transition-opacity`} />
            
            {/* Glass overlay */}
            <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px]" />

            {/* Pattern overlay */}
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full border-4 border-white/10 mix-blend-overlay" />
            <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full border-4 border-white/10 mix-blend-overlay" />

            <div className="relative z-10 flex h-full flex-col justify-between">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm text-white shadow-sm">
                    <Building size={20} strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white tracking-tight">{account.accountName}</h3>
                    <p className="text-xs font-medium text-white/70">{account.bankName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={(e) => { e.stopPropagation(); openEditModal(account); }}
                    className="text-white/70 hover:text-white transition-colors h-8 w-8 flex items-center justify-center rounded-full hover:bg-white/10"
                    title="Edit Account"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDeleteAccount(account.id!); }}
                    className="text-white/70 hover:text-red-400 transition-colors h-8 w-8 flex items-center justify-center rounded-full hover:bg-white/10"
                    title="Delete Account"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <div className="mt-8 mb-6">
                <div className="flex items-center gap-3 text-white/90 font-mono tracking-[0.2em] text-lg">
                  <span>••••</span>
                  <span>••••</span>
                  <span>••••</span>
                  <span>{account.last4Digits || '0000'}</span>
                </div>
              </div>

              <div className="flex items-end justify-between pt-4 border-t border-white/20">
                <div>
                  <p className="text-xs font-medium text-white/70 mb-1">Available Balance</p>
                  <p className="text-2xl font-bold text-white tracking-tight">
                    {formatCurrency(account.computed?.availableBalance)}
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm group-hover:bg-white/20 transition-colors">
                  <ArrowRight size={18} />
                </div>
              </div>
            </div>
          </motion.div>
        ))}

        {accountsData && accountsData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: accountsData.length * 0.1 }}
            onClick={openAddModal}
            className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-black/10 bg-bg-secondary/50 p-6 text-text-tertiary transition-colors hover:border-accent-blue/50 hover:bg-accent-blue/5 hover:text-accent-blue cursor-pointer h-full min-h-[220px]"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm mb-4">
              <Plus size={24} />
            </div>
            <h3 className="font-semibold">Add New Account</h3>
            <p className="text-sm mt-1 text-center px-4">Connect another bank account to your portfolio.</p>
          </motion.div>
        )}
        </div>
        <Pagination 
          currentPage={currentPage}
          pageSize={pageSize}
          totalItems={filteredAccounts.length}
          onPageChange={setCurrentPage}
        />
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Edit Bank Account" : "Add Bank Account"}>
        <form onSubmit={handleSaveAccount} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-primary">Bank Name</label>
            <Input 
              icon={<Building size={16} />}
              value={newAccount.bankName} 
              onChange={e => setNewAccount({...newAccount, bankName: e.target.value})}
              placeholder="e.g. HDFC Bank, SBI"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-primary">Account Name / Nickname</label>
            <Input 
              value={newAccount.accountName} 
              onChange={e => setNewAccount({...newAccount, accountName: e.target.value})}
              placeholder="e.g. Main Savings"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-primary">Last 4 Digits (Optional)</label>
            <Input 
              icon={<CreditCard size={16} />}
              value={newAccount.last4Digits} 
              maxLength={4}
              onChange={e => setNewAccount({...newAccount, last4Digits: e.target.value})}
              placeholder="1234"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-primary">Opening Balance (₹)</label>
            <Input 
              type="number" 
              value={newAccount.openingBalance || ''} 
              onChange={e => setNewAccount({...newAccount, openingBalance: Number(e.target.value)})}
              placeholder="0.00"
            />
          </div>
          
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-black/5 mt-6">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Save Account</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
