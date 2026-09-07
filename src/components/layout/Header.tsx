import React, { useState, useEffect } from 'react';
import {
  Clock,
  ChevronDown,
  Keyboard,
  CircleDollarSign,
  Utensils,
  LogOut,
  User,
  Menu,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useRestaurant } from '../../context/RestaurantContext.tsx';
import { ShortcutsModal } from '../common/ShortcutsModal.tsx';

interface HeaderProps {
  currentView?: string;
  onOpenShortcuts?: () => void;
  onNavigateToRegister?: () => void;
  onNavigateToTables?: () => void;
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onOpenShortcuts,
  onNavigateToRegister,
  onNavigateToTables,
  onToggleSidebar,
}) => {
  const { currentStaff, allStaff, switchStaff, logout } = useAuth();
  const { activeRegister, tables, settings, selectedTable, orderType } = useRestaurant();

  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [isStaffMenuOpen, setIsStaffMenuOpen] = useState<boolean>(false);
  const [isLocalShortcutsOpen, setIsLocalShortcutsOpen] = useState<boolean>(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
      setCurrentDate(
        now.toLocaleDateString('en-IN', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Calculate occupied tables count
  const safeTables = Array.isArray(tables) ? tables : [];
  const occupiedCount = safeTables.filter(
    (t) =>
      t &&
      (t.status === 'OCCUPIED' ||
        t.status === 'ORDER READY' ||
        t.status === 'BILL REQUESTED')
  ).length;

  const roleColors: Record<string, string> = {
    OWNER: 'bg-purple-100 text-purple-800 border-purple-200',
    MANAGER: 'bg-blue-100 text-blue-800 border-blue-200',
    CASHIER: 'bg-amber-100 text-amber-800 border-amber-200',
    KITCHEN: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    STAFF: 'bg-slate-100 text-slate-800 border-slate-200',
  };

  const handleShortcuts = () => {
    if (onOpenShortcuts) onOpenShortcuts();
    else setIsLocalShortcutsOpen(true);
  };

  return (
    <>
      <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-3 sm:px-4 lg:px-6 sticky top-0 z-30 select-none">
        {/* Left: Hamburger (Mobile) + Active Table & Order Type Indicators */}
        <div className="flex items-center gap-2 sm:gap-4 lg:gap-6 min-w-0">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="lg:hidden p-1.5 -ml-1 text-slate-700 hover:text-slate-950 hover:bg-slate-100 rounded-lg transition-colors shrink-0"
              title="Open Navigation Menu"
              aria-label="Open Navigation Menu"
            >
              <Menu className="w-5 h-5 text-slate-800" />
            </button>
          )}

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase hidden xs:inline">
              Table:
            </span>
            <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-black text-xs border border-amber-200">
              {selectedTable ? `T-${selectedTable.tableNumber}` : 'NONE'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase hidden xs:inline">
              Type:
            </span>
            <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-black text-[11px] sm:text-xs border border-blue-200 uppercase">
              {orderType || 'DINE-IN'}
            </span>
          </div>

          {/* Tables Quick Metric */}
          {onNavigateToTables && (
            <button
              onClick={onNavigateToTables}
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 transition-colors text-xs font-semibold text-slate-700 border border-slate-200 shrink-0"
              title="View Tables"
            >
              <Utensils className="w-3.5 h-3.5 text-slate-500" />
              <span>Tables:</span>
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] font-black ${
                  occupiedCount > 0
                    ? 'bg-amber-500 text-slate-900'
                    : 'bg-emerald-600 text-white'
                }`}
              >
                {occupiedCount}/{safeTables.length}
              </span>
            </button>
          )}
        </div>

        {/* Center: Live Clock */}
        <div className="hidden md:flex items-center gap-2 text-slate-500 text-xs font-medium bg-slate-50 px-3 py-1 rounded-md border border-slate-200">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>{currentDate}</span>
          <span className="text-slate-300">|</span>
          <span className="font-mono font-bold text-slate-800">{currentTime}</span>
        </div>

        {/* Right: Register Shift + Shortcuts + Current Staff */}
        <div className="flex items-center gap-2.5">
          {/* Register Shift Status */}
          {onNavigateToRegister && (
            <button
              onClick={onNavigateToRegister}
              className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-semibold transition-colors ${
                activeRegister
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
              }`}
              title="Click to view Cash Register"
            >
              <CircleDollarSign className="w-3.5 h-3.5" />
              <span>
                {activeRegister
                  ? `Shift Open (₹${activeRegister.openingCash})`
                  : 'Shift Closed'}
              </span>
            </button>
          )}

          {/* Shortcuts Trigger */}
          <button
            onClick={handleShortcuts}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors border border-slate-200"
            title="Keyboard Shortcuts (F12)"
          >
            <Keyboard className="w-4 h-4" />
          </button>

          {/* Staff Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsStaffMenuOpen(!isStaffMenuOpen)}
              className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200/80 border border-slate-200 transition-colors"
            >
              <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-[11px] font-bold">
                {currentStaff.name.charAt(0)}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-bold text-slate-800 leading-tight">
                  {currentStaff.name}
                </p>
                <span
                  className={`inline-block px-1 py-0.2 rounded text-[9px] font-bold uppercase border ${
                    roleColors[currentStaff.role] || 'bg-slate-100'
                  }`}
                >
                  {currentStaff.role}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            </button>

            {isStaffMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-60 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-1.5 border-b border-slate-100">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Quick Switch Staff
                  </p>
                </div>

                <div className="max-h-56 overflow-y-auto py-1">
                  {allStaff.map((staff) => (
                    <button
                      key={staff.id}
                      onClick={() => {
                        switchStaff(staff.id);
                        setIsStaffMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-1.5 text-left hover:bg-slate-50 transition-colors ${
                        staff.id === currentStaff.id ? 'bg-amber-50/70 font-semibold' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-bold">
                          {staff.name.charAt(0)}
                        </div>
                        <span className="text-xs text-slate-800">{staff.name}</span>
                      </div>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase border ${roleColors[staff.role]}`}
                      >
                        {staff.role}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="border-t border-slate-100 pt-1 mt-1 px-1">
                  <button
                    onClick={() => {
                      setIsStaffMenuOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded transition-colors font-medium"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <ShortcutsModal
        isOpen={isLocalShortcutsOpen}
        onClose={() => setIsLocalShortcutsOpen(false)}
      />
    </>
  );
};
