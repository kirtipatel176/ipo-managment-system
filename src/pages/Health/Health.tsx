import React, { useEffect, useState } from 'react';
import { Activity, Database, CheckCircle, XCircle, Clock, Server, Code } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { motion } from 'framer-motion';

type ApiStatus = {
  name: string;
  status: 'checking' | 'connected' | 'error';
  latency: number | null;
};

const tablesToCheck = [
  { name: 'Bank Accounts', table: 'BankAccounts' },
  { name: 'IPO Master', table: 'IPOMaster' },
  { name: 'Applications', table: 'Applications' },
  { name: 'Transactions', table: 'Transactions' },
  { name: 'Demat Accounts', table: 'DematAccounts' },
  { name: 'People', table: 'People' }
];

export const Health: React.FC = () => {
  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [dbLatency, setDbLatency] = useState<number | null>(null);

  const [apiStatuses, setApiStatuses] = useState<Record<string, ApiStatus>>(
    tablesToCheck.reduce((acc, item) => ({
      ...acc,
      [item.name]: { name: item.name, status: 'checking', latency: null }
    }), {})
  );

  useEffect(() => {
    const checkDbAndApis = async () => {
      // 1. Overall DB ping
      const dbStart = performance.now();
      try {
        const { error } = await supabase.from('bank_accounts').select('*', { head: true, count: 'exact' });
        if (error) throw error;
        const dbEnd = performance.now();
        setDbLatency(Math.round(dbEnd - dbStart));
        setDbStatus('connected');
      } catch (err) {
        setDbStatus('error');
      }

      // 2. Individual API / Table pings in parallel
      await Promise.all(
        tablesToCheck.map(async (item) => {
          const apiStart = performance.now();
          try {
            const { error } = await supabase.from(item.table as any).select('*', { head: true, count: 'exact' });
            const apiEnd = performance.now();
            setApiStatuses((prev) => ({
              ...prev,
              [item.name]: {
                name: item.name,
                status: error ? 'error' : 'connected',
                latency: Math.round(apiEnd - apiStart),
              },
            }));
          } catch (err) {
            setApiStatuses((prev) => ({
              ...prev,
              [item.name]: { ...prev[item.name], status: 'error' },
            }));
          }
        })
      );
    };

    checkDbAndApis();
  }, []);

  const envVars = {
    'Supabase URL': !!import.meta.env.VITE_SUPABASE_URL,
    'Supabase Anon Key': !!import.meta.env.VITE_SUPABASE_ANON_KEY,
  };

  const isEnvValid = Object.values(envVars).every((v) => v === true);
  
  const isApiValid = Object.values(apiStatuses).every(s => s.status === 'connected' || s.status === 'checking');
  const isApiChecking = Object.values(apiStatuses).some(s => s.status === 'checking');
  
  const overallStatus = 
    dbStatus === 'connected' && isEnvValid && isApiValid && !isApiChecking ? 'healthy' : 
    (dbStatus === 'error' || (!isApiValid && !isApiChecking) ? 'critical' : 'checking');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary flex items-center gap-2">
          <Activity className="text-accent-blue" />
          System Health
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Monitor the real-time operational status of LedgerX systems and APIs.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Overall Status Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel p-6 rounded-2xl flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-accent-blue/10 text-accent-blue">
                <Activity size={24} />
              </div>
              <div>
                <h3 className="font-semibold text-text-primary">System Status</h3>
                <p className="text-xs text-text-secondary">Overall Health</p>
              </div>
            </div>
          </div>
          <div className="mt-6 flex items-center gap-2">
            {overallStatus === 'healthy' && (
              <>
                <div className="w-3 h-3 rounded-full bg-accent-green animate-pulse" />
                <span className="text-xl font-bold text-accent-green">All Systems Operational</span>
              </>
            )}
            {overallStatus === 'critical' && (
              <>
                <div className="w-3 h-3 rounded-full bg-accent-red animate-pulse" />
                <span className="text-xl font-bold text-accent-red">System Outage</span>
              </>
            )}
            {overallStatus === 'checking' && (
              <>
                <div className="w-3 h-3 rounded-full bg-text-tertiary animate-pulse" />
                <span className="text-xl font-bold text-text-secondary">Checking Status...</span>
              </>
            )}
          </div>
        </motion.div>

        {/* Database Status Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-panel p-6 rounded-2xl flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-accent-purple/10 text-accent-purple">
                <Database size={24} />
              </div>
              <div>
                <h3 className="font-semibold text-text-primary">Supabase</h3>
                <p className="text-xs text-text-secondary">Database & Auth</p>
              </div>
            </div>
          </div>
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-text-secondary">Connection</span>
              {dbStatus === 'connected' ? (
                <span className="flex items-center text-xs font-semibold text-accent-green bg-accent-green/10 px-2 py-1 rounded-full">
                  <CheckCircle size={14} className="mr-1" /> Connected
                </span>
              ) : dbStatus === 'error' ? (
                <span className="flex items-center text-xs font-semibold text-accent-red bg-accent-red/10 px-2 py-1 rounded-full">
                  <XCircle size={14} className="mr-1" /> Error
                </span>
              ) : (
                <span className="flex items-center text-xs font-semibold text-text-tertiary bg-bg-tertiary px-2 py-1 rounded-full">
                  <Clock size={14} className="mr-1" /> Ping...
                </span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-text-secondary">Latency</span>
              <span className="text-sm font-semibold text-text-primary">
                {dbLatency !== null ? `${dbLatency}ms` : '-'}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Environment Status Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-panel p-6 rounded-2xl flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-accent-orange/10 text-accent-orange">
                <Code size={24} />
              </div>
              <div>
                <h3 className="font-semibold text-text-primary">Environment</h3>
                <p className="text-xs text-text-secondary">Config Variables</p>
              </div>
            </div>
          </div>
          <div className="mt-6 space-y-2">
            {Object.entries(envVars).map(([key, isValid]) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-sm font-medium text-text-secondary">{key}</span>
                {isValid ? (
                  <CheckCircle size={16} className="text-accent-green" />
                ) : (
                  <XCircle size={16} className="text-accent-red" />
                )}
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* API Endpoints Status */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-panel p-6 rounded-2xl"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-xl bg-accent-blue/10 text-accent-blue">
            <Server size={24} />
          </div>
          <div>
            <h3 className="font-semibold text-text-primary">API Endpoints</h3>
            <p className="text-xs text-text-secondary">Real-time status of all database endpoints</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.values(apiStatuses).map((api, idx) => (
            <motion.div 
              key={api.name}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 + (idx * 0.05) }}
              className="flex items-center justify-between p-4 rounded-xl border border-black/5 bg-white/50"
            >
              <span className="text-sm font-medium text-text-primary">{api.name}</span>
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-text-secondary">
                  {api.latency !== null ? `${api.latency}ms` : ''}
                </span>
                {api.status === 'connected' ? (
                  <CheckCircle size={18} className="text-accent-green" />
                ) : api.status === 'error' ? (
                  <XCircle size={18} className="text-accent-red" />
                ) : (
                  <Clock size={18} className="text-text-tertiary animate-pulse" />
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};
