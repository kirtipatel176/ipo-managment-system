import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, User, Landmark, Briefcase, FileText, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';

type SearchResultType = 'person' | 'bank' | 'demat' | 'ipo' | 'transaction' | 'application';

interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle: string;
  link: string;
}

export const CommandPalette: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    
    const handleCustomOpen = () => setIsOpen(true);
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open-command-palette', handleCustomOpen);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-command-palette', handleCustomOpen);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const q = query.toLowerCase();
    
    const fetchResults = async () => {
      const allResults: SearchResult[] = [];
      
      const [
        { data: people },
        { data: banks },
        { data: demats },
        { data: ipos },
        { data: txs }
      ] = await Promise.all([
        supabase.from('people').select('id, full_name, mobile, notes'),
        supabase.from('bank_accounts').select('id, bank_name, account_name'),
        supabase.from('demat_accounts').select('id, broker_name, demat_id'),
        supabase.from('ipos').select('id, ipo_name, company_name, status'),
        supabase.from('transactions').select('id, amount, utr, transaction_type, notes')
      ]);

      (people || [])
        .filter(p => p.full_name?.toLowerCase().includes(q) || p.notes?.toLowerCase().includes(q))
        .forEach(p => allResults.push({ id: `person-${p.id}`, type: 'person', title: p.full_name || '', subtitle: p.mobile || 'Person', link: '/people' }));

      (banks || [])
        .filter(b => b.bank_name?.toLowerCase().includes(q) || b.account_name?.toLowerCase().includes(q))
        .forEach(b => allResults.push({ id: `bank-${b.id}`, type: 'bank', title: `${b.bank_name} - ${b.account_name}`, subtitle: 'Bank Account', link: '/accounts' }));

      (demats || [])
        .filter(d => d.broker_name?.toLowerCase().includes(q) || d.demat_id?.toLowerCase().includes(q))
        .forEach(d => allResults.push({ id: `demat-${d.id}`, type: 'demat', title: d.broker_name || '', subtitle: `Demat - ${d.demat_id || 'Unknown ID'}`, link: '/demat' }));

      (ipos || [])
        .filter(i => i.ipo_name?.toLowerCase().includes(q) || i.company_name?.toLowerCase().includes(q))
        .forEach(i => allResults.push({ id: `ipo-${i.id}`, type: 'ipo', title: i.ipo_name || '', subtitle: `${i.company_name} (${i.status})`, link: '/ipos' }));

      (txs || [])
        .filter(t => t.utr?.toLowerCase().includes(q) || t.notes?.toLowerCase().includes(q) || t.amount?.toString().includes(q))
        .forEach(t => allResults.push({ id: `tx-${t.id}`, type: 'transaction', title: `₹${(t.amount || 0).toLocaleString('en-IN')}`, subtitle: `UTR: ${t.utr || 'N/A'} - ${t.transaction_type}`, link: '/transactions' }));

      setResults(allResults.slice(0, 15));
    };
    
    fetchResults();
  }, [query]);

  const handleSelect = (link: string) => {
    navigate(link);
    setIsOpen(false);
  };

  const getIcon = (type: SearchResultType) => {
    switch (type) {
      case 'person': return <User size={16} className="text-accent-purple" />;
      case 'bank': return <Landmark size={16} className="text-accent-blue" />;
      case 'demat': return <Briefcase size={16} className="text-accent-orange" />;
      case 'ipo': return <ArrowRight size={16} className="text-accent-green" />;
      case 'transaction': return <FileText size={16} className="text-text-tertiary" />;
      default: return <Search size={16} />;
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 sm:pt-32 bg-black/20 backdrop-blur-sm" onClick={() => setIsOpen(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-black/10"
            >
              <div className="flex items-center px-4 py-3 border-b border-black/5 gap-3">
                <Search size={20} className="text-text-tertiary shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search people, IPOs, banks, UTRs..."
                  className="flex-1 bg-transparent border-none outline-none text-text-primary text-lg placeholder-text-tertiary"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                />
                <div className="px-2 py-1 bg-bg-secondary rounded text-[10px] font-semibold text-text-tertiary tracking-widest uppercase">
                  ESC
                </div>
              </div>
              
              {results.length > 0 && (
                <div className="max-h-[60vh] overflow-y-auto p-2">
                  <div className="text-xs font-semibold text-text-tertiary uppercase tracking-wider px-3 py-2">Results</div>
                  {results.map(res => (
                    <div
                      key={res.id}
                      onClick={() => handleSelect(res.link)}
                      className="flex items-center gap-3 px-3 py-3 hover:bg-bg-secondary/50 rounded-xl cursor-pointer transition-colors"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bg-secondary border border-black/5">
                        {getIcon(res.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">{res.title}</p>
                        <p className="text-xs text-text-secondary truncate">{res.subtitle}</p>
                      </div>
                      <div className="text-xs text-text-tertiary capitalize font-medium">{res.type}</div>
                    </div>
                  ))}
                </div>
              )}
              
              {query && results.length === 0 && (
                <div className="p-8 text-center text-text-secondary text-sm">
                  No results found for "{query}"
                </div>
              )}
              
              {!query && (
                <div className="p-8 text-center">
                  <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-bg-secondary mb-3">
                    <Search size={20} className="text-text-tertiary" />
                  </div>
                  <p className="text-text-secondary text-sm">Start typing to search across the entire application.</p>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
