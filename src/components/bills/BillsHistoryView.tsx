import React, { useState } from 'react';
import {
  Receipt,
  Search,
  Filter,
  Calendar,
  Printer,
  Download,
  Eye,
  CreditCard,
  Building,
  DollarSign,
  Send,
} from 'lucide-react';
import { useRestaurant } from '../../context/RestaurantContext.tsx';
import { Bill, PaymentMethod } from '../../types/index.ts';
import { BillDetailModal } from './BillDetailModal.tsx';
import { downloadBillPDF, openPrintDialog } from '../../lib/pdfGenerator.ts';

export const BillsHistoryView: React.FC = () => {
  const { bills, settings } = useRestaurant();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedMethod, setSelectedMethod] = useState<string>('ALL');
  const [dateRange, setDateRange] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH'>('TODAY');
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);

  // Filter bills
  const safeBills = Array.isArray(bills) ? bills : [];
  const filteredBills = safeBills.filter((bill) => {
    if (!bill) return false;
    // Search query
    const matchesSearch =
      searchQuery === '' ||
      (bill.billNumber && bill.billNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (bill.customerName && bill.customerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (bill.customerPhone && bill.customerPhone.includes(searchQuery)) ||
      (bill.cashierName && bill.cashierName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (bill.tableName && bill.tableName.toLowerCase().includes(searchQuery.toLowerCase()));

    // Payment method
    const matchesMethod =
      selectedMethod === 'ALL' ||
      bill.payments?.some((p) => p.method === selectedMethod);

    // Date range
    const billDate = new Date(bill.createdAt);
    const now = new Date();
    let matchesDate = true;

    if (dateRange === 'TODAY') {
      matchesDate = billDate.toDateString() === now.toDateString();
    } else if (dateRange === 'WEEK') {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      matchesDate = billDate >= sevenDaysAgo;
    } else if (dateRange === 'MONTH') {
      matchesDate =
        billDate.getMonth() === now.getMonth() &&
        billDate.getFullYear() === now.getFullYear();
    }

    return matchesSearch && matchesMethod && matchesDate;
  });

  // Calculate metrics for filtered set
  const totalAmount = filteredBills.reduce((sum, b) => sum + Number(b.grandTotal || 0), 0);
  const totalTax = filteredBills.reduce((sum, b) => sum + (Number(b.cgst || 0) + Number(b.sgst || 0)), 0);
  const totalDiscount = filteredBills.reduce((sum, b) => sum + (Number(b.orderDiscount || 0) + Number(b.itemDiscounts || 0)), 0);

  return (
    <div className="flex-1 overflow-y-auto p-3 lg:p-4 bg-slate-50">
      <div className="max-w-7xl mx-auto space-y-3">
        {/* Top Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Bills Count</span>
            <div className="text-xl font-black text-slate-900 mt-0.5">{filteredBills.length}</div>
          </div>

          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Revenue</span>
            <div className="text-xl font-black text-amber-600 mt-0.5">₹{totalAmount.toFixed(2)}</div>
          </div>

          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Taxes (GST)</span>
            <div className="text-xl font-black text-slate-900 mt-0.5">₹{totalTax.toFixed(2)}</div>
          </div>

          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Discounts</span>
            <div className="text-xl font-black text-slate-900 mt-0.5">₹{totalDiscount.toFixed(2)}</div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-2.5">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search Bill #, Customer, Phone, Table, Cashier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white text-slate-900 font-medium"
            />
          </div>

          {/* Payment Method Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-md border border-slate-200">
            {['ALL', 'CASH', 'UPI', 'CARD'].map((m) => (
              <button
                key={m}
                onClick={() => setSelectedMethod(m)}
                className={`px-2.5 py-1 rounded text-xs font-bold transition-colors ${
                  selectedMethod === m
                    ? 'bg-amber-500 text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Date Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-md border border-slate-200">
            {(['TODAY', 'WEEK', 'MONTH', 'ALL'] as const).map((dr) => (
              <button
                key={dr}
                onClick={() => setDateRange(dr)}
                className={`px-2.5 py-1 rounded text-xs font-bold transition-colors ${
                  dateRange === dr
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                {dr === 'TODAY' ? 'Today' : dr === 'WEEK' ? '7 Days' : dr === 'MONTH' ? 'Month' : 'All'}
              </button>
            ))}
          </div>
        </div>

        {/* Bills Table */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 uppercase font-black tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3.5">Bill No</th>
                  <th className="py-2.5 px-3.5">Date & Time</th>
                  <th className="py-2.5 px-3.5">Type / Table</th>
                  <th className="py-2.5 px-3.5">Customer</th>
                  <th className="py-2.5 px-3.5">Items</th>
                  <th className="py-2.5 px-3.5">Payment</th>
                  <th className="py-2.5 px-3.5 text-right">Amount</th>
                  <th className="py-2.5 px-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBills.map((bill) => {
                  const paymentSummary =
                    bill.payments?.map((p) => p.method).join(' + ') || 'CASH';

                  return (
                    <tr key={bill.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3.5 font-mono font-black text-slate-900">
                        {bill.billNumber}
                      </td>
                      <td className="py-2.5 px-3.5 text-slate-600">
                        <div className="font-semibold">{new Date(bill.createdAt).toLocaleDateString('en-IN')}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {new Date(bill.createdAt).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>
                      <td className="py-2.5 px-3.5">
                        <span className="font-bold text-slate-800">
                          {bill.tableName || bill.orderType.toUpperCase()}
                        </span>
                        <div className="text-[10px] text-slate-500 uppercase font-semibold">
                          {bill.orderType}
                        </div>
                      </td>
                      <td className="py-2.5 px-3.5">
                        {bill.customerName ? (
                          <div>
                            <span className="font-semibold text-slate-900">
                              {bill.customerName}
                            </span>
                            {bill.customerPhone && (
                              <div className="text-[10px] text-slate-500 font-mono">
                                {bill.customerPhone}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic">Walk-in</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3.5 text-slate-600 font-medium">
                        {bill.items.length} item(s)
                      </td>
                      <td className="py-2.5 px-3.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-slate-100 text-slate-800 border border-slate-200">
                          {paymentSummary}
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-black text-slate-900 text-sm">
                        ₹{Number(bill.grandTotal || 0).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3.5">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setSelectedBill(bill)}
                            className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                            title="View Receipt"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openPrintDialog(bill, settings)}
                            className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                            title="Print Thermal / A4"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => downloadBillPDF(bill, settings)}
                            className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                            title="Download PDF"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredBills.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-500">
                      <Receipt className="w-7 h-7 text-slate-300 mx-auto mb-1.5" />
                      <p className="font-bold text-xs text-slate-700">No bills found</p>
                      <p className="text-[11px] text-slate-400">
                        Completed orders and settled bills will appear here.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Receipt Modal */}
        <BillDetailModal
          bill={selectedBill}
          onClose={() => setSelectedBill(null)}
        />
      </div>
    </div>
  );
};
