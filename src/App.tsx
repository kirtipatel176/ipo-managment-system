
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

// Placeholder Pages
const Settings = () => <div><h2>Settings</h2></div>;

function App() {
  return (
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
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </IPOFilterProvider>
  );
}

export default App;
