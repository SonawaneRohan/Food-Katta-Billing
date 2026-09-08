import React, { useState, useEffect } from 'react';
import {
  Store,
  UtensilsCrossed,
  ChefHat,
  Receipt,
  Menu,
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { RestaurantProvider, useRestaurant } from './context/RestaurantContext.tsx';
import { Header } from './components/layout/Header.tsx';
import { Sidebar } from './components/layout/Sidebar.tsx';
import { ShortcutsModal } from './components/common/ShortcutsModal.tsx';
import { POSView } from './components/pos/POSView.tsx';
import { TableManagementView } from './components/tables/TableManagementView.tsx';
import { KitchenDisplayView } from './components/kitchen/KitchenDisplayView.tsx';
import { BillsHistoryView } from './components/bills/BillsHistoryView.tsx';
import { MenuManagementView } from './components/menu/MenuManagementView.tsx';
import { DashboardView } from './components/dashboard/DashboardView.tsx';
import { CustomersView } from './components/customers/CustomersView.tsx';
import { InventoryView } from './components/inventory/InventoryView.tsx';
import { ExpensesView } from './components/expenses/ExpensesView.tsx';
import { CashRegisterView } from './components/cash-register/CashRegisterView.tsx';
import { ReportsView } from './components/reports/ReportsView.tsx';
import { StaffView } from './components/staff/StaffView.tsx';
import { AuditLogView } from './components/audit-log/AuditLogView.tsx';
import { SettingsView } from './components/settings/SettingsView.tsx';
import { PublicBillView } from './components/bills/PublicBillView.tsx';
import { RestaurantTable } from './types/index.ts';

const AppContent: React.FC = () => {
  const [currentView, setCurrentView] = useState<string>('pos');
  const [isShortcutsOpen, setIsShortcutsOpen] = useState<boolean>(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState<boolean>(false);
  const [publicBillId, setPublicBillId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('billId') || params.get('bill');
    }
    return null;
  });

  const { currentStaff } = useAuth();
  const { loadTableOrder, activeRegister, settings, tables, kotOrders } = useRestaurant();

  // Compute live badges for tables and kitchen
  const safeTables = Array.isArray(tables) ? tables : [];
  const occupiedTablesCount = safeTables.filter(
    (t) =>
      t &&
      (t.status === 'OCCUPIED' ||
        t.status === 'ORDER READY' ||
        t.status === 'BILL REQUESTED')
  ).length;

  const safeKotOrders = Array.isArray(kotOrders) ? kotOrders : [];
  const pendingKotCount = safeKotOrders.filter(
    (k) => k && k.status !== 'SERVED' && k.status !== 'CANCELLED'
  ).length;

  // Global Function key shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F1: Switch to POS
      if (e.key === 'F1') {
        e.preventDefault();
        setCurrentView('pos');
      }
      // F3: Tables Floor Plan
      else if (e.key === 'F3') {
        e.preventDefault();
        setCurrentView('tables');
      }
      // F7: Kitchen Display
      else if (e.key === 'F7') {
        e.preventDefault();
        setCurrentView('kitchen');
      }
      // F10: Reports & Day-End
      else if (e.key === 'F10') {
        e.preventDefault();
        setCurrentView('reports');
      }
      // F12: Shortcuts dialog
      else if (e.key === 'F12') {
        e.preventDefault();
        setIsShortcutsOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleOpenTableInPos = (table: RestaurantTable) => {
    loadTableOrder(table);
    setCurrentView('pos');
  };

  if (publicBillId) {
    return (
      <PublicBillView
        billId={publicBillId}
        settings={settings}
        onBackToPos={() => {
          if (typeof window !== 'undefined' && window.history.pushState) {
            const newUrl = window.location.pathname;
            window.history.pushState({ path: newUrl }, '', newUrl);
          }
          setPublicBillId(null);
          setCurrentView('pos');
        }}
      />
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-900 font-sans antialiased select-none">
      {/* SIDE NAVIGATION (Persistent on Desktop, Drawer on Mobile/Tablet) */}
      <Sidebar
        currentView={currentView}
        onSelectView={(view) => {
          setCurrentView(view);
          setIsMobileNavOpen(false);
        }}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        isMobileOpen={isMobileNavOpen}
        onCloseMobile={() => setIsMobileNavOpen(false)}
      />

      {/* MAIN INTERFACE */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0 relative">
        {/* TOP HEADER BAR */}
        <Header
          currentView={currentView}
          onOpenShortcuts={() => setIsShortcutsOpen(true)}
          onNavigateToRegister={() => setCurrentView('cash-register')}
          onNavigateToTables={() => setCurrentView('tables')}
          onToggleSidebar={() => setIsMobileNavOpen((prev) => !prev)}
        />

        {/* VIEW CONTAINER (accounting for mobile bottom nav / desktop status bar) */}
        <main className="flex-1 overflow-hidden flex flex-col min-w-0 pb-14 lg:pb-8 bg-slate-50">
          {currentView === 'pos' && <POSView />}
          {currentView === 'tables' && (
            <TableManagementView onOpenTableInPos={handleOpenTableInPos} />
          )}
          {currentView === 'kitchen' && <KitchenDisplayView />}
          {currentView === 'bills' && <BillsHistoryView />}
          {currentView === 'menu' && <MenuManagementView />}
          {currentView === 'dashboard' && (
            <DashboardView
              onNavigateToPos={() => setCurrentView('pos')}
              onNavigateToTables={() => setCurrentView('tables')}
            />
          )}
          {currentView === 'customers' && <CustomersView />}
          {currentView === 'inventory' && <InventoryView />}
          {currentView === 'expenses' && <ExpensesView />}
          {currentView === 'cash-register' && <CashRegisterView />}
          {currentView === 'reports' && <ReportsView />}
          {currentView === 'staff' && <StaffView />}
          {currentView === 'audit-log' && <AuditLogView />}
          {currentView === 'settings' && <SettingsView />}
        </main>

        {/* MOBILE / TABLET BOTTOM NAVIGATION BAR */}
        <nav className="fixed bottom-0 left-0 right-0 h-14 bg-slate-900 border-t border-slate-800 flex items-center justify-around z-40 lg:hidden px-1 shadow-2xl select-none">
          <button
            onClick={() => setCurrentView('pos')}
            className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-lg transition-colors ${
              currentView === 'pos' ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Store className="w-4 h-4 mb-0.5" />
            <span className="text-[10px] tracking-tight">POS</span>
          </button>

          <button
            onClick={() => setCurrentView('tables')}
            className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-lg transition-colors relative ${
              currentView === 'tables' ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <UtensilsCrossed className="w-4 h-4 mb-0.5" />
              {occupiedTablesCount > 0 && (
                <span className="absolute -top-1 -right-2 w-3.5 h-3.5 bg-amber-500 text-slate-950 rounded-full text-[8px] font-black flex items-center justify-center">
                  {occupiedTablesCount}
                </span>
              )}
            </div>
            <span className="text-[10px] tracking-tight">Tables</span>
          </button>

          <button
            onClick={() => setCurrentView('kitchen')}
            className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-lg transition-colors relative ${
              currentView === 'kitchen' ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <ChefHat className="w-4 h-4 mb-0.5" />
              {pendingKotCount > 0 && (
                <span className="absolute -top-1 -right-2 w-3.5 h-3.5 bg-rose-500 text-white rounded-full text-[8px] font-black flex items-center justify-center">
                  {pendingKotCount}
                </span>
              )}
            </div>
            <span className="text-[10px] tracking-tight">Kitchen</span>
          </button>

          <button
            onClick={() => setCurrentView('bills')}
            className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-lg transition-colors ${
              currentView === 'bills' ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Receipt className="w-4 h-4 mb-0.5" />
            <span className="text-[10px] tracking-tight">Bills</span>
          </button>

          <button
            onClick={() => setIsMobileNavOpen(true)}
            className="flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
          >
            <Menu className="w-4 h-4 mb-0.5" />
            <span className="text-[10px] tracking-tight">More</span>
          </button>
        </nav>

        {/* HIGH DENSITY DESKTOP FOOTER STATUS BAR */}
        <footer className="hidden lg:flex absolute bottom-0 left-0 right-0 h-8 bg-slate-900 border-t border-slate-800 items-center justify-between px-4 z-40">
          <div className="flex items-center gap-4 text-[10px] font-bold">
            <span className="text-emerald-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>System Online</span>
            </span>
            <span className="text-slate-400 uppercase hidden sm:inline">
              Printer: Connected (Thermal {settings.thermalPrinterWidth || '80mm'})
            </span>
            <span className="text-slate-400 uppercase">
              Cashier: <span className="text-slate-200">{currentStaff.name || 'Aditya'}</span>
            </span>
          </div>

          <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400">
            <span className="hidden md:inline">
              {activeRegister
                ? `Shift Active (Opening: ₹${activeRegister.openingCash})`
                : 'Shift Closed'}
            </span>
            <span className="text-amber-500 font-mono">v2.0-stable</span>
          </div>
        </footer>
      </div>

      {/* Keyboard Shortcuts Dialog */}
      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <RestaurantProvider>
        <AppContent />
      </RestaurantProvider>
    </AuthProvider>
  );
}
