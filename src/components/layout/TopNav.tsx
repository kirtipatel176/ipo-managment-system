import React from 'react';
import { Search, Plus, Calendar, Menu } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface TopNavProps {
  onMenuClick?: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({ onMenuClick }) => {
  return (
    <header className="glass-panel z-10 sticky top-0 flex h-16 shrink-0 items-center justify-between px-4 md:px-6 border-b border-black/5">
      <div className="flex w-full max-w-md items-center gap-3 md:gap-4">
        {onMenuClick && (
          <button 
            onClick={onMenuClick}
            className="md:hidden flex h-9 w-9 items-center justify-center rounded-full text-text-secondary hover:bg-bg-tertiary hover:text-text-primary transition-colors shrink-0"
          >
            <Menu size={20} />
          </button>
        )}
        <div
          className="flex-1 w-full relative cursor-text"
          onClick={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
        >
          <Input
            icon={<Search size={18} />}
            placeholder="Search... (Cmd+K)"
            className="h-9 w-full bg-bg-secondary/50 hover:bg-bg-secondary/80 focus:bg-white cursor-pointer pointer-events-none"
            readOnly
          />
        </div>
        <div className="hidden items-center gap-2 rounded-xl bg-bg-tertiary px-3 py-1.5 text-sm text-text-secondary md:flex">
          <Calendar size={16} />
          <span>Today ▾</span>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        <div className="hidden sm:block">
          <Button variant="primary" size="sm" icon={<Plus size={16} />}>
            Quick Add
          </Button>
        </div>
        <div className="sm:hidden">
          <Button variant="primary" size="sm" className="px-2" icon={<Plus size={16} />} />
        </div>
      </div>
    </header>
  );
};
