import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Search, Filter, Edit2, Calendar, AlertCircle, Trash2 } from 'lucide-react';
import { db } from '../../db/schema';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { motion } from 'framer-motion';
import { Pagination } from '../../components/ui/Pagination';

export const IPOMaster: React.FC = () => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingIpo, setEditingIpo] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  
  const [newIpo, setNewIpo] = useState({
    ipoName: '',
    companyName: '',
    symbol: '',
    pricePerShare: 0,
    lotSize: 0,
    minimumLots: 1,
    maximumLots: 13,
    openDate: '',
    closeDate: '',
    allotmentDate: '',
    refundDate: '',
    listingDate: '',
    status: 'UPCOMING'
  });

  const ipos = useLiveQuery(() => db.ipos.toArray(), []);

  const filteredIpos = ipos?.filter(ipo => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      ipo.ipoName.toLowerCase().includes(searchLower) ||
      ipo.companyName?.toLowerCase().includes(searchLower) ||
      ipo.symbol?.toLowerCase().includes(searchLower)
    );
  }) || [];

  const paginatedIpos = filteredIpos.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Auto-update IPO statuses based on dates
  React.useEffect(() => {
    if (!ipos) return;

    const updateStatuses = async () => {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const today = now.getTime();

      const parseDate = (d: string) => {
        if (!d) return 0;
        const date = new Date(d);
        date.setHours(0, 0, 0, 0);
        return date.getTime();
      };

      const updates: { id: number; status: string }[] = [];

      ipos.forEach(ipo => {
        if (!ipo.id || ipo.status === 'COMPLETED') return;

        const open = parseDate(ipo.openDate);
        const close = parseDate(ipo.closeDate);
        const allot = parseDate(ipo.allotmentDate);
        const list = parseDate(ipo.listingDate);

        let expectedStatus = ipo.status;

        if (open > 0 && today < open) {
          expectedStatus = 'UPCOMING';
        } else if (open > 0 && close > 0 && today >= open && today <= close) {
          expectedStatus = 'OPEN';
        } else if (close > 0 && today > close && (allot === 0 || today < allot)) {
          expectedStatus = 'CLOSED';
        } else if (allot > 0 && today >= allot && (list === 0 || today < list)) {
          // If we passed allotment date but haven't reached listing date
          // Only auto-update if it's still in an earlier phase. 
          // This prevents overriding manual statuses like 'ALLOTTED' or 'NOT_ALLOTTED'
          if (['UPCOMING', 'OPEN', 'CLOSED'].includes(ipo.status)) {
            expectedStatus = 'ALLOTMENT_PENDING';
          }
        } else if (list > 0 && today >= list) {
          expectedStatus = 'LISTED';
        }

        if (expectedStatus !== ipo.status) {
          updates.push({ id: ipo.id, status: expectedStatus });
        }
      });

      if (updates.length > 0) {
        await Promise.all(updates.map(u => db.ipos.update(u.id, { status: u.status as any })));
      }
    };

    updateStatuses();
  }, [ipos]);

  const handleAddIpo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIpo.ipoName || !newIpo.pricePerShare || !newIpo.lotSize) return;

    await db.ipos.add({
      ...newIpo,
      status: (newIpo as any).status || 'UPCOMING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    setIsAddModalOpen(false);
    setNewIpo({
      ipoName: '', companyName: '', symbol: '',
      pricePerShare: 0, lotSize: 0, minimumLots: 1, maximumLots: 13,
      openDate: '', closeDate: '', allotmentDate: '', refundDate: '', listingDate: '',
      status: 'UPCOMING'
    });
  };

  const handleUpdateIpo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIpo || !editingIpo.id) return;
    
    await db.ipos.update(editingIpo.id, {
      ...editingIpo,
      updatedAt: new Date().toISOString()
    });
    
    setIsEditModalOpen(false);
    setEditingIpo(null);
  };

  const openEditModal = (ipo: any) => {
    setEditingIpo({ ...ipo });
    setIsEditModalOpen(true);
  };

  const handleDeleteIpo = async (ipo: any) => {
    const apps = await db.applications.where('ipoId').equals(ipo.id!).toArray();
    if (apps.length > 0) {
      alert(`Cannot delete IPO. There are ${apps.length} applications linked to it.`);
      return;
    }
    if (window.confirm('Are you sure you want to delete this IPO?')) {
      await db.ipos.delete(ipo.id!);
    }
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  const getStatusVariant = (status: string) => {
    switch(status) {
      case 'OPEN': return 'success';
      case 'UPCOMING': return 'info';
      case 'CLOSED': return 'warning';
      case 'ALLOTMENT_DONE': return 'default';
      case 'LISTED': return 'default';
      default: return 'default';
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">IPO Master</h1>
          <p className="mt-1 text-text-secondary">Central repository for all IPOs.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="primary" icon={<Plus size={16} />} onClick={() => setIsAddModalOpen(true)}>Add IPO</Button>
        </div>
      </div>

      <Card noPadding className="overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-black/5 p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 items-center gap-3">
            <Input 
              icon={<Search size={16} />} 
              placeholder="Search IPO name, company, symbol..." 
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
              <TableHead>IPO Name</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Lot Size</TableHead>
              <TableHead>Investment/Lot</TableHead>
              <TableHead>Timeline</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedIpos.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-text-secondary">
                  No IPOs found.
                </TableCell>
              </TableRow>
            )}
            {paginatedIpos.map((ipo, i) => (
              <motion.tr 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: i * 0.02 }}
                key={ipo.id}
                className="group border-b border-black/5 transition-colors hover:bg-bg-secondary/50 cursor-pointer"
              >
                <TableCell>
                  <div className="font-semibold text-text-primary">{ipo.ipoName}</div>
                  <div className="text-xs text-text-secondary">{ipo.symbol || ipo.companyName}</div>
                </TableCell>
                <TableCell className="font-medium text-text-primary">{formatCurrency(ipo.pricePerShare)}</TableCell>
                <TableCell className="text-text-primary">{ipo.lotSize} shares</TableCell>
                <TableCell className="font-semibold text-text-primary">{formatCurrency(ipo.pricePerShare * ipo.lotSize)}</TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1 text-xs">
                    <div className="flex items-center gap-1 text-text-primary">
                      <span className="w-12 text-text-tertiary">Open:</span> 
                      {ipo.openDate ? new Date(ipo.openDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : 'TBA'}
                    </div>
                    <div className="flex items-center gap-1 text-text-secondary">
                      <span className="w-12 text-text-tertiary">Allot:</span> 
                      {ipo.allotmentDate ? new Date(ipo.allotmentDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : 'TBA'}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusVariant(ipo.status) as any}>{ipo.status.replace('_', ' ')}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => { e.stopPropagation(); openEditModal(ipo); }}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-text-tertiary transition-all hover:bg-accent-blue/10 hover:text-accent-blue"
                      title="Edit IPO"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDeleteIpo(ipo); }}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-text-tertiary transition-all hover:bg-accent-red/10 hover:text-accent-red"
                      title="Delete IPO"
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
          totalItems={filteredIpos.length}
          onPageChange={setCurrentPage}
        />
      </Card>

      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add New IPO">
        <form onSubmit={handleAddIpo} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="col-span-1 md:col-span-2 space-y-1.5">
              <label className="text-sm font-medium text-text-primary">IPO Name (Display Name)</label>
              <Input value={newIpo.ipoName} onChange={e => setNewIpo({...newIpo, ipoName: e.target.value})} required />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-primary">Company Name</label>
              <Input value={newIpo.companyName} onChange={e => setNewIpo({...newIpo, companyName: e.target.value})} />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-primary">Symbol</label>
              <Input value={newIpo.symbol} onChange={e => setNewIpo({...newIpo, symbol: e.target.value})} />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-primary">Price Per Share (₹)</label>
              <Input type="number" value={newIpo.pricePerShare || ''} onChange={e => setNewIpo({...newIpo, pricePerShare: Number(e.target.value)})} required />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-primary">Lot Size (Shares)</label>
              <Input type="number" value={newIpo.lotSize || ''} onChange={e => setNewIpo({...newIpo, lotSize: Number(e.target.value)})} required />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-primary">Status</label>
              <select
                value={(newIpo as any).status || 'UPCOMING'}
                onChange={e => setNewIpo({...newIpo, status: e.target.value})}
                className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-blue/40 focus:ring-2 focus:ring-accent-blue/20"
              >
                <option value="UPCOMING">Upcoming</option>
                <option value="OPEN">Open</option>
                <option value="CLOSED">Closed</option>
                <option value="ALLOTMENT_PENDING">Allotment Pending</option>
                <option value="ALLOTTED">Allotted</option>
                <option value="NOT_ALLOTTED">Not Allotted</option>
                <option value="REFUND_PENDING">Refund Pending</option>
                <option value="LISTED">Listed</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-primary">Open Date</label>
              <Input type="date" value={newIpo.openDate} onChange={e => setNewIpo({...newIpo, openDate: e.target.value})} />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-primary">Close Date</label>
              <Input type="date" value={newIpo.closeDate} onChange={e => setNewIpo({...newIpo, closeDate: e.target.value})} />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-primary">Allotment Date</label>
              <Input type="date" value={newIpo.allotmentDate} onChange={e => setNewIpo({...newIpo, allotmentDate: e.target.value})} />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-primary">Refund Date</label>
              <Input type="date" value={newIpo.refundDate} onChange={e => setNewIpo({...newIpo, refundDate: e.target.value})} />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-black/5 mt-6">
            <Button type="button" variant="ghost" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Create IPO</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit IPO">
        {editingIpo && (
          <form onSubmit={handleUpdateIpo} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="col-span-1 md:col-span-2 space-y-1.5">
                <label className="text-sm font-medium text-text-primary">IPO Name (Display Name)</label>
                <Input value={editingIpo.ipoName} onChange={e => setEditingIpo({...editingIpo, ipoName: e.target.value})} required />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-primary">Company Name</label>
                <Input value={editingIpo.companyName} onChange={e => setEditingIpo({...editingIpo, companyName: e.target.value})} />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-primary">Symbol</label>
                <Input value={editingIpo.symbol} onChange={e => setEditingIpo({...editingIpo, symbol: e.target.value})} />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-primary">Price Per Share (₹)</label>
                <Input type="number" value={editingIpo.pricePerShare || ''} onChange={e => setEditingIpo({...editingIpo, pricePerShare: Number(e.target.value)})} required />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-primary">Lot Size (Shares)</label>
                <Input type="number" value={editingIpo.lotSize || ''} onChange={e => setEditingIpo({...editingIpo, lotSize: Number(e.target.value)})} required />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-primary">Status</label>
                <select
                  value={editingIpo.status}
                  onChange={e => setEditingIpo({...editingIpo, status: e.target.value})}
                  className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-blue/40 focus:ring-2 focus:ring-accent-blue/20"
                >
                  <option value="UPCOMING">Upcoming</option>
                  <option value="OPEN">Open</option>
                  <option value="CLOSED">Closed</option>
                  <option value="ALLOTMENT_PENDING">Allotment Pending</option>
                  <option value="ALLOTTED">Allotted</option>
                  <option value="NOT_ALLOTTED">Not Allotted</option>
                  <option value="REFUND_PENDING">Refund Pending</option>
                  <option value="LISTED">Listed</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-primary">Open Date</label>
                <Input type="date" value={editingIpo.openDate || ''} onChange={e => setEditingIpo({...editingIpo, openDate: e.target.value})} />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-primary">Close Date</label>
                <Input type="date" value={editingIpo.closeDate || ''} onChange={e => setEditingIpo({...editingIpo, closeDate: e.target.value})} />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-primary">Allotment Date</label>
                <Input type="date" value={editingIpo.allotmentDate || ''} onChange={e => setEditingIpo({...editingIpo, allotmentDate: e.target.value})} />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-primary">Refund Date</label>
                <Input type="date" value={editingIpo.refundDate || ''} onChange={e => setEditingIpo({...editingIpo, refundDate: e.target.value})} />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-black/5 mt-6">
              <Button type="button" variant="ghost" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
              <Button type="submit" variant="primary">Save Changes</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
