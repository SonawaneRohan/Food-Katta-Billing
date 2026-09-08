import React, { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase.ts';
import { Bill, RestaurantSettings } from '../../types/index.ts';
import { downloadBillPDF, openPrintDialog } from '../../lib/pdfGenerator.ts';
import { FileText, Download, Printer, ArrowLeft, CheckCircle2, Phone, MapPin, Store } from 'lucide-react';

interface PublicBillViewProps {
  billId: string;
  settings: RestaurantSettings;
  onBackToPos: () => void;
}

export const PublicBillView: React.FC<PublicBillViewProps> = ({
  billId,
  settings,
  onBackToPos,
}) => {
  const [bill, setBill] = useState<Bill | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBill() {
      try {
        setLoading(true);
        const billDocRef = doc(db, 'bills', billId);
        const snap = await getDoc(billDocRef);
        if (snap.exists()) {
          setBill({ id: snap.id, ...(snap.data() as Omit<Bill, 'id'>) });
        } else {
          setError(`Invoice record #${billId} could not be found.`);
        }
      } catch (err: any) {
        console.error('Error fetching public bill:', err);
        setError('Failed to load bill details. Please check your internet connection.');
      } finally {
        setLoading(false);
      }
    }

    if (billId) {
      fetchBill();
    }
  }, [billId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm font-bold text-slate-700">Loading Official PDF Invoice...</p>
      </div>
    );
  }

  if (error || !bill) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 text-center">
        <div className="bg-white p-6 rounded-2xl shadow-md max-w-sm w-full border border-slate-200">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-3">
            <FileText className="w-6 h-6" />
          </div>
          <h2 className="text-base font-black text-slate-900 mb-1">Invoice Not Available</h2>
          <p className="text-xs text-slate-600 mb-4">{error || 'Bill could not be found.'}</p>
          <button
            type="button"
            onClick={onBackToPos}
            className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors"
          >
            Go to Billing System
          </button>
        </div>
      </div>
    );
  }

  const subtotal = Number(bill.subtotal || 0);
  const orderDiscount = Number(bill.orderDiscount || 0);
  const cgst = Number(bill.cgst || 0);
  const sgst = Number(bill.sgst || 0);
  const grandTotal = Number(bill.grandTotal || 0);

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-3 sm:px-4 flex flex-col items-center font-sans">
      {/* Top action header */}
      <div className="w-full max-w-md flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={onBackToPos}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to POS</span>
        </button>

        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          Verified Official Bill
        </span>
      </div>

      {/* Main Receipt Container */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Receipt Header Banner */}
        <div className="bg-emerald-700 p-5 text-white text-center">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-2 text-white">
            <Store className="w-5 h-5" />
          </div>
          <h1 className="text-lg font-black uppercase tracking-wide">
            {settings.restaurantName || 'Food Katta Restaurant'}
          </h1>
          {settings.tagline && (
            <p className="text-[11px] text-emerald-100 mt-0.5">{settings.tagline}</p>
          )}

          <div className="mt-2 text-[11px] text-emerald-100 flex flex-col items-center gap-0.5">
            {settings.address && (
              <span className="flex items-center gap-1 justify-center">
                <MapPin className="w-3 h-3 shrink-0" />
                <span>{settings.address}</span>
              </span>
            )}
            {settings.phone && (
              <span className="flex items-center gap-1 justify-center">
                <Phone className="w-3 h-3 shrink-0" />
                <span>Ph: {settings.phone}</span>
              </span>
            )}
          </div>
        </div>

        {/* Bill Metadata */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 text-xs text-slate-600 space-y-1">
          <div className="flex justify-between font-bold text-slate-900">
            <span>Invoice No:</span>
            <span className="font-mono text-emerald-800 font-black">{bill.billNumber}</span>
          </div>
          <div className="flex justify-between">
            <span>Date & Time:</span>
            <span>
              {new Date(bill.createdAt || Date.now()).toLocaleString('en-IN', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Order Type:</span>
            <span className="font-semibold uppercase">
              {bill.orderType}
              {bill.tableName ? ` (Table ${bill.tableName})` : ''}
            </span>
          </div>
          {bill.customerName && (
            <div className="flex justify-between">
              <span>Customer:</span>
              <span className="font-semibold">{bill.customerName}</span>
            </div>
          )}
        </div>

        {/* Items List */}
        <div className="p-4">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-400 uppercase text-[10px] border-b border-slate-200 pb-1">
                <th className="text-left font-bold py-1">Item</th>
                <th className="text-center font-bold py-1">Qty</th>
                <th className="text-right font-bold py-1">Rate</th>
                <th className="text-right font-bold py-1">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bill.items.map((item, idx) => {
                const qty = Number(item.quantity || 1);
                const price = Number(item.price || 0);
                const amount = qty * price;
                return (
                  <tr key={idx} className="py-2">
                    <td className="py-2 pr-2">
                      <div className="font-bold text-slate-800">{item.name}</div>
                      {item.modifiers && item.modifiers.length > 0 && (
                        <div className="text-[10px] text-slate-500">
                          {item.modifiers.join(', ')}
                        </div>
                      )}
                    </td>
                    <td className="py-2 text-center text-slate-600 font-semibold">{qty}</td>
                    <td className="py-2 text-right text-slate-600 font-mono">₹{price.toFixed(2)}</td>
                    <td className="py-2 text-right font-bold text-slate-900 font-mono">
                      ₹{amount.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Totals */}
          <div className="mt-4 pt-3 border-t border-dashed border-slate-300 space-y-1 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-mono">₹{subtotal.toFixed(2)}</span>
            </div>

            {orderDiscount > 0 && (
              <div className="flex justify-between text-rose-600 font-medium">
                <span>Discount:</span>
                <span className="font-mono">-₹{orderDiscount.toFixed(2)}</span>
              </div>
            )}

            {cgst > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>CGST ({settings.cgstRate || 0}%):</span>
                <span className="font-mono">₹{cgst.toFixed(2)}</span>
              </div>
            )}

            {sgst > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>SGST ({settings.sgstRate || 0}%):</span>
                <span className="font-mono">₹{sgst.toFixed(2)}</span>
              </div>
            )}

            {/* Grand Total Highlight */}
            <div className="mt-2 pt-2 border-t border-slate-200 flex justify-between items-baseline font-black">
              <span className="text-sm text-slate-900 uppercase">Grand Total:</span>
              <span className="text-2xl text-emerald-800 font-mono">
                ₹{grandTotal.toFixed(2)}
              </span>
            </div>

            {bill.payments && bill.payments.length > 0 && (
              <div className="text-[11px] text-slate-500 pt-1 text-right">
                Paid via: {bill.payments.map((p) => `${p.method} (₹${Number(p.amount || 0).toFixed(2)})`).join(' + ')}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons: 1-Tap PDF Download & Print */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-2">
          <button
            type="button"
            onClick={() => downloadBillPDF(bill, settings)}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-emerald-700/20"
          >
            <Download className="w-4 h-4 text-white" />
            <span>Download Official PDF Invoice</span>
          </button>

          <button
            type="button"
            onClick={() => openPrintDialog(bill, settings)}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors border border-slate-300"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>Print Receipt</span>
          </button>
        </div>

        {/* Receipt Footer */}
        <div className="p-3 text-center text-[10px] text-slate-400 bg-slate-50 border-t border-slate-100">
          {settings.receiptFooter || 'Thank you for dining with Food Katta. Visit Again!'}
        </div>
      </div>
    </div>
  );
};
