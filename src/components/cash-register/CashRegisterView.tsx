import React, { useState } from 'react';
import {
  Coins,
  Lock,
  Unlock,
  AlertCircle,
  CheckCircle2,
  Receipt,
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
} from 'lucide-react';
import { useRestaurant } from '../../context/RestaurantContext.tsx';

export const CashRegisterView: React.FC = () => {
  const {
    activeRegister,
    openCashRegister,
    closeCashRegister,
    openRegister,
    closeRegister,
    bills,
    expenses,
  } = useRestaurant();

  const [openingFloat, setOpeningFloat] = useState<number>(2000);
  const [actualCashInDrawer, setActualCashInDrawer] = useState<number>(0);
  const [closeNotes, setCloseNotes] = useState<string>('');
  const [isClosingConfirm, setIsClosingConfirm] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Compute live register stats if open
  let totalCashSales = 0;
  let totalCashExpenses = 0;

  const safeBills = Array.isArray(bills) ? bills : [];
  const safeExpenses = Array.isArray(expenses) ? expenses : [];

  if (activeRegister && activeRegister.status === 'OPEN') {
    const shiftTimeStr = activeRegister.openingTime || activeRegister.openedAt;
    const shiftStart = shiftTimeStr ? new Date(shiftTimeStr) : new Date(0);

    safeBills.forEach((b) => {
      if (b && new Date(b.createdAt) >= shiftStart) {
        b.payments?.forEach((p) => {
          if (p && p.method && p.method.toUpperCase() === 'CASH') {
            totalCashSales += (p.amount || 0);
          }
        });
      }
    });

    safeExpenses.forEach((e) => {
      const expDate = e.date || e.createdAt;
      if (e && expDate && new Date(expDate) >= shiftStart) {
        if (e.paymentMethod && e.paymentMethod.toUpperCase() === 'CASH') {
          totalCashExpenses += (e.amount || 0);
        }
      }
    });
  }

  const expectedDrawerCash = activeRegister
    ? activeRegister.openingCash + totalCashSales - totalCashExpenses
    : 0;

  const discrepancy = actualCashInDrawer - expectedDrawerCash;

  const handleOpen = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const openFn = openCashRegister || openRegister;
    if (!openFn) {
      setErrorMsg('Register open function is not available.');
      return;
    }
    try {
      setIsSubmitting(true);
      await openFn(openingFloat);
    } catch (err: any) {
      console.error('Failed to open cash register:', err);
      setErrorMsg(err?.message || 'Failed to open register.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = async () => {
    setErrorMsg('');
    const closeFn = closeCashRegister || closeRegister;
    if (!closeFn) {
      setErrorMsg('Register close function is not available.');
      return;
    }
    try {
      setIsSubmitting(true);
      await closeFn(actualCashInDrawer, closeNotes);
      setIsClosingConfirm(false);
    } catch (err: any) {
      console.error('Failed to close cash register:', err);
      setErrorMsg(err?.message || 'Failed to close register.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-3 lg:p-4 bg-slate-50">
      <div className="max-w-4xl mx-auto space-y-3">
        {/* Header */}
        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-slate-900 text-white flex items-center justify-center">
              <Coins className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">Cash Register & Shift Float</h2>
              <p className="text-[11px] text-slate-500 font-medium">
                Opening drawer float, cash reconciliation & shift closing audit
              </p>
            </div>
          </div>

          <span
            className={`px-2.5 py-1 rounded text-[10px] font-black tracking-wider uppercase border ${
              activeRegister?.status === 'OPEN'
                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}
          >
            {activeRegister?.status === 'OPEN' ? 'REGISTER OPEN' : 'REGISTER CLOSED'}
          </span>
        </div>

        {/* Global error banner */}
        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-300 rounded-lg text-xs font-bold text-red-800 flex items-center gap-2 shadow-2xs">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* REGISTER IS CLOSED: FORM TO OPEN */}
        {!activeRegister || activeRegister.status === 'CLOSED' ? (
          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-2xs text-center max-w-md mx-auto space-y-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto border border-amber-200">
              <Unlock className="w-5 h-5" />
            </div>

            <div>
              <h3 className="font-black text-sm text-slate-900 uppercase tracking-tight">Start Cash Shift</h3>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                Count the physical cash in the drawer (coins & petty notes) to start billing.
              </p>
            </div>

            <form onSubmit={handleOpen} className="space-y-3 text-left">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Opening Cash Float (₹)
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={openingFloat}
                  onChange={(e) => setOpeningFloat(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-lg font-black border border-slate-200 rounded-md bg-slate-50 text-center text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 active:scale-98 text-white font-black text-xs rounded-md shadow-2xs transition-all uppercase tracking-wider disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? 'Opening Drawer...' : 'Open Register Drawer'}
              </button>
            </form>
          </div>
        ) : (
          /* REGISTER IS OPEN: LIVE DRAWER RECONCILIATION */
          <div className="space-y-3">
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-md bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Opening Float
                  </span>
                  <div className="text-lg font-black text-slate-900 mt-0.5 font-mono">
                    ₹{activeRegister.openingCash.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                    {activeRegister.openingTime || activeRegister.openedAt
                      ? new Date(activeRegister.openingTime || activeRegister.openedAt!).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '--:--'}
                  </div>
                </div>

                <div className="p-3 rounded-md bg-emerald-50/80 border border-emerald-200">
                  <div className="flex items-center justify-between text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                    <span>Cash Sales (+)</span>
                    <ArrowDownRight className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  <div className="text-lg font-black text-emerald-900 mt-0.5 font-mono">
                    ₹{totalCashSales.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-emerald-700 mt-0.5 font-medium">From cash receipts</div>
                </div>

                <div className="p-3 rounded-md bg-rose-50/80 border border-rose-200">
                  <div className="flex items-center justify-between text-[10px] font-bold text-rose-800 uppercase tracking-wider">
                    <span>Cash Expenses (-)</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
                  </div>
                  <div className="text-lg font-black text-rose-900 mt-0.5 font-mono">
                    ₹{totalCashExpenses.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-rose-700 mt-0.5 font-medium">Raw material / petty cash</div>
                </div>

                <div className="p-3 rounded-md bg-slate-900 text-white">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Expected in Drawer
                  </span>
                  <div className="text-lg font-black text-amber-400 mt-0.5 font-mono">
                    ₹{expectedDrawerCash.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 font-medium">Calculated total</div>
                </div>
              </div>

              {/* End of Shift Reconciliation Form */}
              <div className="border-t border-slate-200 pt-3.5 space-y-3">
                <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                  End of Shift Physical Cash Count
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Actual Counted Cash in Drawer (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={actualCashInDrawer || ''}
                      onChange={(e) => setActualCashInDrawer(parseFloat(e.target.value) || 0)}
                      placeholder="Enter physical count"
                      className="w-full px-3 py-1.5 text-sm font-black border border-slate-200 rounded-md bg-slate-50 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Cash Discrepancy (Variance)
                    </label>
                    <div
                      className={`px-3 py-1.5 rounded-md border text-xs font-black flex items-center justify-between ${
                        discrepancy === 0
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : discrepancy < 0
                          ? 'bg-rose-50 text-rose-800 border-rose-300'
                          : 'bg-blue-50 text-blue-800 border-blue-300'
                      }`}
                    >
                      <span>
                        {discrepancy === 0
                          ? 'Exact Match (₹0.00)'
                          : discrepancy < 0
                          ? `Shortage: -₹${Math.abs(discrepancy).toFixed(2)}`
                          : `Excess: +₹${discrepancy.toFixed(2)}`}
                      </span>
                      {discrepancy === 0 ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <AlertCircle className="w-4 h-4" />
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Shift Closing Notes
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Shift handover notes or explanation for any cash variance..."
                    value={closeNotes}
                    onChange={(e) => setCloseNotes(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-md bg-slate-50 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    onClick={() => setIsClosingConfirm(true)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-black shadow-2xs transition-colors uppercase tracking-wider"
                  >
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Close Shift & Lock Register</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Confirmation Modal */}
            {isClosingConfirm && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-4 space-y-3 border border-slate-200">
                  <h3 className="font-black text-sm text-slate-900 uppercase tracking-tight">
                    Confirm Shift Close & Lock
                  </h3>
                  <p className="text-xs text-slate-600 font-medium">
                    This will finalize today's cash shift with expected cash of{' '}
                    <strong>₹{expectedDrawerCash.toFixed(2)}</strong> and actual cash count of{' '}
                    <strong>₹{actualCashInDrawer.toFixed(2)}</strong>.
                  </p>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => setIsClosingConfirm(false)}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 font-bold disabled:opacity-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleClose}
                      className="px-3.5 py-1.5 text-xs font-black bg-slate-900 text-white rounded-md hover:bg-slate-800 uppercase tracking-wider disabled:opacity-50 cursor-pointer"
                    >
                      {isSubmitting ? 'Closing Shift...' : 'Confirm Close'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
