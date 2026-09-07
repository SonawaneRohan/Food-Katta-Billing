import React from 'react';
import {
  TrendingUp,
  Receipt,
  Users,
  Utensils,
  DollarSign,
  QrCode,
  CreditCard,
  Banknote,
  ArrowUpRight,
  Sparkles,
  ShoppingBag,
} from 'lucide-react';
import { useRestaurant } from '../../context/RestaurantContext.tsx';

interface DashboardViewProps {
  onNavigateToPos: () => void;
  onNavigateToTables: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigateToPos,
  onNavigateToTables,
}) => {
  const { bills, tables, products, categories, activeRegister } = useRestaurant();

  // Calculate today's metrics
  const safeBills = Array.isArray(bills) ? bills : [];
  const safeTables = Array.isArray(tables) ? tables : [];
  const todayStr = new Date().toDateString();
  const todayBills = safeBills.filter((b) => b && new Date(b.createdAt).toDateString() === todayStr);

  const todayRevenue = todayBills.reduce((sum, b) => sum + (b.grandTotal || 0), 0);
  const totalBillsCount = todayBills.length;
  const avgBillValue = totalBillsCount > 0 ? todayRevenue / totalBillsCount : 0;

  // Payment method breakdown
  let cashTotal = 0;
  let upiTotal = 0;
  let cardTotal = 0;

  todayBills.forEach((b) => {
    b.payments?.forEach((p) => {
      if (p.method === 'CASH') cashTotal += p.amount;
      else if (p.method === 'UPI') upiTotal += p.amount;
      else if (p.method === 'CARD') cardTotal += p.amount;
    });
  });

  // Top selling dishes today
  const itemMap: Record<string, { name: string; quantity: number; revenue: number }> = {};
  todayBills.forEach((b) => {
    b.items?.forEach((item) => {
      if (!item) return;
      if (!itemMap[item.name]) {
        itemMap[item.name] = { name: item.name, quantity: 0, revenue: 0 };
      }
      itemMap[item.name].quantity += item.quantity;
      itemMap[item.name].revenue += item.price * item.quantity;
    });
  });

  const topItems = Object.values(itemMap)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  const occupiedTables = safeTables.filter((t) => t && t.status !== 'AVAILABLE').length;

  return (
    <div className="flex-1 overflow-y-auto p-3 lg:p-4 bg-slate-50">
      <div className="max-w-7xl mx-auto space-y-3">
        {/* Top Welcome & Quick Actions */}
        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-slate-900 tracking-tight">Food Katta Operations</h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase tracking-wide">
                Live Terminal
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Real-time daily restaurant metrics, billing totals and table turnover
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onNavigateToTables}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-md text-xs font-bold transition-colors border border-slate-200"
            >
              View Tables ({occupiedTables}/{safeTables.length})
            </button>

            <button
              onClick={onNavigateToPos}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-black transition-all shadow-2xs"
            >
              <Receipt className="w-3.5 h-3.5 text-amber-400" />
              <span>Open POS Billing (F1)</span>
            </button>
          </div>
        </div>

        {/* 4 Core KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider">Today's Revenue</span>
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="text-xl font-black text-amber-600">
              ₹{todayRevenue.toFixed(2)}
            </div>
            <div className="text-[10px] text-emerald-700 font-bold mt-0.5 flex items-center gap-0.5">
              <ArrowUpRight className="w-3 h-3" />
              <span>Real-time settled sales</span>
            </div>
          </div>

          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider">Bills Settled</span>
              <Receipt className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div className="text-xl font-black text-slate-900">{totalBillsCount}</div>
            <div className="text-[10px] text-slate-500 mt-0.5 font-medium">Invoices generated today</div>
          </div>

          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider">Average Ticket</span>
              <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <div className="text-xl font-black text-slate-900">
              ₹{avgBillValue.toFixed(0)}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5 font-medium">Average order value</div>
          </div>

          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider">Floor Occupancy</span>
              <Utensils className="w-3.5 h-3.5 text-purple-600" />
            </div>
            <div className="text-xl font-black text-slate-900">
              {safeTables.length > 0 ? Math.round((occupiedTables / safeTables.length) * 100) : 0}%
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5 font-medium">
              {occupiedTables} of {safeTables.length} tables seated
            </div>
          </div>
        </div>

        {/* Payment Split & Top Sellers Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* Payment Method Breakdown */}
          <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs space-y-3">
            <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider">Payment Methods Breakdown</h3>

            <div className="grid grid-cols-3 gap-2">
              <div className="p-2.5 bg-blue-50/80 rounded-md border border-blue-200 text-center">
                <QrCode className="w-4 h-4 text-blue-600 mx-auto mb-0.5" />
                <span className="text-[10px] font-black text-blue-800 uppercase">UPI / QR</span>
                <div className="text-sm font-black text-slate-900 mt-0.5 font-mono">
                  ₹{upiTotal.toFixed(0)}
                </div>
              </div>

              <div className="p-2.5 bg-emerald-50/80 rounded-md border border-emerald-200 text-center">
                <Banknote className="w-4 h-4 text-emerald-600 mx-auto mb-0.5" />
                <span className="text-[10px] font-black text-emerald-800 uppercase">Cash</span>
                <div className="text-sm font-black text-slate-900 mt-0.5 font-mono">
                  ₹{cashTotal.toFixed(0)}
                </div>
              </div>

              <div className="p-2.5 bg-purple-50/80 rounded-md border border-purple-200 text-center">
                <CreditCard className="w-4 h-4 text-purple-600 mx-auto mb-0.5" />
                <span className="text-[10px] font-black text-purple-800 uppercase">Card</span>
                <div className="text-sm font-black text-slate-900 mt-0.5 font-mono">
                  ₹{cardTotal.toFixed(0)}
                </div>
              </div>
            </div>

            {/* Visual ratio bar */}
            {todayRevenue > 0 && (
              <div className="space-y-1 pt-1">
                <div className="h-2 w-full rounded-full overflow-hidden flex bg-slate-100">
                  <div
                    style={{ width: `${(upiTotal / todayRevenue) * 100}%` }}
                    className="bg-blue-500 h-full"
                    title={`UPI: ₹${upiTotal}`}
                  />
                  <div
                    style={{ width: `${(cashTotal / todayRevenue) * 100}%` }}
                    className="bg-emerald-500 h-full"
                    title={`Cash: ₹${cashTotal}`}
                  />
                  <div
                    style={{ width: `${(cardTotal / todayRevenue) * 100}%` }}
                    className="bg-purple-500 h-full"
                    title={`Card: ₹${cardTotal}`}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-bold text-slate-500">
                  <span>UPI: {Math.round((upiTotal / todayRevenue) * 100)}%</span>
                  <span>Cash: {Math.round((cashTotal / todayRevenue) * 100)}%</span>
                  <span>Card: {Math.round((cardTotal / todayRevenue) * 100)}%</span>
                </div>
              </div>
            )}
          </div>

          {/* Top Selling Items */}
          <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs space-y-2.5">
            <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider">Today's Best Sellers</h3>

            <div className="space-y-1.5">
              {topItems.length > 0 ? (
                topItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-md bg-slate-50 border border-slate-200 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded bg-slate-900 text-white font-black text-[10px] flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="font-bold text-slate-800">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-slate-900">{item.quantity} sold</span>
                      <span className="text-slate-500 ml-1.5 font-mono text-[11px]">
                        (₹{item.revenue.toFixed(0)})
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-slate-400 text-xs">
                  No sales recorded today yet. Start billing orders to view rankings!
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Bills Stream */}
        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs space-y-2.5">
          <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider">Recent Completed Invoices</h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 uppercase font-black text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3">Bill No</th>
                  <th className="py-2 px-3">Time</th>
                  <th className="py-2 px-3">Table / Type</th>
                  <th className="py-2 px-3">Customer</th>
                  <th className="py-2 px-3">Payment</th>
                  <th className="py-2 px-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {safeBills.slice(0, 5).map((bill) => (
                  <tr key={bill.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2 px-3 font-mono font-black text-slate-900">
                      {bill.billNumber}
                    </td>
                    <td className="py-2 px-3 text-slate-500 font-mono text-[11px]">
                      {new Date(bill.createdAt).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-2 px-3 font-bold text-slate-800">
                      {bill.tableName || bill.orderType.toUpperCase()}
                    </td>
                    <td className="py-2 px-3 text-slate-600 font-medium">
                      {bill.customerName || <span className="italic text-slate-400">Walk-in</span>}
                    </td>
                    <td className="py-2 px-3">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-slate-100 text-slate-800 border border-slate-200">
                        {bill.payments?.map((p) => p.method).join(' + ') || 'CASH'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right font-black text-slate-900 font-mono">
                      ₹{bill.grandTotal.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
