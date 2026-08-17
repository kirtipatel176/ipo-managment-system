import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';

import { Dashboard } from './pages/Dashboard/Dashboard';

import { Accounts } from './pages/Accounts/Accounts';

import { People } from './pages/People/People';

import { IPOMaster } from './pages/IPOMaster/IPOMaster';

import { Applications } from './pages/Applications/Applications';

import { Transactions } from './pages/Transactions/Transactions';

import { Holdings } from './pages/Holdings/Holdings';
import { Profit } from './pages/Profit/Profit';
import { DematAccounts } from './pages/DematAccounts/DematAccounts';
import { MonthlyAnalytics } from './pages/Analytics/MonthlyAnalytics';
import { YearlyAnalytics } from './pages/Analytics/YearlyAnalytics';
import { IPOFilterProvider } from './hooks/useIPOFilter';
import { ToastProvider } from './hooks/useToast';
import { ToastContainer } from './components/ui/Toast';
import { Health } from './pages/Health/Health';
import { Login } from './pages/Login/Login';
import { Logs } from './pages/Logs/Logs';
import { AuthProvider } from './contexts/AuthContext';

import { Settings } from './pages/Settings/Settings';
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
        <IPOFilterProvider>
          <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="ipos" element={<IPOMaster />} />
              <Route path="applications" element={<Applications />} />
              <Route path="transactions" element={<Transactions />} />
              <Route path="accounts" element={<Accounts />} />
              <Route path="demat" element={<DematAccounts />} />
              <Route path="people" element={<People />} />
              <Route path="holdings" element={<Holdings />} />
              <Route path="profit" element={<Profit />} />
              <Route path="analytics/monthly" element={<MonthlyAnalytics />} />
              <Route path="analytics/yearly" element={<YearlyAnalytics />} />
              <Route path="health" element={<Health />} />
              <Route path="logs" element={<Logs />} />
              <Route path="settings" element={<Settings />} />
            </Route>
            <Route path="/login" element={<Login />} />
          </Routes>
          {/* Global toast overlay — renders on top of all pages */}
          <ToastContainer />
        </BrowserRouter>
        </IPOFilterProvider>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
