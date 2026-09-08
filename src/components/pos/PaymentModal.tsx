import React, { useState, useEffect } from 'react';
import {
  X,
  CreditCard,
  Banknote,
  QrCode,
  Layers,
  Printer,
  Download,
  CheckCircle2,
  AlertCircle,
  Share2,
} from 'lucide-react';
import { useRestaurant } from '../../context/RestaurantContext.tsx';
import { SplitPayment, PaymentMethod, Bill } from '../../types/index.ts';
import { downloadBillPDF, openPrintDialog } from '../../lib/pdfGenerator.ts';
import { PrintBillModal } from '../bills/PrintBillModal.tsx';
import { WhatsAppShareModal } from '../bills/WhatsAppShareModal.tsx';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const {
    cartItems,
    grandTotal,
    generateAndCompleteBill,
    selectedCustomer,
    settings,
  } = useRestaurant();

  const [paymentMode, setPaymentMode] = useState<PaymentMethod | 'SPLIT'>('CASH');
  const [cashTendered, setCashTendered] = useState<number>(grandTotal > 0 ? grandTotal : 0);
  const [upiReference, setUpiReference] = useState<string>('');
  const [cardReference, setCardReference] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Split payments state
  const [splitCash, setSplitCash] = useState<number>(0);
  const [splitUpi, setSplitUpi] = useState<number>(0);
  const [splitCard, setSplitCard] = useState<number>(0);

  // Success state after bill is created
  const [createdBill, setCreatedBill] = useState<Bill | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState<boolean>(false);

  // Initialize tender state only when modal opens
  useEffect(() => {
    if (isOpen) {
      const initialTotal = grandTotal > 0 ? grandTotal : 0;
      setCashTendered(initialTotal);
      setSplitCash(initialTotal);
      setSplitUpi(0);
      setSplitCard(0);
      setCreatedBill(null);
      setErrorMsg('');
    }
  }, [isOpen]);

  // Sync grandTotal while preparing payment (never after bill creation)
  useEffect(() => {
    if (isOpen && !createdBill && grandTotal > 0) {
      setCashTendered(grandTotal);
      setSplitCash(grandTotal);
    }
  }, [grandTotal, isOpen, createdBill]);

  if (!isOpen) return null;

  const changeDue = Math.max(0, cashTendered - grandTotal);
  const totalSplitSum = splitCash + splitUpi + splitCard;
  const splitRemaining = grandTotal - totalSplitSum;

  const handleQuickCash = (amount: number) => {
    setCashTendered(amount);
  };

  const handleProcessPayment = async () => {
    if (isProcessing || createdBill) return;

    if (!cartItems || cartItems.length === 0) {
      setErrorMsg('Cannot bill an empty order. Please add items to the cart.');
      return;
    }

    try {
      setIsProcessing(true);
      setErrorMsg('');

      let payments: SplitPayment[] = [];

      if (paymentMode === 'CASH') {
        if (cashTendered < grandTotal) {
          setErrorMsg(
            `Cash tendered (₹${cashTendered}) is less than total bill amount (₹${grandTotal}).`
          );
          setIsProcessing(false);
          return;
        }
        payments = [{ method: 'CASH', amount: grandTotal }];
      } else if (paymentMode === 'UPI') {
        payments = [
          { method: 'UPI', amount: grandTotal, referenceNumber: upiReference },
        ];
      } else if (paymentMode === 'CARD') {
        payments = [
          { method: 'CARD', amount: grandTotal, referenceNumber: cardReference },
        ];
      } else if (paymentMode === 'SPLIT') {
        if (Math.abs(splitRemaining) > 0.5) {
          setErrorMsg(
            `Split payments must equal total of ₹${grandTotal}. Currently: ₹${totalSplitSum}`
          );
          setIsProcessing(false);
          return;
        }
        if (splitCash > 0) payments.push({ method: 'CASH', amount: splitCash });
        if (splitUpi > 0)
          payments.push({
            method: 'UPI',
            amount: splitUpi,
            referenceNumber: upiReference,
          });
        if (splitCard > 0)
          payments.push({
            method: 'CARD',
            amount: splitCard,
            referenceNumber: cardReference,
          });
      }

      const generated = await generateAndCompleteBill(payments);
      setCreatedBill(generated);
      onSuccess();

      // Automatically trigger thermal print dialog
      try {
        openPrintDialog(generated, settings);
      } catch (printErr) {
        console.warn('Auto print trigger error:', printErr);
      }
    } catch (err: any) {
      console.error('Payment settlement error:', err);
      setErrorMsg(err.message || 'Payment processing failed. Please check order details.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAfterWhatsAppShare = () => {
    setIsWhatsAppModalOpen(false);
    setCreatedBill(null);
    onSuccess();
    onClose();
  };

  const handleStartNewOrder = () => {
    setCreatedBill(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 font-sans">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div>
            <h3 className="text-base font-black uppercase tracking-tight text-white">
              {createdBill
                ? 'Bill Generated Successfully'
                : 'Settle Payment & Generate Bill'}
            </h3>
            <p className="text-xs text-slate-400">
              {createdBill
                ? `Invoice No: ${createdBill.billNumber}`
                : 'Select settlement method to print or dispatch receipt'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {!createdBill ? (
            <div className="space-y-4">
              {errorMsg && (
                <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Total Payable Banner */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Total Amount Due
                  </span>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    ₹{grandTotal.toFixed(2)}
                  </div>
                </div>
                {selectedCustomer && (
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 uppercase font-bold">
                      Customer
                    </span>
                    <p className="text-xs font-bold text-slate-800">
                      {selectedCustomer.name}
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono">
                      {selectedCustomer.phone}
                    </p>
                  </div>
                )}
              </div>

              {/* Payment Method Selector Tabs */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Select Payment Method
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMode('CASH')}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold transition-all ${
                      paymentMode === 'CASH'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Banknote className="w-5 h-5 mb-1 text-emerald-500" />
                    <span>Cash</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMode('UPI')}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold transition-all ${
                      paymentMode === 'UPI'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <QrCode className="w-5 h-5 mb-1 text-blue-500" />
                    <span>UPI / QR</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMode('CARD')}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold transition-all ${
                      paymentMode === 'CARD'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <CreditCard className="w-5 h-5 mb-1 text-purple-500" />
                    <span>Card</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMode('SPLIT')}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold transition-all ${
                      paymentMode === 'SPLIT'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Layers className="w-5 h-5 mb-1 text-amber-500" />
                    <span>Split Pay</span>
                  </button>
                </div>
              </div>

              {/* Mode Specific Inputs */}
              {paymentMode === 'CASH' && (
                <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Cash Received (₹)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={cashTendered || ''}
                      onChange={(e) =>
                        setCashTendered(parseFloat(e.target.value) || 0)
                      }
                      className="w-full text-xl font-black font-mono px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  {/* Quick Cash Buttons */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => handleQuickCash(grandTotal)}
                      className="px-2.5 py-1 text-xs font-bold bg-white border border-slate-300 hover:bg-slate-100 rounded"
                    >
                      Exact (₹{grandTotal.toFixed(0)})
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleQuickCash(Math.ceil(grandTotal / 50) * 50)
                      }
                      className="px-2.5 py-1 text-xs font-bold bg-white border border-slate-300 hover:bg-slate-100 rounded"
                    >
                      ₹{Math.ceil(grandTotal / 50) * 50}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleQuickCash(Math.ceil(grandTotal / 100) * 100)
                      }
                      className="px-2.5 py-1 text-xs font-bold bg-white border border-slate-300 hover:bg-slate-100 rounded"
                    >
                      ₹{Math.ceil(grandTotal / 100) * 100}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickCash(500)}
                      className="px-2.5 py-1 text-xs font-bold bg-white border border-slate-300 hover:bg-slate-100 rounded"
                    >
                      ₹500
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickCash(1000)}
                      className="px-2.5 py-1 text-xs font-bold bg-white border border-slate-300 hover:bg-slate-100 rounded"
                    >
                      ₹1000
                    </button>
                  </div>

                  {/* Change Calculation */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                    <span className="text-xs font-semibold text-slate-600">
                      Change Due to Customer:
                    </span>
                    <span
                      className={`text-base font-black font-mono ${
                        changeDue > 0 ? 'text-emerald-600' : 'text-slate-800'
                      }`}
                    >
                      ₹{changeDue.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {paymentMode === 'UPI' && (
                <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <p className="text-xs text-slate-600">
                    Ask customer to scan Food Katta counter QR code for ₹
                    {grandTotal.toFixed(2)}.
                  </p>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      UPI Reference / UTR Number (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 423985729104"
                      value={upiReference}
                      onChange={(e) => setUpiReference(e.target.value)}
                      className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {paymentMode === 'CARD' && (
                <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Card / POS Machine Approval Ref (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Auth Code / Txn Ref"
                      value={cardReference}
                      onChange={(e) => setCardReference(e.target.value)}
                      className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {paymentMode === 'SPLIT' && (
                <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Cash (₹)
                      </label>
                      <input
                        type="number"
                        value={splitCash || ''}
                        onChange={(e) =>
                          setSplitCash(parseFloat(e.target.value) || 0)
                        }
                        className="w-full px-2.5 py-1.5 text-sm font-black font-mono border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        UPI (₹)
                      </label>
                      <input
                        type="number"
                        value={splitUpi || ''}
                        onChange={(e) =>
                          setSplitUpi(parseFloat(e.target.value) || 0)
                        }
                        className="w-full px-2.5 py-1.5 text-sm font-black font-mono border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Card (₹)
                      </label>
                      <input
                        type="number"
                        value={splitCard || ''}
                        onChange={(e) =>
                          setSplitCard(parseFloat(e.target.value) || 0)
                        }
                        className="w-full px-2.5 py-1.5 text-sm font-black font-mono border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200">
                    <span className="text-slate-600 font-medium">
                      Total Allocated: ₹{totalSplitSum.toFixed(2)}
                    </span>
                    <span
                      className={`font-black font-mono ${
                        Math.abs(splitRemaining) < 0.1
                          ? 'text-emerald-600'
                          : 'text-red-600'
                      }`}
                    >
                      {Math.abs(splitRemaining) < 0.1
                        ? 'Balanced'
                        : `Remaining: ₹${splitRemaining.toFixed(2)}`}
                    </span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900"
                >
                  Cancel (ESC)
                </button>
                <button
                  type="button"
                  onClick={handleProcessPayment}
                  disabled={isProcessing || !cartItems || cartItems.length === 0}
                  className="px-6 py-2.5 text-xs font-black uppercase tracking-widest bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-all shadow-md shadow-amber-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isProcessing ? 'Processing Bill...' : 'Complete & Generate Bill'}
                </button>
              </div>
            </div>
          ) : (
            /* Post-Bill Success Interface */
            <div className="space-y-5 text-center py-2">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Official Invoice
                </span>
                <h4 className="text-2xl font-black text-slate-900 mt-0.5 font-mono">
                  {createdBill.billNumber}
                </h4>
                <p className="text-xs text-slate-600 mt-1">
                  Paid ₹{Number(createdBill.grandTotal || 0).toFixed(2)} via{' '}
                  {createdBill.payments?.map((p) => p.method).join(' + ') || 'CASH'}
                </p>
              </div>

              {/* Primary Bill Output Actions */}
              <div className="space-y-2 max-w-sm mx-auto">
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(true)}
                  className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-orange-500/20 active:scale-95"
                >
                  <Printer className="w-4 h-4 text-white" />
                  <span>Print & Printer Options (Any Printer)</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setIsWhatsAppModalOpen(true)}
                    className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs active:scale-95"
                  >
                    <Share2 className="w-4 h-4 text-white" />
                    <span>Send PDF to WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => downloadBillPDF(createdBill, settings)}
                    className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors border border-slate-200 active:scale-95"
                  >
                    <Download className="w-4 h-4 text-slate-700" />
                    <span>Download PDF</span>
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleStartNewOrder}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-colors"
                >
                  Start New Order (Back to Billing)
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Dedicated Print & Printer Options Modal */}
        {createdBill && (
          <PrintBillModal
            bill={createdBill}
            isOpen={isPrintModalOpen}
            onClose={() => setIsPrintModalOpen(false)}
          />
        )}

        {/* WhatsApp Share Modal with auto-redirection to billing system */}
        {createdBill && (
          <WhatsAppShareModal
            bill={createdBill}
            isOpen={isWhatsAppModalOpen}
            onClose={() => setIsWhatsAppModalOpen(false)}
            onAfterShare={handleAfterWhatsAppShare}
          />
        )}
      </div>
    </div>
  );
};
