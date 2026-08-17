import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, TrendingUp, FileCheck, ArrowLeftRight, Landmark, Users, Briefcase, ChartNoAxesCombined, Settings, ChevronLeft, ChevronRight, CreditCard, BarChart2, CalendarDays, Activity } from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { LogOut, LogIn } from 'lucide-react';

const navItems = [
  { path: '/', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
  { path: '/ipos', label: 'IPO Master', icon: <TrendingUp size={20} /> },
  { path: '/applications', label: 'Applications', icon: <FileCheck size={20} /> },
  { path: '/transactions', label: 'Transactions', icon: <ArrowLeftRight size={20} /> },
  { path: '/accounts', label: 'Bank Accounts', icon: <Landmark size={20} /> },
  { path: '/demat', label: 'Demat Accounts', icon: <CreditCard size={20} /> },
  { path: '/people', label: 'People', icon: <Users size={20} /> },
  { path: '/holdings', label: 'Holdings', icon: <Briefcase size={20} /> },
  { path: '/profit', label: 'P&L', icon: <ChartNoAxesCombined size={20} /> },
  { path: '/analytics/monthly', label: 'Monthly Analytics', icon: <CalendarDays size={20} /> },
  { path: '/analytics/yearly', label: 'Yearly Analytics', icon: <BarChart2 size={20} /> },
  { path: '/logs', label: 'System Logs', icon: <Activity size={20} /> },
  { path: '/health', label: 'System Health', icon: <Activity size={20} /> },
];

export const Sidebar: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { user, signOut } = useAuth();

  return (
    <>
      {/* Desktop Sidebar */}
      <motion.aside 
        initial={{ width: 260 }}
        animate={{ width: collapsed ? 80 : 260 }}
        transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
        className="glass-panel z-20 hidden h-full flex-col md:flex border-r border-black/5"
      >
        <div className="flex h-16 shrink-0 items-center justify-between px-4">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-blue/10 text-accent-blue">
              <TrendingUp size={18} strokeWidth={2.5} />
            </div>
            {!collapsed && (
              <motion.h2 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="whitespace-nowrap font-semibold tracking-tight text-text-primary"
              >
                LedgerX
              </motion.h2>
            )}
          </div>
          <button 
            onClick={() => setCollapsed(!collapsed)}
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-bg-tertiary text-text-tertiary hover:text-text-primary transition-colors"
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
        
        <nav className="flex-1 space-y-1 overflow-y-auto overflow-x-hidden p-3 py-4">
          {navItems.map((item) => (
            <NavLink 
              key={item.path} 
              to={item.path} 
              className={({ isActive }) => cn(
                "group flex h-10 items-center rounded-xl px-3 text-sm font-medium transition-colors",
                isActive 
                  ? "bg-accent-blue text-white shadow-sm" 
                  : "text-text-secondary hover:bg-bg-tertiary hover:text-text-primary"
              )}
              title={collapsed ? item.label : undefined}
            >
              <span className={cn("shrink-0", !collapsed && "mr-3")}>{item.icon}</span>
              {!collapsed && (
                <motion.span 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="whitespace-nowrap"
                >
                  {item.label}
                </motion.span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="shrink-0 p-3 pb-6">
          <NavLink 
            to="/settings" 
            className={({ isActive }) => cn(
              "group flex h-10 items-center rounded-xl px-3 text-sm font-medium transition-colors",
              isActive 
                ? "bg-accent-blue text-white shadow-sm" 
                : "text-text-secondary hover:bg-bg-tertiary hover:text-text-primary"
            )}
            title={collapsed ? "Settings" : undefined}
          >
            <span className={cn("shrink-0", !collapsed && "mr-3")}><Settings size={20} /></span>
            {!collapsed && <span className="whitespace-nowrap">Settings</span>}
          </NavLink>
          {user ? (
            <button 
              onClick={() => signOut()}
              className={cn(
                "w-full group mt-2 flex h-10 items-center rounded-xl px-3 text-sm font-medium transition-colors text-accent-red hover:bg-accent-red/10"
              )}
              title={collapsed ? "Logout" : undefined}
            >
              <span className={cn("shrink-0", !collapsed && "mr-3")}><LogOut size={20} /></span>
              {!collapsed && <span className="whitespace-nowrap">Logout</span>}
            </button>
          ) : (
            <NavLink 
              to="/login" 
              className={({ isActive }) => cn(
                "group mt-2 flex h-10 items-center rounded-xl px-3 text-sm font-medium transition-colors",
                isActive 
                  ? "bg-accent-blue text-white shadow-sm" 
                  : "text-text-secondary hover:bg-bg-tertiary hover:text-text-primary"
              )}
              title={collapsed ? "Login" : undefined}
            >
              <span className={cn("shrink-0", !collapsed && "mr-3")}><LogIn size={20} /></span>
              {!collapsed && <span className="whitespace-nowrap">Login</span>}
            </NavLink>
          )}
        </div>
      </motion.aside>

      {/* Mobile Bottom Nav */}
      <nav className="glass-panel fixed bottom-0 left-0 right-0 z-20 flex h-16 items-center justify-around border-t border-black/5 md:hidden px-2 pb-safe">
        {navItems.slice(0, 5).map((item) => (
          <NavLink 
            key={item.path} 
            to={item.path} 
            className={({ isActive }) => cn(
              "flex flex-col items-center justify-center w-16 h-full gap-1 transition-colors",
              isActive ? "text-accent-blue" : "text-text-tertiary"
            )}
          >
            {item.icon}
            <span className="text-[10px] font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
};
