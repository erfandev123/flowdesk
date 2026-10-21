import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppShell } from './components/AppShell';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ClientsPage } from './pages/ClientsPage';
import { ClientDetailPage } from './pages/ClientDetailPage';
import { QuotesPage } from './pages/QuotesPage';
import { InvoicesPage } from './pages/InvoicesPage';
import { InvoiceDetailPage } from './pages/InvoiceDetailPage';
import { InvoiceEditorPage } from './pages/InvoiceEditorPage';
import { RecurringPage } from './pages/RecurringPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { CatalogPage } from './pages/CatalogPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { TeamPage } from './pages/TeamPage';
import { PortalPage } from './pages/PortalPage';
import { LandingPage } from './pages/LandingPage';
import { Spinner } from './components/Feedback';
import './styles.css';

function Protected() {
  const { user, business, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-canvas">
        <Spinner label="Loading your workspace" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (!business) {
    return (
      <div className="min-h-screen grid place-items-center bg-canvas px-6">
        <div className="text-center max-w-md">
          <h1 className="text-xl font-bold text-ink mb-2">No workspace yet</h1>
          <p className="text-sm text-ink-soft mb-5">
            Your account exists but no business is attached. Sign out and register again, or contact support.
          </p>
          <a href="/login" className="btn btn-primary">Back to sign in</a>
        </div>
      </div>
    );
  }
  return <AppShell />;
}

function Portal() {
  return <PortalPage />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/portal/:token" element={<Portal />} />
          <Route path="/app" element={<Protected />}>
            <Route index element={<DashboardPage />} />
            <Route path="clients" element={<ClientsPage />} />
            <Route path="clients/:id" element={<ClientDetailPage />} />
            <Route path="quotes" element={<QuotesPage />} />
            <Route path="invoices" element={<InvoicesPage />} />
            <Route path="invoices/new" element={<InvoiceEditorPage />} />
            <Route path="invoices/:id" element={<InvoiceDetailPage />} />
            <Route path="invoices/:id/edit" element={<InvoiceEditorPage />} />
            <Route path="recurring" element={<RecurringPage />} />
            <Route path="expenses" element={<ExpensesPage />} />
            <Route path="catalog" element={<CatalogPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="team" element={<TeamPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/app" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
