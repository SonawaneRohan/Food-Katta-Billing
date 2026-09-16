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
  Sparkles,
  Check,
  Settings2,
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
  const [splitUpi, setSplitUpi] = useState<number>(0);
  const [splitCash, setSplitCash] = useState<number>(0);
  const [splitCard, setSplitCard] = useState<number>(0);
  const [splitCashTendered, setSplitCashTendered] = useState<number>(0);
  const [autoBalance, setAutoBalance] = useState<boolean>(true);
  const [showCardInSplit, setShowCardInSplit] = useState<boolean>(false);

  // Success state after bill is created
  const [createdBill, setCreatedBill] = useState<Bill | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState<boolean>(false);

  // Quick 50% / 50% split helper
  const handleHalfAndHalfSplit = () => {
    const half = Math.round((grandTotal / 2) * 100) / 100;
    const remaining = Math.max(0, Math.round((grandTotal - half) * 100) / 100);
    setSplitUpi(half);
    setSplitCash(remaining);
    setSplitCard(0);
    setSplitCashTendered(remaining);
    setErrorMsg('');
  };

  // Initialize tender state only when modal opens
  useEffect(() => {
    if (isOpen) {
      const initialTotal = grandTotal > 0 ? grandTotal : 0;
      setCashTendered(initialTotal);
      const half = Math.round((initialTotal / 2) * 100) / 100;
      setSplitUpi(half);
      setSplitCash(Math.max(0, initialTotal - half));
      setSplitCard(0);
      setSplitCashTendered(Math.max(0, initialTotal - half));
      setCreatedBill(null);
      setErrorMsg('');
      setShowCardInSplit(false);
      setAutoBalance(true);
    }
  }, [isOpen]);

  // Sync grandTotal while preparing payment (never after bill creation)
  useEffect(() => {
    if (isOpen && !createdBill && grandTotal > 0) {
      setCashTendered(grandTotal);
    }
  }, [grandTotal, isOpen, createdBill]);

  if (!isOpen) return null;

  const changeDue = Math.max(0, cashTendered - grandTotal);
  const totalSplitSum = Math.round((splitCash + splitUpi + splitCard) * 100) / 100;
  const splitRemaining = Math.round((grandTotal - totalSplitSum) * 100) / 100;

  const handleQuickCash = (amount: number) => {
    setCashTendered(amount);
  };

  const handleSplitUpiChange = (newUpiVal: number) => {
    const safeUpi = Math.max(0, newUpiVal);
    setSplitUpi(safeUpi);
    if (autoBalance) {
      const remainingForCash = Math.max(0, Math.round((grandTotal - safeUpi - splitCard) * 100) / 100);
      setSplitCash(remainingForCash);
      setSplitCashTendered(remainingForCash);
    }
  };

  const handleSplitCashChange = (newCashVal: number) => {
    const safeCash = Math.max(0, newCashVal);
    setSplitCash(safeCash);
    setSplitCashTendered(safeCash);
    if (autoBalance) {
      const remainingForUpi = Math.max(0, Math.round((grandTotal - safeCash - splitCard) * 100) / 100);
      setSplitUpi(remainingForUpi);
    }
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
            `Cash tendered (₹${cashTendered.toFixed(2)}) is less than total bill amount (₹${grandTotal.toFixed(2)}).`
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
            `Split payments must equal total of ₹${grandTotal.toFixed(2)}. Currently allocated: ₹${totalSplitSum.toFixed(2)} (Difference: ₹${Math.abs(splitRemaining).toFixed(2)})`
          );
          setIsProcessing(false);
          return;
        }
        if (splitUpi > 0)
          payments.push({
            method: 'UPI',
            amount: splitUpi,
            referenceNumber: upiReference,
          });
        if (splitCash > 0) payments.push({ method: 'CASH', amount: splitCash });
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

      // Note: Automatic opening of the printer window is intentionally NOT triggered here.
      // As requested, the printer window will ONLY open when the user clicks the "Print Bill" button.
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
                    id="payment-mode-cash"
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
                    id="payment-mode-upi"
                    onClick={() => setPaymentMode('UPI')}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold transition-all ${
                      paymentMode === 'UPI'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <QrCode className="w-5 h-5 mb-1 text-blue-500" />
                    <span>Online / UPI</span>
                  </button>

                  <button
                    type="button"
                    id="payment-mode-split"
                    onClick={() => {
                      setPaymentMode('SPLIT');
                      if (splitUpi === 0 && splitCash === 0) {
                        handleHalfAndHalfSplit();
                      }
                    }}
                    className={`relative flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-bold transition-all ${
                      paymentMode === 'SPLIT'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs ring-2 ring-amber-500'
                        : 'bg-amber-50/80 text-slate-800 border-amber-300 hover:bg-amber-100/80'
                    }`}
                    title="Split payment: e.g. ₹150 Online + ₹50 Cash, or Half & Half"
                  >
                    <div className="flex items-center gap-1 mb-0.5">
                      <QrCode className="w-4 h-4 text-blue-500" />
                      <span className="text-[10px] font-black text-amber-500">+</span>
                      <Banknote className="w-4 h-4 text-emerald-500" />
                    </div>
                    <span className="truncate">Cash + Online</span>
                    <span className="text-[9px] font-bold text-amber-600">
                      (Split / Half & Half)
                    </span>
                  </button>

                  <button
                    type="button"
                    id="payment-mode-card"
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

              {/* Cash + Online Split Pay Experience */}
              {paymentMode === 'SPLIT' && (
                <div className="space-y-3 bg-slate-50 p-3.5 sm:p-4 rounded-xl border border-slate-200">
                  {/* Preset Shortcuts */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      <span className="text-xs font-bold text-slate-800">
                        Quick Split:
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleHalfAndHalfSplit}
                        className="px-2.5 py-1 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-all shadow-xs flex items-center gap-1 active:scale-95"
                        title="Set 50% Online and 50% Cash"
                      >
                        <span>Half Online & Half Cash (50% / 50%)</span>
                      </button>

                      <label className="flex items-center gap-1 text-[11px] text-slate-600 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={autoBalance}
                          onChange={(e) => setAutoBalance(e.target.checked)}
                          className="rounded text-amber-600 focus:ring-amber-500 w-3.5 h-3.5"
                        />
                        <span>Auto-balance</span>
                      </label>
                    </div>
                  </div>

                  {/* Two Main Cards: Online / UPI and Cash */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* 1. Online / UPI Portion */}
                    <div className="bg-white p-3 rounded-xl border border-blue-200 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-blue-700 font-bold text-xs">
                          <QrCode className="w-4 h-4 text-blue-600" />
                          <span>Online / UPI (₹)</span>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                          {grandTotal > 0 ? `${Math.round((splitUpi / grandTotal) * 100)}%` : '0%'}
                        </span>
                      </div>

                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold text-base">
                          ₹
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          placeholder="0.00"
                          value={splitUpi === 0 ? '' : splitUpi}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            handleSplitUpiChange(val);
                          }}
                          className="w-full pl-8 pr-3 py-2 text-lg font-black font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                        />
                      </div>

                      {/* Quick Online Presets */}
                      <div className="flex items-center gap-1 pt-0.5">
                        <button
                          type="button"
                          onClick={() => handleSplitUpiChange(Math.round((grandTotal / 2) * 100) / 100)}
                          className="px-2 py-0.5 text-[10px] font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 rounded border border-blue-200"
                        >
                          Half (₹{(grandTotal / 2).toFixed(0)})
                        </button>
                        {grandTotal >= 100 && (
                          <button
                            type="button"
                            onClick={() => handleSplitUpiChange(Math.max(0, grandTotal - 50))}
                            className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded"
                          >
                            ₹{Math.max(0, grandTotal - 50).toFixed(0)}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleSplitUpiChange(0)}
                          className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-500 rounded"
                        >
                          ₹0
                        </button>
                      </div>

                      <input
                        type="text"
                        placeholder="UPI Ref / UTR (Optional)"
                        value={upiReference}
                        onChange={(e) => setUpiReference(e.target.value)}
                        className="w-full px-2.5 py-1 text-xs font-mono border border-slate-200 rounded-md focus:ring-1 focus:ring-blue-400 focus:outline-none placeholder:text-slate-400"
                      />
                    </div>

                    {/* 2. Cash Portion */}
                    <div className="bg-white p-3 rounded-xl border border-emerald-200 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-xs">
                          <Banknote className="w-4 h-4 text-emerald-600" />
                          <span>Cash (₹)</span>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                          {grandTotal > 0 ? `${Math.round((splitCash / grandTotal) * 100)}%` : '0%'}
                        </span>
                      </div>

                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold text-base">
                          ₹
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          placeholder="0.00"
                          value={splitCash === 0 ? '' : splitCash}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            handleSplitCashChange(val);
                          }}
                          className="w-full pl-8 pr-3 py-2 text-lg font-black font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none"
                        />
                      </div>

                      {/* Quick Cash Presets */}
                      <div className="flex items-center gap-1 pt-0.5">
                        <button
                          type="button"
                          onClick={() => handleSplitCashChange(Math.round((grandTotal / 2) * 100) / 100)}
                          className="px-2 py-0.5 text-[10px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded border border-emerald-200"
                        >
                          Half (₹{(grandTotal / 2).toFixed(0)})
                        </button>
                        {grandTotal >= 100 && (
                          <button
                            type="button"
                            onClick={() => handleSplitCashChange(50)}
                            className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded"
                          >
                            ₹50
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleSplitCashChange(0)}
                          className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-500 rounded"
                        >
                          ₹0
                        </button>
                      </div>

                      {/* Cash Handed & Change Calculation */}
                      <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-slate-500">Handed:</span>
                          <input
                            type="number"
                            min="0"
                            placeholder={String(splitCash || '')}
                            value={splitCashTendered || ''}
                            onChange={(e) =>
                              setSplitCashTendered(parseFloat(e.target.value) || 0)
                            }
                            className="w-16 px-1.5 py-0.5 text-xs font-mono font-bold border border-slate-200 rounded"
                          />
                        </div>
                        {splitCashTendered > splitCash && (
                          <div className="text-[11px] font-bold text-emerald-600">
                            Return: ₹{(splitCashTendered - splitCash).toFixed(0)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Optional Card Portion */}
                  {showCardInSplit ? (
                    <div className="bg-white p-3 rounded-xl border border-purple-200 shadow-2xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-purple-700 flex items-center gap-1">
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Card Amount (Optional)</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setShowCardInSplit(false);
                            setSplitCard(0);
                          }}
                          className="text-[10px] text-slate-400 hover:text-red-500"
                        >
                          Remove Card
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          placeholder="Card amount (₹)"
                          value={splitCard || ''}
                          onChange={(e) => setSplitCard(parseFloat(e.target.value) || 0)}
                          className="w-full px-2.5 py-1.5 text-sm font-mono border border-slate-300 rounded-lg"
                        />
                        <input
                          type="text"
                          placeholder="Card Auth Ref"
                          value={cardReference}
                          onChange={(e) => setCardReference(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-lg"
                        />
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowCardInSplit(true)}
                      className="text-[11px] font-semibold text-slate-500 hover:text-purple-700 flex items-center gap-1"
                    >
                      <CreditCard className="w-3 h-3" />
                      <span>+ Include Card payment in split</span>
                    </button>
                  )}

                  {/* Real-time Allocation & Balance Summary */}
                  <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs">
                      <span className="text-slate-500">Allocated: </span>
                      <span className="font-mono font-black text-slate-900">
                        ₹{totalSplitSum.toFixed(2)}
                      </span>
                      <span className="text-slate-400 text-[11px] ml-1.5">
                        (Online: ₹{splitUpi.toFixed(2)} + Cash: ₹{splitCash.toFixed(2)}
                        {splitCard > 0 ? ` + Card: ₹${splitCard.toFixed(2)}` : ''})
                      </span>
                    </div>

                    <div>
                      {Math.abs(splitRemaining) < 0.1 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>Fully Balanced (₹{grandTotal.toFixed(2)})</span>
                        </span>
                      ) : splitRemaining > 0 ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-bold text-amber-700">
                            ₹{splitRemaining.toFixed(2)} remaining:
                          </span>
                          <button
                            type="button"
                            onClick={() => handleSplitCashChange(splitCash + splitRemaining)}
                            className="px-2 py-0.5 text-[10px] font-bold bg-emerald-600 text-white rounded hover:bg-emerald-700"
                          >
                            + Put in Cash
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSplitUpiChange(splitUpi + splitRemaining)}
                            className="px-2 py-0.5 text-[10px] font-bold bg-blue-600 text-white rounded hover:bg-blue-700"
                          >
                            + Put in Online
                          </button>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-700 border border-red-200">
                          Exceeds total by ₹{Math.abs(splitRemaining).toFixed(2)}
                        </span>
                      )}
                    </div>
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
                  <span className="font-bold text-slate-800">
                    {createdBill.payments && createdBill.payments.length > 0
                      ? createdBill.payments
                          .map(
                            (p) =>
                              `${p.method === 'UPI' ? 'Online' : p.method} (₹${Number(p.amount || 0).toFixed(2)})`
                          )
                          .join(' + ')
                      : 'CASH'}
                  </span>
                </p>
              </div>

              {/* Primary Bill Output Actions */}
              <div className="space-y-2.5 max-w-md mx-auto">
                {/* Print button that explicitly triggers printer window on click */}
                <button
                  type="button"
                  id="modal-open-print-btn"
                  onClick={() => openPrintDialog(createdBill, settings)}
                  className="w-full flex items-center justify-center gap-2 p-3.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-black uppercase tracking-wider transition-all shadow-md shadow-orange-500/25 active:scale-98"
                >
                  <Printer className="w-5 h-5 text-white" />
                  <span>Print Bill (Open Printer Window)</span>
                </button>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPrintModalOpen(true)}
                    className="flex items-center justify-center gap-1.5 p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors border border-slate-200"
                    title="Configure printer paper width (58mm/80mm/A4) or preview"
                  >
                    <Settings2 className="w-3.5 h-3.5 text-slate-600" />
                    <span>Printer Setup</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsWhatsAppModalOpen(true)}
                    className="flex items-center justify-center gap-1.5 p-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs"
                  >
                    <Share2 className="w-3.5 h-3.5 text-white" />
                    <span>WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => downloadBillPDF(createdBill, settings)}
                    className="flex items-center justify-center gap-1.5 p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors border border-slate-200"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-700" />
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
