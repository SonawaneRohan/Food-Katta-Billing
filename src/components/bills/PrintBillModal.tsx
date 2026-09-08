import React, { useState } from 'react';
import {
  Printer,
  X,
  Share2,
  Download,
  ExternalLink,
  Settings2,
  Check,
  CheckCircle2,
  FileText,
  Smartphone,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Bill } from '../../types/index.ts';
import { useRestaurant } from '../../context/RestaurantContext.tsx';
import {
  generateReceiptHtml,
  openPrintWindow,
  printReceiptThermal,
  downloadBillPDF,
} from '../../lib/pdfGenerator.ts';
import { WhatsAppShareModal } from './WhatsAppShareModal.tsx';

interface PrintBillModalProps {
  bill: Bill | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PrintBillModal: React.FC<PrintBillModalProps> = ({
  bill,
  isOpen,
  onClose,
}) => {
  const { settings, updateSettings } = useRestaurant();

  // Selected format for this print session (defaults to configured restaurant setting)
  const defaultFormat: '80mm' | '58mm' | 'a4' =
    settings.thermalPrinterWidth === '58mm' || settings.printerType === 'thermal-58mm'
      ? '58mm'
      : settings.printerType === 'a4'
      ? 'a4'
      : '80mm';

  const [selectedFormat, setSelectedFormat] = useState<'80mm' | '58mm' | 'a4'>(defaultFormat);
  const [copies, setCopies] = useState<number>(1);
  const [isSavingSetting, setIsSavingSetting] = useState<boolean>(false);
  const [settingSaved, setSettingSaved] = useState<boolean>(false);
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState<boolean>(false);
  const [showConfigDrawer, setShowConfigDrawer] = useState<boolean>(false);

  // Sync format with settings if settings change
  React.useEffect(() => {
    setSelectedFormat(defaultFormat);
  }, [settings.thermalPrinterWidth, settings.printerType]);

  if (!isOpen || !bill) return null;

  const handlePrintToPrinter = () => {
    openPrintWindow(bill, settings, selectedFormat, copies);
  };

  const handleDirectThermalPrint = () => {
    printReceiptThermal(bill, settings, selectedFormat, copies);
  };

  const handleDownloadPdf = () => {
    downloadBillPDF(bill, settings);
  };

  const handleSaveAsDefaultPrinter = async () => {
    try {
      setIsSavingSetting(true);
      await updateSettings({
        thermalPrinterWidth: selectedFormat === '58mm' ? '58mm' : '80mm',
        printerType: selectedFormat === 'a4' ? 'a4' : selectedFormat === '58mm' ? 'thermal-58mm' : 'thermal-80mm',
      });
      setSettingSaved(true);
      setTimeout(() => setSettingSaved(false), 3000);
    } catch (err) {
      console.error('Failed to save printer settings:', err);
    } finally {
      setIsSavingSetting(false);
    }
  };

  const receiptPreviewHtml = generateReceiptHtml(bill, settings, selectedFormat, copies);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden border border-slate-200 flex flex-col h-[90vh] font-sans animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center">
                <Printer className="w-4 h-4 text-orange-400" />
              </div>
              <div>
                <h3 className="font-black text-sm uppercase tracking-wider text-white">
                  Printer & Print Bill Options
                </h3>
                <p className="text-[11px] text-slate-400">
                  Invoice {bill.billNumber} • Total: {Number(bill.grandTotal || 0).toFixed(2)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowConfigDrawer(!showConfigDrawer)}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                  showConfigDrawer
                    ? 'bg-orange-500 text-white'
                    : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
                title="Printer Hardware Settings"
              >
                <Settings2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Printer Setup</span>
              </button>

              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick Hardware Settings Bar (Collapsible) */}
          {showConfigDrawer && (
            <div className="bg-amber-50 border-b border-amber-200 p-3 sm:px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-amber-900 font-medium">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  Configure default POS hardware printer. Current default: <b>{settings.thermalPrinterWidth || '80mm'}</b>
                </span>
              </div>
              <button
                type="button"
                onClick={handleSaveAsDefaultPrinter}
                disabled={isSavingSetting}
                className="px-3 py-1 bg-amber-700 hover:bg-amber-800 text-white rounded text-[11px] font-bold transition-colors flex items-center gap-1.5"
              >
                {settingSaved ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-white" />
                    <span>Saved as Default!</span>
                  </>
                ) : (
                  <span>Save "{selectedFormat}" as Restaurant Default</span>
                )}
              </button>
            </div>
          )}

          {/* Main Content: Split Grid */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
            {/* Left side: Printer Options & Connection Controls */}
            <div className="md:col-span-6 p-4 sm:p-5 overflow-y-auto space-y-4 border-r border-slate-200 bg-slate-50/50">
              {/* Target Printer Notice */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="flex items-center gap-2 text-blue-900 font-bold text-xs">
                  <Printer className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Connect to ANY Printer</span>
                </div>
                <p className="text-[11px] text-blue-800/90 mt-1 leading-relaxed">
                  Compatible with <b>Thermal USB POS Printers</b> (Epson, TVS, Rongta, Xprinter, NGX), <b>Bluetooth POS</b>, <b>Wi-Fi/LAN Printers</b>, and <b>Office Laser/Inkjet / PDF</b>. Clicking Print triggers your system printer chooser.
                </p>
              </div>

              {/* Format / Paper Size Selection */}
              <div className="space-y-2">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
                  1. Select Paper Size / Printer Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedFormat('80mm')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      selectedFormat === '80mm'
                        ? 'border-orange-500 bg-orange-50/80 ring-2 ring-orange-500/20 shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-black text-xs text-slate-900">80mm</span>
                      {selectedFormat === '80mm' && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-orange-600" />
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium">Standard POS 3-inch</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedFormat('58mm')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      selectedFormat === '58mm'
                        ? 'border-orange-500 bg-orange-50/80 ring-2 ring-orange-500/20 shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-black text-xs text-slate-900">58mm</span>
                      {selectedFormat === '58mm' && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-orange-600" />
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium">Mini 2-inch Bluetooth</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedFormat('a4')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      selectedFormat === 'a4'
                        ? 'border-orange-500 bg-orange-50/80 ring-2 ring-orange-500/20 shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-black text-xs text-slate-900">A4 Invoice</span>
                      {selectedFormat === 'a4' && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-orange-600" />
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium">Standard Laser/PDF</p>
                  </button>
                </div>
              </div>

              {/* Number of Copies */}
              <div className="space-y-2">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
                  2. Number of Copies
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCopies(1)}
                    className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                      copies === 1
                        ? 'border-orange-500 bg-orange-50/80 ring-2 ring-orange-500/20 shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <span className="font-black text-xs text-slate-900 block">1 Copy</span>
                      <span className="text-[10px] text-slate-500">Customer Bill</span>
                    </div>
                    {copies === 1 && <CheckCircle2 className="w-3.5 h-3.5 text-orange-600" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setCopies(2)}
                    className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                      copies === 2
                        ? 'border-orange-500 bg-orange-50/80 ring-2 ring-orange-500/20 shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <span className="font-black text-xs text-slate-900 block">2 Copies</span>
                      <span className="text-[10px] text-slate-500">Customer + Store Copy</span>
                    </div>
                    {copies === 2 && <CheckCircle2 className="w-3.5 h-3.5 text-orange-600" />}
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={handlePrintToPrinter}
                  className="w-full py-3 px-4 bg-orange-500 hover:bg-orange-600 active:scale-98 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-orange-500/20 flex items-center justify-center gap-2"
                >
                  <Printer className="w-4 h-4 text-white" />
                  <span>Print to Printer (Select Any Device)</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setIsWhatsAppOpen(true)}
                    className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <Share2 className="w-3.5 h-3.5 text-white" />
                    <span>Share to WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadPdf}
                    className="py-2.5 px-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5 text-white" />
                    <span>Download PDF</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleDirectThermalPrint}
                  className="w-full py-2 px-3 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                  <span>Direct Silent Thermal Print (Iframe)</span>
                </button>
              </div>
            </div>

            {/* Right side: Live Visual Receipt Preview */}
            <div className="md:col-span-6 bg-slate-200/70 p-4 flex flex-col items-center justify-center overflow-hidden">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>Live Receipt Preview ({selectedFormat})</span>
              </div>
              <div className="w-full max-w-[340px] flex-1 bg-white shadow-xl rounded-lg p-1 overflow-hidden border border-slate-300 flex flex-col">
                <iframe
                  title="Receipt Preview"
                  srcDoc={receiptPreviewHtml}
                  className="w-full flex-1 border-0 bg-white"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* WhatsApp Share Direct Modal */}
      <WhatsAppShareModal
        bill={bill}
        isOpen={isWhatsAppOpen}
        onClose={() => setIsWhatsAppOpen(false)}
      />
    </>
  );
};
