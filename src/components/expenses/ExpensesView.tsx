import React, { useState } from 'react';
import {
  DollarSign,
  Plus,
  Calendar,
  CreditCard,
  Banknote,
  QrCode,
  Tag,
  ReceiptText,
} from 'lucide-react';
import { useRestaurant } from '../../context/RestaurantContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { Expense } from '../../types/index.ts';

export const ExpensesView: React.FC = () => {
  const { expenses, addExpense } = useRestaurant();
  const { currentStaff } = useAuth();

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  const [newExpense, setNewExpense] = useState<Partial<Expense>>({
    category: 'Vegetables & Groceries',
    amount: 500,
    paymentMethod: 'CASH',
    notes: '',
    receiptUrl: '',
  });

  const categories = [
    'ALL',
    'Vegetables & Groceries',
    'Dairy & Meat',
    'LPG Gas & Fuel',
    'Packaging & Disposables',
    'Staff Advance / Salary',
    'Electricity & Water',
    'Maintenance & Repairs',
    'Hookah Flavours & Coals',
    'Miscellaneous',
  ];

  const safeExpenses = Array.isArray(expenses) ? expenses : [];

  const filteredExpenses = safeExpenses.filter(
    (e) => e && (categoryFilter === 'ALL' || e.category === categoryFilter)
  );

  const totalExpenseAmount = filteredExpenses.reduce((sum, e) => sum + (e?.amount || 0), 0);

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpense.amount || !newExpense.category) return;
    try {
      await addExpense(newExpense);
      setIsModalOpen(false);
      setNewExpense({
        category: 'Vegetables & Groceries',
        amount: 500,
        paymentMethod: 'CASH',
        notes: '',
        receiptUrl: '',
      });
    } catch (err) {
      console.error('Failed to log expense:', err);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-3 lg:p-4 bg-slate-50">
      <div className="max-w-7xl mx-auto space-y-3">
        {/* Header */}
        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-slate-900 text-white flex items-center justify-center">
              <ReceiptText className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">Operational Expenses</h2>
              <p className="text-[11px] text-slate-500 font-medium">
                Log purchases, kitchen raw materials, LPG gas, salaries & daily cash outflow
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Filtered Total:</span>
              <div className="text-base font-black text-amber-600 font-mono">
                ₹{totalExpenseAmount.toFixed(2)}
              </div>
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-black transition-colors shadow-2xs uppercase tracking-wider"
            >
              <Plus className="w-3.5 h-3.5 text-amber-400" />
              <span>Record Expense</span>
            </button>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 bg-white p-2 rounded-lg border border-slate-200 shadow-2xs scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-2.5 py-1 text-[11px] font-bold rounded transition-colors whitespace-nowrap ${
                categoryFilter === cat
                  ? 'bg-amber-500 text-slate-900 shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Expenses Table */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 uppercase font-black text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3.5">Date & Time</th>
                  <th className="py-2.5 px-3.5">Category</th>
                  <th className="py-2.5 px-3.5">Notes / Vendor</th>
                  <th className="py-2.5 px-3.5">Logged By</th>
                  <th className="py-2.5 px-3.5">Payment Mode</th>
                  <th className="py-2.5 px-3.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3.5 text-slate-600 font-mono text-[11px]">
                      {new Date(exp.date).toLocaleDateString('en-IN')}
                    </td>
                    <td className="py-2.5 px-3.5 font-bold text-slate-800">{exp.category}</td>
                    <td className="py-2.5 px-3.5 text-slate-600">{exp.notes || '—'}</td>
                    <td className="py-2.5 px-3.5 text-slate-600 font-medium">{exp.recordedByName}</td>
                    <td className="py-2.5 px-3.5">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-slate-100 text-slate-800 border border-slate-200">
                        {exp.paymentMethod}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-black text-slate-900 font-mono text-sm">
                      ₹{Number(exp.amount || 0).toFixed(2)}
                    </td>
                  </tr>
                ))}

                {filteredExpenses.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                      No expenses recorded for this category yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Record Expense Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-4 border border-slate-200">
              <h3 className="font-black text-sm text-slate-900 mb-3 uppercase tracking-tight">Record Restaurant Expense</h3>

              <form onSubmit={handleSaveExpense} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 uppercase text-[10px] tracking-wider mb-1">Category *</label>
                  <select
                    value={newExpense.category || ''}
                    onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-md bg-slate-50 text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {categories.filter((c) => c !== 'ALL').map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase text-[10px] tracking-wider mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newExpense.amount || ''}
                    onChange={(e) =>
                      setNewExpense({ ...newExpense, amount: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-1.5 text-sm font-black border border-slate-200 rounded-md bg-slate-50 text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase text-[10px] tracking-wider mb-1">
                    Paid From (Method)
                  </label>
                  <select
                    value={newExpense.paymentMethod || 'CASH'}
                    onChange={(e) =>
                      setNewExpense({
                        ...newExpense,
                        paymentMethod: e.target.value as any,
                      })
                    }
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-md bg-slate-50 text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="CASH">Cash Drawer</option>
                    <option value="UPI">UPI / GPay</option>
                    <option value="BANK TRANSFER">Bank Account</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase text-[10px] tracking-wider mb-1">
                    Vendor / Note / Voucher #
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 19kg Commercial Cylinder, 50kg Atta..."
                    value={newExpense.notes || ''}
                    onChange={(e) => setNewExpense({ ...newExpense, notes: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-md bg-slate-50 text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-md shadow-2xs uppercase tracking-wider"
                  >
                    Save Expense
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
