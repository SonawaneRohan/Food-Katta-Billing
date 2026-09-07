import React from 'react';
import {
  Store,
  UtensilsCrossed,
  ChefHat,
  Receipt,
  LayoutDashboard,
  MenuSquare,
  Users,
  Boxes,
  CircleDollarSign,
  TrendingUp,
  FileSpreadsheet,
  ShieldCheck,
  History,
  Settings,
  Lock,
  LogOut,
  Keyboard,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useRestaurant } from '../../context/RestaurantContext.tsx';

export type TabType =
  | 'pos'
  | 'tables'
  | 'kitchen'
  | 'bills'
  | 'dashboard'
  | 'menu'
  | 'customers'
  | 'inventory'
  | 'expenses'
  | 'cash-register'
  | 'register'
  | 'reports'
  | 'staff'
  | 'audit-log'
  | 'audit'
  | 'settings';

interface SidebarProps {
  currentView?: string;
  currentTab?: TabType;
  onSelectView?: (view: string) => void;
  onSelectTab?: (tab: TabType) => void;
  onOpenShortcuts?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  currentTab,
  onSelectView,
  onSelectTab,
  onOpenShortcuts,
  isMobileOpen,
  onCloseMobile,
}) => {
  const { currentStaff, hasPermission, logout } = useAuth();
  const { tables, kotOrders } = useRestaurant();

  const activeTab = currentView || currentTab || 'pos';
  const handleSelect = (tab: string) => {
    if (onSelectView) onSelectView(tab);
    else if (onSelectTab) onSelectTab(tab as TabType);
    if (onCloseMobile) onCloseMobile();
  };

  // Pending KOTs count (status !== 'SERVED' && status !== 'CANCELLED')
  const safeKotOrders = Array.isArray(kotOrders) ? kotOrders : [];
  const pendingKotCount = safeKotOrders.filter(
    (k) => k && k.status !== 'SERVED' && k.status !== 'CANCELLED'
  ).length;

  // Occupied tables count
  const safeTables = Array.isArray(tables) ? tables : [];
  const occupiedTablesCount = safeTables.filter(
    (t) =>
      t &&
      (t.status === 'OCCUPIED' ||
        t.status === 'ORDER READY' ||
        t.status === 'BILL REQUESTED')
  ).length;

  interface NavItem {
    id: string;
    label: string;
    icon: React.ElementType;
    badge?: number;
    badgeColor?: string;
    permission?: string;
    shortcut?: string;
  }

  const primaryNav: NavItem[] = [
    { id: 'pos', label: 'POS / Billing', icon: Store, permission: 'POS_ACCESS', shortcut: 'F1' },
    {
      id: 'tables',
      label: 'Tables',
      icon: UtensilsCrossed,
      badge: occupiedTablesCount,
      badgeColor: 'bg-amber-500 text-slate-900',
      permission: 'TABLES_ACCESS',
      shortcut: 'F3',
    },
    {
      id: 'kitchen',
      label: 'KOT / Kitchen',
      icon: ChefHat,
      badge: pendingKotCount,
      badgeColor: 'bg-rose-500 text-white',
      permission: 'KITCHEN_ACCESS',
      shortcut: 'F7',
    },
    { id: 'bills', label: 'Bills', icon: Receipt, permission: 'BILLS_ACCESS' },
  ];

  const secondaryNav: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'VIEW_DASHBOARD' },
    { id: 'menu', label: 'Menu Management', icon: MenuSquare, permission: 'MENU_VIEW' },
    { id: 'customers', label: 'Customers CRM', icon: Users, permission: 'CUSTOMERS_ACCESS' },
    { id: 'inventory', label: 'Inventory', icon: Boxes, permission: 'INVENTORY_ACCESS' },
    { id: 'expenses', label: 'Expenses', icon: CircleDollarSign, permission: 'EXPENSES_ACCESS' },
    { id: 'cash-register', label: 'Cash Register', icon: TrendingUp, permission: 'CASH_REGISTER_ACCESS' },
    { id: 'reports', label: 'Reports', icon: FileSpreadsheet, permission: 'REPORTS_ACCESS', shortcut: 'F10' },
    { id: 'staff', label: 'Staff & Roles', icon: ShieldCheck, permission: 'STAFF_MANAGEMENT' },
    { id: 'audit-log', label: 'Audit Trail', icon: History, permission: 'AUDIT_LOGS_VIEW' },
    { id: 'settings', label: 'Settings', icon: Settings, permission: 'SETTINGS_ACCESS' },
  ];

  const renderNavGroup = (items: NavItem[]) => {
    return (
      <ul className="space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          const isAllowed = item.permission ? hasPermission(item.permission) : true;
          const isActive =
            activeTab === item.id ||
            (item.id === 'cash-register' && activeTab === 'register') ||
            (item.id === 'audit-log' && activeTab === 'audit');

          return (
            <li key={item.id}>
              <button
                onClick={() => {
                  if (isAllowed) {
                    handleSelect(item.id);
                  }
                }}
                disabled={!isAllowed}
                className={`w-full flex items-center justify-between px-3 py-2 rounded text-xs font-semibold transition-colors group ${
                  isActive
                    ? 'text-white bg-amber-600 rounded shadow-lg shadow-amber-900/20 font-semibold'
                    : isAllowed
                    ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                    : 'text-slate-600 opacity-50 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {!isAllowed ? (
                    <Lock className="w-3 h-3 text-slate-600" />
                  ) : item.badge !== undefined && item.badge > 0 ? (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                        item.badgeColor || 'bg-slate-800 text-white'
                      }`}
                    >
                      {item.badge}
                    </span>
                  ) : item.shortcut ? (
                    <kbd className="hidden lg:inline-block px-1.5 py-0.5 text-[9px] font-mono text-slate-400 bg-slate-800/80 border border-slate-700/80 rounded">
                      {item.shortcut}
                    </kbd>
                  ) : null}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    );
  };

  const renderContent = (isMobileView: boolean) => (
    <>
      {/* High Density Brand Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-amber-500 font-black text-xl tracking-tighter">FOOD KATTA</h1>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>
          <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mt-0.5">
            Restaurant POS v2.0
          </p>
        </div>

        {isMobileView && onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="Close Menu"
            aria-label="Close Menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation list */}
      <nav className="flex-1 py-3 px-2 overflow-y-auto space-y-4 scrollbar-thin scrollbar-thumb-slate-800">
        <div>
          <p className="px-3 text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1.5">
            Operations
          </p>
          {renderNavGroup(primaryNav)}
        </div>

        <div>
          <p className="px-3 text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1.5">
            Management
          </p>
          {renderNavGroup(secondaryNav)}
        </div>
      </nav>

      {/* User / Terminal active role box */}
      <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300 shrink-0">
          {currentStaff.name ? currentStaff.name.slice(0, 2).toUpperCase() : 'FK'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-white font-medium truncate">{currentStaff.name}</p>
          <p className="text-[10px] text-amber-500 font-bold uppercase tracking-wide">
            {currentStaff.role}
          </p>
        </div>
        {onOpenShortcuts && (
          <button
            onClick={() => {
              onOpenShortcuts();
              if (isMobileView && onCloseMobile) onCloseMobile();
            }}
            className="p-1.5 text-slate-500 hover:text-white rounded hover:bg-slate-800 transition-colors"
            title="Shortcuts (F12)"
          >
            <Keyboard className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          onClick={() => {
            logout();
            if (isMobileView && onCloseMobile) onCloseMobile();
          }}
          className="p-1.5 text-slate-500 hover:text-red-400 rounded hover:bg-slate-800 transition-colors"
          title="Sign Out"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* DESKTOP PERMANENT SIDEBAR */}
      <aside className="hidden lg:flex w-56 xl:w-60 shrink-0 bg-slate-900 border-r border-slate-800 flex-col h-full justify-between overflow-hidden select-none">
        {renderContent(false)}
      </aside>

      {/* MOBILE / TABLET OVERLAY BACKDROP */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 lg:hidden transition-opacity"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* MOBILE / TABLET SLIDE-IN DRAWER */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-slate-900 shadow-2xl flex flex-col h-full justify-between overflow-hidden select-none transform transition-transform duration-300 ease-in-out lg:hidden ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {renderContent(true)}
      </aside>
    </>
  );
};
