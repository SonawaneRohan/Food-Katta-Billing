import React, { useState, useEffect } from 'react';
import {
  X,
  Send,
  MessageCircle,
  Phone,
  CheckCircle2,
  User,
  Copy,
  Check,
  FileText,
  Download,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Bill } from '../../types/index.ts';
import { useRestaurant } from '../../context/RestaurantContext.tsx';
import {
  formatWhatsAppBillText,
  formatWhatsAppPdfMessage,
  sanitizeWhatsAppPhone,
  shareBillPdfToWhatsApp,
  openWhatsAppBillDirect,
} from '../../lib/whatsappHelper.ts';
import { downloadBillPDF } from '../../lib/pdfGenerator.ts';

interface WhatsAppShareModalProps {
  bill: Bill | null;
  isOpen: boolean;
  onClose: () => void;
  onAfterShare?: () => void;
}

export const WhatsAppShareModal: React.FC<WhatsAppShareModalProps> = ({
  bill,
  isOpen,
  onClose,
  onAfterShare,
}) => {
  const { settings } = useRestaurant();
  const [phoneNumber, setPhoneNumber] = useState<string>(bill?.customerPhone || '');
  const [copied, setCopied] = useState<boolean>(false);
  const [isSharing, setIsSharing] = useState<boolean>(false);
  const [shareSuccess, setShareSuccess] = useState<string | null>(null);
  const [showRawText, setShowRawText] = useState<boolean>(false);

  // Sync phone when bill changes
  useEffect(() => {
    if (bill?.customerPhone) {
      setPhoneNumber(bill.customerPhone);
    }
    setShareSuccess(null);
    setIsSharing(false);
  }, [bill, isOpen]);

  if (!isOpen || !bill) return null;

  const sanitized = sanitizeWhatsAppPhone(phoneNumber);
  const pdfFileName = `${(bill.billNumber || 'Food_Katta_Bill').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
  const grandTotal = Number(bill.grandTotal || 0);

  /**
   * Primary Action: Shares proper PDF bill to WhatsApp.
   * On mobile devices with Web Share, directly attaches the PDF document into WhatsApp.
   * On desktop, saves the PDF file and opens WhatsApp with the digital bill link and details.
   * After sharing, triggers the redirection callback to return to the billing system home screen!
   */
  const handleSharePdf = async () => {
    try {
      setIsSharing(true);
      const result = await shareBillPdfToWhatsApp(bill, settings, phoneNumber);

      if (result.success) {
        setShareSuccess(
          result.method === 'native-share'
            ? 'PDF Document attached to WhatsApp!'
            : 'PDF Bill saved & WhatsApp opened! Redirecting...'
        );

        // Allow user to see confirmation, then return to billing home screen
        setTimeout(() => {
          setIsSharing(false);
          setShareSuccess(null);
          if (onAfterShare) {
            onAfterShare();
          } else {
            onClose();
          }
        }, 1200);
      } else {
        setIsSharing(false);
      }
    } catch (err) {
      console.error('Failed to share PDF:', err);
      setIsSharing(false);
    }
  };

  /**
   * Direct download of the PDF bill
   */
  const handleDownloadPdf = () => {
    downloadBillPDF(bill, settings);
  };

  /**
   * Fallback text share
   */
  const handleSendTextOnly = () => {
    openWhatsAppBillDirect(bill, settings, phoneNumber);
    setShareSuccess('WhatsApp opened with text bill! Redirecting...');
    setTimeout(() => {
      setShareSuccess(null);
      if (onAfterShare) {
        onAfterShare();
      } else {
        onClose();
      }
    }, 1200);
  };

  const handleCopyText = () => {
    const text = formatWhatsAppBillText(bill, settings);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 flex flex-col max-h-[92vh] font-sans animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 bg-emerald-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-white">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm uppercase tracking-tight text-white flex items-center gap-1.5">
                <span>Send PDF Bill to WhatsApp</span>
              </h3>
              <p className="text-[11px] text-emerald-100">
                Invoice {bill.billNumber} • ₹{grandTotal.toFixed(2)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-emerald-100 hover:text-white rounded-lg transition-colors hover:bg-emerald-800/50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* Customer & Phone input */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              Customer WhatsApp / Mobile Number
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="e.g. 9876543210 (or with country code)"
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-mono"
              />
            </div>
            <p className="text-[10px] text-slate-500">
              {sanitized ? (
                <span className="text-emerald-700 font-semibold">
                  ✓ Ready to send to: +{sanitized}
                </span>
              ) : (
                'Enter phone number or leave blank to choose from contacts in WhatsApp.'
              )}
            </p>
          </div>

          {/* Quick info if customer is known */}
          {bill.customerName && (
            <div className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700">
              <User className="w-4 h-4 text-slate-400 shrink-0" />
              <div className="truncate">
                <span className="text-[10px] text-slate-400 block">Customer:</span>
                <span className="font-bold text-slate-900">{bill.customerName}</span>
              </div>
            </div>
          )}

          {/* PDF Bill Document Card Preview */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-red-100 text-red-600 flex items-center justify-center shrink-0 shadow-2xs">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <span className="truncate max-w-[190px]">{pdfFileName}</span>
                    <span className="text-[9px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-black">
                      PDF
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Official Tax Receipt • {bill.items.length} items • ₹{grandTotal.toFixed(2)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDownloadPdf}
                title="Download PDF copy directly"
                className="p-1.5 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100 rounded-md transition-colors"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>

            <div className="text-[10px] text-emerald-800 bg-emerald-100/60 p-2 rounded-lg leading-relaxed flex items-start gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                Formatted tax invoice with restaurant logo, itemized table, GST breakdown, and official footer.
              </span>
            </div>
          </div>

          {/* Success / Status Banner */}
          {shareSuccess && (
            <div className="p-3 bg-emerald-100 border border-emerald-300 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 animate-bounce" />
              <span>{shareSuccess}</span>
            </div>
          )}

          {/* Collapsible raw text view (fallback) */}
          <div className="border-t border-slate-100 pt-2">
            <button
              type="button"
              onClick={() => setShowRawText(!showRawText)}
              className="w-full flex items-center justify-between text-slate-500 hover:text-slate-700 text-[11px] font-medium py-1"
            >
              <span>View message details / link preview</span>
              {showRawText ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showRawText && (
              <div className="mt-2 space-y-1.5 animate-in fade-in">
                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={handleCopyText}
                    className="text-[10px] text-emerald-700 font-semibold hover:underline flex items-center gap-1"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        Copy text
                      </>
                    )}
                  </button>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-[10px] text-slate-700 max-h-36 overflow-y-auto whitespace-pre-wrap">
                  {formatWhatsAppPdfMessage(bill, settings)}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col gap-2">
          {/* Primary Action Button: Send PDF to WhatsApp */}
          <button
            type="button"
            onClick={handleSharePdf}
            disabled={isSharing}
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-emerald-700/20 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSharing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Generating & Sending PDF...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4 text-white" />
                <span>
                  {sanitized ? `Send PDF Bill to WhatsApp (+${sanitized})` : 'Send PDF Bill to WhatsApp'}
                </span>
              </>
            )}
          </button>

          {/* Secondary Actions */}
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="flex-1 py-2 px-3 border border-slate-300 rounded-lg text-[11px] font-bold text-slate-700 hover:bg-slate-100 transition-colors flex items-center justify-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Save PDF</span>
            </button>

            <button
              type="button"
              onClick={handleSendTextOnly}
              className="flex-1 py-2 px-3 border border-slate-300 rounded-lg text-[11px] font-bold text-slate-700 hover:bg-slate-100 transition-colors flex items-center justify-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
              <span>Send Text Only</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="py-2 px-3 text-[11px] font-bold text-slate-500 hover:text-slate-800 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
