import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Contracts } from './pages/Contracts';
import { Sales } from './pages/Sales';
import { Outreach } from './pages/Outreach';
import { Settings } from './pages/Settings';
import { Priorities } from './pages/Priorities';
import { People } from './pages/People';
import { BusinessUpdates } from './pages/BusinessUpdates';
import { Talent } from './pages/Talent';
import { Finance } from './pages/Finance';
import Login from './pages/Login';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />

            {/* Protected routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="priorities" element={<Priorities />} />
              <Route path="finance" element={<Finance />} />
              <Route path="contracts" element={<Contracts />} />
              <Route path="sales" element={<Sales />} />
              <Route path="outreach" element={<Outreach />} />
              <Route path="people" element={<People />} />
              <Route path="talent" element={<Talent />} />
              <Route path="business-updates" element={<BusinessUpdates />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
