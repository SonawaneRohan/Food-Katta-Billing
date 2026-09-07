import React from 'react';
import {
  X,
  Printer,
  Download,
  Building,
} from 'lucide-react';
import { Bill } from '../../types/index.ts';
import { useRestaurant } from '../../context/RestaurantContext.tsx';
import { downloadBillPDF, openPrintDialog } from '../../lib/pdfGenerator.ts';

interface BillDetailModalProps {
  bill: Bill | null;
  onClose: () => void;
}

export const BillDetailModal: React.FC<BillDetailModalProps> = ({ bill, onClose }) => {
  const { settings } = useRestaurant();

  if (!bill) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 flex flex-col max-h-[90vh] font-sans">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Building className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-sm uppercase tracking-tight leading-tight text-white font-mono">
                {bill.billNumber}
              </h3>
              <p className="text-[11px] text-slate-400">
                {new Date(bill.createdAt).toLocaleString('en-IN')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Thermal Receipt Visual Preview */}
        <div className="p-6 overflow-y-auto space-y-4 font-mono text-xs text-slate-800 bg-white">
          {/* Restaurant Header */}
          <div className="text-center space-y-0.5">
            <h4 className="text-base font-black text-slate-900 tracking-tight">
              {settings.restaurantName}
            </h4>
            <p className="text-[11px] text-slate-500">{settings.address}</p>
            <p className="text-[11px] text-slate-500">
              Ph: {settings.phone} {settings.gstin ? `| GSTIN: ${settings.gstin}` : ''}
            </p>
            {(settings.fssai || (settings as any).fssaiNumber) && (
              <p className="text-[11px] text-slate-500">FSSAI Lic: {settings.fssai || (settings as any).fssaiNumber}</p>
            )}
          </div>

          <div className="border-b border-dashed border-slate-300 my-2" />

          {/* Bill Meta */}
          <div className="flex justify-between text-[11px]">
            <div>
              <p>Type: <span className="font-bold">{bill.orderType}</span></p>
              {bill.tableName && <p>Table: <span className="font-bold">{bill.tableName}</span></p>}
              <p>Server: {bill.cashierName}</p>
            </div>
            <div className="text-right">
              <p>Customer: {bill.customerName || 'Walk-in Guest'}</p>
              {bill.customerPhone && <p>Ph: {bill.customerPhone}</p>}
            </div>
          </div>

          <div className="border-b border-dashed border-slate-300 my-2" />

          {/* Items Table */}
          <div className="space-y-1.5">
            <div className="flex justify-between font-bold text-slate-700 text-[11px] border-b border-slate-200 pb-1">
              <span className="w-7/12">Item Description</span>
              <span className="w-2/12 text-center">Qty</span>
              <span className="w-3/12 text-right">Total</span>
            </div>

            {bill.items.map((item, idx) => (
              <div key={idx} className="flex justify-between text-[11px]">
                <span className="w-7/12 font-medium">{item.name}</span>
                <span className="w-2/12 text-center">{item.quantity}</span>
                <span className="w-3/12 text-right font-bold">
                  ₹{(item.price * item.quantity).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          <div className="border-b border-dashed border-slate-300 my-2" />

          {/* Bill Totals */}
          <div className="space-y-1 text-right text-[11px]">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>₹{Number(bill.subtotal || 0).toFixed(2)}</span>
            </div>

            {Number(bill.orderDiscount || 0) > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Discount:</span>
                <span>-₹{Number(bill.orderDiscount || 0).toFixed(2)}</span>
              </div>
            )}

            {Number(bill.cgst || 0) > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>CGST (2.5%):</span>
                <span>₹{Number(bill.cgst || 0).toFixed(2)}</span>
              </div>
            )}

            {Number(bill.sgst || 0) > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>SGST (2.5%):</span>
                <span>₹{Number(bill.sgst || 0).toFixed(2)}</span>
              </div>
            )}

            {Number(bill.roundOff || 0) !== 0 && (
              <div className="flex justify-between text-slate-400">
                <span>Round Off:</span>
                <span>{Number(bill.roundOff) > 0 ? `+₹${Number(bill.roundOff).toFixed(2)}` : `-₹${Math.abs(Number(bill.roundOff)).toFixed(2)}`}</span>
              </div>
            )}

            <div className="border-t border-slate-800 pt-1 flex justify-between text-sm font-black text-slate-900">
              <span>GRAND TOTAL:</span>
              <span>₹{Number(bill.grandTotal || 0).toFixed(2)}</span>
            </div>
          </div>

          {/* Payment breakdown */}
          <div className="text-[11px] text-slate-600 pt-1">
            <span className="font-bold text-slate-800">Payment method: </span>
            {bill.payments?.map((p) => `${p.method}: ₹${Number(p.amount || 0).toFixed(0)}`).join(' | ') || 'CASH'}
          </div>

          {/* Footer note */}
          <div className="text-center font-sans text-[11px] text-slate-500 pt-2 border-t border-dashed border-slate-200">
            <p>{settings.receiptFooter}</p>
          </div>
        </div>

        {/* Print & Download Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            onClick={() => openPrintDialog(bill, settings)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>Print Receipt</span>
          </button>

          <button
            onClick={() => downloadBillPDF(bill, settings)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 rounded-lg text-xs font-bold transition-colors shadow-xs"
          >
            <Download className="w-4 h-4 text-slate-700" />
            <span>Download PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
};
