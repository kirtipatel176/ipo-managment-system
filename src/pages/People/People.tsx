import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Search, Filter, User, Edit2, Trash2 } from 'lucide-react';
import { db } from '../../db/schema';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { motion } from 'framer-motion';
import { Pagination } from '../../components/ui/Pagination';
import { PersonDetailsModal } from './PersonDetailsModal';

export const People: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  
  const [newPerson, setNewPerson] = useState({
    fullName: '',
    panNumber: '',
    isSelf: false,
  });

  const openAddModal = () => {
    setEditingId(null);
    setNewPerson({ fullName: '', panNumber: '', isSelf: false });
    setIsModalOpen(true);
  };

  const openEditModal = (person: any) => {
    setEditingId(person.id!);
    setNewPerson({
      fullName: person.fullName,
      panNumber: person.panNumber || '',
      isSelf: person.isSelf || false,
    });
    setIsModalOpen(true);
  };

  const peopleData = useLiveQuery(async () => {
    const peopleList = await db.people.filter(p => p.isActive).toArray();
    
    const computedList = await Promise.all(peopleList.map(async p => {
      // Applications where this person is the applicant
      const applications = await db.applications.where('applicantPersonId').equals(p.id!).toArray();
      const applicationsCount = applications.length;
      
      // Demat accounts for this person
      const dematAccounts = await db.dematAccounts.where('holderPersonId').equals(p.id!).filter(d => d.isActive).toArray();

      // Active allocations
      const allocs = await db.allocations
        .filter(a => a.status === 'ACTIVE' && a.currentHolderType === 'PERSON' && a.currentHolderId === p.id!)
        .toArray();
      const ipoBlocked  = allocs.filter(a => a.purpose === 'IPO_BLOCKED').reduce((s, a) => s + a.amount, 0);
      const unallocated = allocs.filter(a => a.purpose === 'UNALLOCATED').reduce((s, a) => s + a.amount, 0);
      const invested    = allocs.filter(a => a.purpose === 'INVESTED').reduce((s, a) => s + a.amount, 0);
      const currentlyHeld = ipoBlocked + unallocated + invested;

      // Transactions
      const sentTxs   = await db.transactions.filter(t => t.status === 'COMPLETED' && t.toPersonId === p.id! && !!t.fromBankAccountId).toArray();
      const returnTxs = await db.transactions.filter(t => t.status === 'COMPLETED' && t.fromPersonId === p.id! && !!t.toBankAccountId).toArray();
      const totalSent     = sentTxs.reduce((s, t) => s + t.amount, 0);
      const moneyComeBack = returnTxs.reduce((s, t) => s + t.amount, 0);
      const pending = currentlyHeld;
      const status = pending === 0 ? 'Settled' : 'Active';

      return {
        ...p,
        applicationsCount,
        dematCount: dematAccounts.length,
        totalSent, moneyComeBack,
        ipoBlocked, unallocated, invested, currentlyHeld,
        pending, status,
      };
    }));

    return computedList;
  }, []);

  const filteredPeople = peopleData?.filter(person => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      person.fullName.toLowerCase().includes(searchLower) ||
      person.panNumber?.toLowerCase().includes(searchLower)
    );
  }) || [];

  const paginatedPeople = filteredPeople.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleSavePerson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPerson.fullName) return;

    if (editingId) {
      await db.people.update(editingId, {
        fullName: newPerson.fullName,
        panNumber: newPerson.panNumber,
        isSelf: newPerson.isSelf,
        updatedAt: new Date().toISOString()
      });
    } else {
      await db.people.add({
        ...newPerson,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    setIsModalOpen(false);
    setEditingId(null);
    setNewPerson({ fullName: '', panNumber: '', isSelf: false });
  };

  const handleDeletePerson = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this person?')) {
      await db.people.update(id, {
        isActive: false,
        updatedAt: new Date().toISOString()
      });
    }
  };

  const formatCurrency = (val: number = 0) => 
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Money With People</h1>
          <p className="mt-1 text-text-secondary">Manage friends and their allocated IPO balances.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="primary" icon={<Plus size={16} />} onClick={openAddModal}>Add Person</Button>
        </div>
      </div>

      <Card noPadding className="overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-black/5 p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 items-center gap-3">
            <Input 
              icon={<Search size={16} />} 
              placeholder="Search Name, PAN, Demat ID..." 
              className="max-w-md"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Button variant="outline" size="sm" icon={<Filter size={14} />}>Filters</Button>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Person</TableHead>
              <TableHead>PAN / Demat</TableHead>
              <TableHead className="text-right">Total Sent</TableHead>
              <TableHead className="text-right">Money Come Back</TableHead>
              <TableHead className="text-right">IPO Blocked</TableHead>
              <TableHead className="text-right">Pending</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedPeople.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-text-secondary">
                  No people found.
                </TableCell>
              </TableRow>
            )}
            {paginatedPeople.map((person, i) => (
              <motion.tr 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: i * 0.02 }}
                key={person.id}
                className="group border-b border-black/5 transition-colors hover:bg-bg-secondary/50 cursor-pointer"
                onClick={() => setSelectedPersonId(person.id!)}
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-blue/10 text-sm font-semibold text-accent-blue">
                      {person.fullName.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-text-primary flex items-center gap-2">
                        {person.fullName}
                        {person.isSelf && <Badge variant="info" className="text-[10px] py-0">Self</Badge>}
                      </div>
                      <div className="text-xs text-text-tertiary mt-0.5">{person.applicationsCount} application{person.applicationsCount !== 1 ? 's' : ''} · {person.dematCount ?? 0} demat</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="font-mono text-xs text-text-primary">{person.panNumber || '—'}</div>
                  <div className="text-xs text-text-tertiary mt-0.5">{(person as any).dematCount ?? 0} demat account{((person as any).dematCount ?? 0) !== 1 ? 's' : ''}</div>
                </TableCell>
                {/* Total Sent */}
                <TableCell className="text-right">
                  <span className="font-medium text-text-primary">
                    {person.totalSent > 0 ? formatCurrency(person.totalSent) : <span className="text-text-tertiary">—</span>}
                  </span>
                </TableCell>
                {/* Money Come Back */}
                <TableCell className="text-right">
                  <span className="font-medium text-accent-green">
                    {person.moneyComeBack > 0 ? formatCurrency(person.moneyComeBack) : <span className="text-text-tertiary">—</span>}
                  </span>
                </TableCell>
                {/* IPO Blocked */}
                <TableCell className="text-right">
                  <span className={`font-medium ${person.ipoBlocked > 0 ? 'text-accent-orange' : 'text-text-tertiary'}`}>
                    {person.ipoBlocked > 0 ? formatCurrency(person.ipoBlocked) : '—'}
                  </span>
                </TableCell>
                {/* Pending */}
                <TableCell className="text-right">
                  {person.pending > 0 ? (
                    <span className="font-bold text-accent-red">{formatCurrency(person.pending)}</span>
                  ) : (
                    <span className="text-text-tertiary">₹0</span>
                  )}
                </TableCell>
                {/* Status */}
                <TableCell className="text-center">
                  <Badge variant={person.status === 'Active' ? 'warning' : 'success'}>
                    {person.status === 'Active' ? 'Pending' : 'Settled'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => { e.stopPropagation(); openEditModal(person); }}
                      className="text-text-tertiary hover:text-accent-blue transition-colors h-8 w-8 flex items-center justify-center rounded-full hover:bg-accent-blue/10"
                      title="Edit Person"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDeletePerson(person.id!); }}
                      className="text-text-tertiary hover:text-accent-red transition-colors h-8 w-8 flex items-center justify-center rounded-full hover:bg-accent-red/10"
                      title="Delete Person"
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
          totalItems={filteredPeople.length}
          onPageChange={setCurrentPage}
        />
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Edit Person" : "Add Person"}>
        <form onSubmit={handleSavePerson} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-primary">Full Name</label>
            <Input 
              icon={<User size={16} />}
              value={newPerson.fullName} 
              onChange={e => setNewPerson({...newPerson, fullName: e.target.value})}
              required
              placeholder="e.g. Ashish Patel"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-primary">PAN Card (Optional)</label>
            <Input 
              value={newPerson.panNumber} 
              onChange={e => setNewPerson({...newPerson, panNumber: e.target.value})}
              style={{ textTransform: 'uppercase' }}
              placeholder="ABCDE1234F"
            />
          </div>
          <div className="flex items-center gap-3 p-3 bg-bg-secondary rounded-xl">
            <input
              type="checkbox"
              id="isSelf"
              checked={newPerson.isSelf}
              onChange={e => setNewPerson({...newPerson, isSelf: e.target.checked})}
              className="rounded"
            />
            <label htmlFor="isSelf" className="text-sm text-text-primary cursor-pointer">
              This is me (Self) — own money, own Demat applications
            </label>
          </div>
          
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-black/5 mt-6">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Save Person</Button>
          </div>
        </form>
      </Modal>

      <PersonDetailsModal 
        isOpen={selectedPersonId !== null} 
        onClose={() => setSelectedPersonId(null)} 
        personId={selectedPersonId} 
      />
    </div>
  );
};
