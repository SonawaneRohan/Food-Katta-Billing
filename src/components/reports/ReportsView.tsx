import React, { useState } from 'react';
import {
  BarChart3,
  Download,
  Calendar,
  DollarSign,
  Receipt,
  Layers,
  Users,
  Percent,
  TrendingUp,
} from 'lucide-react';
import { useRestaurant } from '../../context/RestaurantContext.tsx';
import { Bill } from '../../types/index.ts';

export const ReportsView: React.FC = () => {
  const { bills, settings } = useRestaurant();

  const [dateFilter, setDateFilter] = useState<'TODAY' | 'WEEK' | 'MONTH' | 'ALL'>('TODAY');
  const [activeReportTab, setActiveReportTab] = useState<
    'SALES' | 'ITEMS' | 'PAYMENTS' | 'TAX' | 'STAFF'
  >('SALES');

  // Filter bills by selected date range
  const now = new Date();
  const safeBills = Array.isArray(bills) ? bills : [];
  const filteredBills = safeBills.filter((b) => {
    if (!b) return false;
    const d = new Date(b.createdAt);
    if (dateFilter === 'TODAY') {
      return d.toDateString() === now.toDateString();
    } else if (dateFilter === 'WEEK') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return d >= weekAgo;
    } else if (dateFilter === 'MONTH') {
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }
    return true;
  });

  // 1. Sales Summary Metrics
  const grossSales = filteredBills.reduce((sum, b) => sum + b.subtotal, 0);
  const discounts = filteredBills.reduce((sum, b) => sum + (b.orderDiscount + b.itemDiscounts), 0);
  const cgst = filteredBills.reduce((sum, b) => sum + b.cgst, 0);
  const sgst = filteredBills.reduce((sum, b) => sum + b.sgst, 0);
  const netRevenue = filteredBills.reduce((sum, b) => sum + b.grandTotal, 0);
  const totalBills = filteredBills.length;
  const avgBill = totalBills > 0 ? netRevenue / totalBills : 0;

  // 2. Item Wise Breakdown
  const itemMap: Record<
    string,
    { name: string; category: string; quantity: number; revenue: number }
  > = {};
  filteredBills.forEach((b) => {
    b.items.forEach((item) => {
      if (!itemMap[item.productId]) {
        itemMap[item.productId] = {
          name: item.name,
          category: item.categoryName,
          quantity: 0,
          revenue: 0,
        };
      }
      itemMap[item.productId].quantity += item.quantity;
      itemMap[item.productId].revenue += item.price * item.quantity;
    });
  });
  const itemReports = Object.values(itemMap).sort((a, b) => b.revenue - a.revenue);

  // 3. Payment Mode Breakdown
  let cashTotal = 0;
  let upiTotal = 0;
  let cardTotal = 0;
  filteredBills.forEach((b) => {
    b.payments?.forEach((p) => {
      if (p.method === 'CASH') cashTotal += p.amount;
      else if (p.method === 'UPI') upiTotal += p.amount;
      else if (p.method === 'CARD') cardTotal += p.amount;
    });
  });

  // 4. Staff Performance
  const staffMap: Record<string, { name: string; billsCount: number; totalAmount: number }> = {};
  filteredBills.forEach((b) => {
    const cashier = b.cashierName || 'Counter';
    if (!staffMap[cashier]) {
      staffMap[cashier] = { name: cashier, billsCount: 0, totalAmount: 0 };
    }
    staffMap[cashier].billsCount += 1;
    staffMap[cashier].totalAmount += b.grandTotal;
  });
  const staffReports = Object.values(staffMap);

  // CSV Export Utility
  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';

    if (activeReportTab === 'SALES') {
      csvContent += 'Bill Number,Date,Order Type,Table,Customer,Subtotal,Discount,CGST,SGST,Grand Total,Cashier\n';
      filteredBills.forEach((b) => {
        csvContent += `"${b.billNumber}","${b.createdAt}","${b.orderType}","${b.tableName || ''}","${b.customerName || ''}",${b.subtotal},${b.orderDiscount},${b.cgst},${b.sgst},${b.grandTotal},"${b.cashierName}"\n`;
      });
    } else if (activeReportTab === 'ITEMS') {
      csvContent += 'Item Name,Category,Units Sold,Total Revenue (INR)\n';
      itemReports.forEach((i) => {
        csvContent += `"${i.name}","${i.category}",${i.quantity},${i.revenue}\n`;
      });
    } else if (activeReportTab === 'PAYMENTS') {
      csvContent += 'Payment Method,Total Amount (INR)\n';
      csvContent += `Cash,${cashTotal}\nUPI / QR,${upiTotal}\nCard,${cardTotal}\n`;
    } else if (activeReportTab === 'TAX') {
      csvContent += 'Tax Component,Rate,Collected Amount (INR)\n';
      csvContent += `CGST,${settings.cgstRate || 2.5}%,${cgst}\nSGST,${settings.sgstRate || 2.5}%,${sgst}\nTotal GST,${(settings.cgstRate || 2.5) + (settings.sgstRate || 2.5)}%,${cgst + sgst}\n`;
    } else if (activeReportTab === 'STAFF') {
      csvContent += 'Staff Name,Bills Punched,Total Sales (INR)\n';
      staffReports.forEach((s) => {
        csvContent += `"${s.name}",${s.billsCount},${s.totalAmount}\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Food_Katta_Report_${activeReportTab}_${dateFilter}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-neutral-100">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-neutral-900 text-white flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900">Analytics & Reports</h2>
              <p className="text-xs text-neutral-500">
                Audited sales performance, GST reports, item analytics & staff productivity
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Date filter */}
            <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-lg">
              {(['TODAY', 'WEEK', 'MONTH', 'ALL'] as const).map((df) => (
                <button
                  key={df}
                  onClick={() => setDateFilter(df)}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
                    dateFilter === df
                      ? 'bg-neutral-900 text-white shadow-xs'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  {df === 'TODAY' ? 'Today' : df === 'WEEK' ? 'This Week' : df === 'MONTH' ? 'This Month' : 'All Time'}
                </button>
              ))}
            </div>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
            >
              <Download className="w-4 h-4 text-amber-400" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Report Sub-Tabs */}
        <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-neutral-200 shadow-xs overflow-x-auto">
          {[
            { id: 'SALES', label: 'Sales Summary', icon: Receipt },
            { id: 'ITEMS', label: 'Item-Wise Sales', icon: Layers },
            { id: 'PAYMENTS', label: 'Payment Modes', icon: DollarSign },
            { id: 'TAX', label: 'GST Tax Collection', icon: Percent },
            { id: 'STAFF', label: 'Staff Performance', icon: Users },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveReportTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                  activeReportTab === tab.id
                    ? 'bg-neutral-900 text-white'
                    : 'text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: SALES SUMMARY */}
        {activeReportTab === 'SALES' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-2xs">
                <span className="text-xs font-semibold text-neutral-500 uppercase">Gross Sales</span>
                <div className="text-2xl font-black text-neutral-900 mt-1">₹{grossSales.toFixed(2)}</div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-2xs">
                <span className="text-xs font-semibold text-neutral-500 uppercase">Total Discounts</span>
                <div className="text-2xl font-black text-rose-600 mt-1">-₹{discounts.toFixed(2)}</div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-2xs">
                <span className="text-xs font-semibold text-neutral-500 uppercase">Total GST (5%)</span>
                <div className="text-2xl font-black text-blue-600 mt-1">₹{(cgst + sgst).toFixed(2)}</div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-2xs">
                <span className="text-xs font-semibold text-neutral-500 uppercase">Net Revenue</span>
                <div className="text-2xl font-black text-emerald-700 mt-1">₹{netRevenue.toFixed(2)}</div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-neutral-200 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-neutral-200 flex justify-between items-center">
                <h3 className="font-bold text-xs text-neutral-900">
                  Transactions List ({filteredBills.length} invoices)
                </h3>
                <span className="text-xs text-neutral-500">
                  Average Ticket: <strong>₹{avgBill.toFixed(0)}</strong>
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-50 text-neutral-600 font-bold border-b border-neutral-200">
                    <tr>
                      <th className="py-2.5 px-3">Bill No</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Table/Type</th>
                      <th className="py-2.5 px-3">Cashier</th>
                      <th className="py-2.5 px-3 text-right">Subtotal</th>
                      <th className="py-2.5 px-3 text-right">Discount</th>
                      <th className="py-2.5 px-3 text-right">GST</th>
                      <th className="py-2.5 px-3 text-right">Grand Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {filteredBills.map((b) => (
                      <tr key={b.id} className="hover:bg-neutral-50">
                        <td className="py-2.5 px-3 font-mono font-bold text-neutral-900">{b.billNumber}</td>
                        <td className="py-2.5 px-3 text-neutral-600">{new Date(b.createdAt).toLocaleDateString('en-IN')}</td>
                        <td className="py-2.5 px-3">{b.tableName || b.orderType}</td>
                        <td className="py-2.5 px-3 text-neutral-600">{b.cashierName}</td>
                        <td className="py-2.5 px-3 text-right">₹{b.subtotal.toFixed(0)}</td>
                        <td className="py-2.5 px-3 text-right text-rose-600">-₹{b.orderDiscount.toFixed(0)}</td>
                        <td className="py-2.5 px-3 text-right">₹{(b.cgst + b.sgst).toFixed(0)}</td>
                        <td className="py-2.5 px-3 text-right font-black text-neutral-900">₹{b.grandTotal.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ITEM-WISE SALES */}
        {activeReportTab === 'ITEMS' && (
          <div className="bg-white rounded-xl border border-neutral-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-neutral-200">
              <h3 className="font-bold text-xs text-neutral-900">
                Dishes & Items Sold ({itemReports.length} unique items)
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 text-neutral-600 font-bold border-b border-neutral-200">
                  <tr>
                    <th className="py-2.5 px-3">Item Name</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3 text-center">Units Sold</th>
                    <th className="py-2.5 px-3 text-right">Revenue Generated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {itemReports.map((i, idx) => (
                    <tr key={idx} className="hover:bg-neutral-50">
                      <td className="py-2.5 px-3 font-bold text-neutral-900">{i.name}</td>
                      <td className="py-2.5 px-3 text-neutral-600">{i.category}</td>
                      <td className="py-2.5 px-3 text-center font-bold">{i.quantity}</td>
                      <td className="py-2.5 px-3 text-right font-black text-neutral-900">
                        ₹{i.revenue.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: PAYMENT MODES */}
        {activeReportTab === 'PAYMENTS' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-2xs space-y-2">
              <span className="text-xs font-semibold text-neutral-500 uppercase">Cash In Drawer</span>
              <div className="text-2xl font-black text-neutral-900">₹{cashTotal.toFixed(2)}</div>
              <p className="text-xs text-neutral-500">
                {netRevenue > 0 ? Math.round((cashTotal / netRevenue) * 100) : 0}% of settled sales
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-2xs space-y-2">
              <span className="text-xs font-semibold text-neutral-500 uppercase">UPI / QR Digital</span>
              <div className="text-2xl font-black text-blue-600">₹{upiTotal.toFixed(2)}</div>
              <p className="text-xs text-neutral-500">
                {netRevenue > 0 ? Math.round((upiTotal / netRevenue) * 100) : 0}% of settled sales
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-2xs space-y-2">
              <span className="text-xs font-semibold text-neutral-500 uppercase">Credit / Debit Cards</span>
              <div className="text-2xl font-black text-purple-600">₹{cardTotal.toFixed(2)}</div>
              <p className="text-xs text-neutral-500">
                {netRevenue > 0 ? Math.round((cardTotal / netRevenue) * 100) : 0}% of settled sales
              </p>
            </div>
          </div>
        )}

        {/* TAB 4: GST TAX REPORT */}
        {activeReportTab === 'TAX' && (
          <div className="bg-white rounded-xl border border-neutral-200 shadow-xs p-5 space-y-4">
            <h3 className="font-bold text-sm text-neutral-900">GST Tax Liability Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200">
                <span className="text-xs text-neutral-500">CGST Collected (2.5%)</span>
                <div className="text-xl font-black text-neutral-900 mt-1">₹{cgst.toFixed(2)}</div>
              </div>
              <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200">
                <span className="text-xs text-neutral-500">SGST Collected (2.5%)</span>
                <div className="text-xl font-black text-neutral-900 mt-1">₹{sgst.toFixed(2)}</div>
              </div>
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                <span className="text-xs text-emerald-700 font-semibold">Total GST Collection</span>
                <div className="text-xl font-black text-emerald-900 mt-1">₹{(cgst + sgst).toFixed(2)}</div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: STAFF PRODUCTIVITY */}
        {activeReportTab === 'STAFF' && (
          <div className="bg-white rounded-xl border border-neutral-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 text-neutral-600 font-bold border-b border-neutral-200">
                  <tr>
                    <th className="py-2.5 px-3">Staff / Cashier</th>
                    <th className="py-2.5 px-3 text-center">Invoices Billed</th>
                    <th className="py-2.5 px-3 text-right">Total Revenue Billed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {staffReports.map((s, idx) => (
                    <tr key={idx} className="hover:bg-neutral-50">
                      <td className="py-2.5 px-3 font-bold text-neutral-900">{s.name}</td>
                      <td className="py-2.5 px-3 text-center font-semibold">{s.billsCount}</td>
                      <td className="py-2.5 px-3 text-right font-black text-neutral-900">
                        ₹{s.totalAmount.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
