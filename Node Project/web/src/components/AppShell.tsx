import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  ChartPieSlice, Users, FileText, Receipt, Wallet, Package, ChartLineUp,
  Gear, SignOut, List, X, CaretDown, Buildings, ArrowSquareOut, UserCircleGear,
} from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/app', label: 'Dashboard', icon: ChartPieSlice, end: true },
  { to: '/app/clients', label: 'Clients', icon: Users },
  { to: '/app/quotes', label: 'Quotes', icon: FileText },
  { to: '/app/invoices', label: 'Invoices', icon: Receipt },
  { to: '/app/recurring', label: 'Recurring', icon: Wallet },
  { to: '/app/expenses', label: 'Expenses', icon: ChartLineUp },
  { to: '/app/catalog', label: 'Catalog', icon: Package },
  { to: '/app/reports', label: 'Reports', icon: ChartPieSlice },
  { to: '/app/team', label: 'Team', icon: UserCircleGear },
  { to: '/app/settings', label: 'Settings', icon: Gear },
];

export function AppShell() {
  const { user, business, businesses, logout, switchBusiness } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  useEffect(() => {
    setDrawerOpen(false);
    setSwitcherOpen(false);
  }, [location.pathname]);

  const handleSwitch = async (id: string) => {
    if (id === business?.id) {
      setSwitcherOpen(false);
      return;
    }
    await switchBusiness(id);
    navigate('/app');
  };

  const nav = (
    <nav className="flex-1 space-y-1 px-3" aria-label="Main">
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => [
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
              isActive
                ? 'bg-brand-600 text-white shadow-[0_1px_2px_rgb(30_58_95/0.3)]'
                : 'text-ink-soft hover:bg-brand-50 hover:text-brand-700',
            ].join(' ')}
          >
            {({ isActive }) => (
              <>
                <Icon size={19} weight={isActive ? 'fill' : 'regular'} aria-hidden="true" />
                {item.label}
              </>
            )}
          </NavLink>
        );
      })}
    </nav>
  );

  const brandBlock = (
    <div className="flex items-center gap-3 px-4 py-4">
      <div
        className="w-10 h-10 rounded-xl bg-brand-600 text-white grid place-items-center font-bold text-sm shrink-0"
        aria-hidden="true"
      >
        {(business?.logo_text || business?.name || 'FD').slice(0, 2).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-bold text-ink truncate text-sm leading-tight">
          {business?.name || 'Flowdesk'}
        </p>
        <p className="text-xs text-ink-soft truncate">{business?.currency || 'USD'} workspace</p>
      </div>
    </div>
  );

  const accountBlock = (
    <div className="p-3 border-t border-line">
      {businesses.length > 1 && (
        <div className="relative mb-2">
          <button
            type="button"
            onClick={() => setSwitcherOpen((v) => !v)}
            className="w-full flex items-center gap-2 text-xs font-semibold text-ink-soft hover:text-brand-700
              px-2 py-1.5 rounded-lg hover:bg-canvas transition-colors cursor-pointer"
            aria-expanded={switcherOpen}
          >
            <Buildings size={15} aria-hidden="true" />
            Switch business
            <CaretDown size={13} className="ml-auto" aria-hidden="true" />
          </button>
          {switcherOpen && (
            <div className="absolute bottom-full left-0 right-0 mb-1 card shadow-pop p-1 z-20">
              {businesses.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => handleSwitch(b.id)}
                  className="w-full text-left px-2.5 py-2 rounded-lg text-sm hover:bg-canvas
                    text-ink flex items-center gap-2 cursor-pointer"
                >
                  <span className="w-6 h-6 rounded-md bg-brand-100 text-brand-700 grid place-items-center
                    text-[11px] font-bold shrink-0">
                    {b.logo_text || b.name.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="truncate flex-1">{b.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="flex items-center gap-2 px-2">
        <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 grid place-items-center
          text-xs font-bold shrink-0" aria-hidden="true">
          {(user?.name || 'U').slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink truncate">{user?.name}</p>
          <p className="text-xs text-ink-soft truncate">{user?.email}</p>
        </div>
        <button
          type="button"
          onClick={() => logout()}
          aria-label="Sign out"
          className="w-9 h-9 grid place-items-center rounded-lg text-ink-soft hover:bg-danger-50
            hover:text-danger-600 transition-colors cursor-pointer shrink-0"
        >
          <SignOut size={17} aria-hidden="true" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-canvas">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col bg-surface border-r border-line z-30">
        {brandBlock}
        {nav}
        {accountBlock}
      </aside>

      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-30 bg-surface/95 backdrop-blur border-b border-line">
        <div className="flex items-center gap-3 px-4 h-14">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation"
            className="w-10 h-10 grid place-items-center rounded-xl text-ink-soft hover:bg-canvas cursor-pointer"
          >
            <List size={21} aria-hidden="true" />
          </button>
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-lg bg-brand-600 text-white grid place-items-center
              text-[11px] font-bold shrink-0" aria-hidden="true">
              {(business?.logo_text || 'FD').slice(0, 2).toUpperCase()}
            </div>
            <span className="font-bold text-sm truncate">{business?.name || 'Flowdesk'}</span>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-brand-950/45 backdrop-blur-[2px] animate-fade"
            onClick={() => setDrawerOpen(false)} aria-hidden="true" />
          <aside className="absolute inset-y-0 left-0 w-[82%] max-w-xs bg-surface flex flex-col
            shadow-pop animate-rise">
            <div className="flex items-center justify-between pr-3">
              {brandBlock}
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close navigation"
                className="w-9 h-9 grid place-items-center rounded-lg text-ink-soft hover:bg-canvas cursor-pointer"
              >
                <X size={18} weight="bold" />
              </button>
            </div>
            {nav}
            {accountBlock}
          </aside>
        </div>
      )}

      <main className="lg:pl-64 min-h-screen">
        <div className="app-container px-4 sm:px-6 lg:px-8 py-5 sm:py-7 max-w-[1400px] mx-auto pb-28 lg:pb-10">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-surface/95 backdrop-blur border-t border-line
          grid grid-cols-4"
        aria-label="Primary"
      >
        {navItems.slice(0, 4).map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => [
                'flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-semibold transition-colors',
                isActive ? 'text-brand-700' : 'text-ink-soft',
              ].join(' ')}
            >
              {({ isActive }) => (
                <>
                  <Icon size={21} weight={isActive ? 'fill' : 'regular'} aria-hidden="true" />
                  {item.label}
                </>
              )}
            </NavLink>
          );
        })}
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-semibold
            text-ink-soft cursor-pointer"
        >
          <ArrowSquareOut size={21} aria-hidden="true" />
          More
        </button>
      </nav>
    </div>
  );
}
