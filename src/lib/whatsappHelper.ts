import { Bill, RestaurantSettings } from '../types/index.ts';
import { db } from './firebase.ts';
import { collection, addDoc } from 'firebase/firestore';
import { getBillPdfFile, downloadBillPDF } from './pdfGenerator.ts';

/**
 * Safely opens a WhatsApp URL in a new window/tab without ever navigating the current window away.
 * This ensures the POS application never loses state or shows the WhatsApp web view inside the billing screen.
 */
export function safeOpenWhatsAppUrl(url: string): boolean {
  try {
    const win = window.open(url, '_blank', 'noopener,noreferrer');
    if (win) {
      return true;
    }
  } catch (err) {
    // Popup was blocked or window.open failed
  }

  // Safe fallback: programmatic anchor click with target="_blank"
  try {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.target = '_blank';
    anchor.rel = 'noopener,noreferrer';
    document.body.appendChild(anchor);
    anchor.click();
    setTimeout(() => {
      if (anchor.parentNode) {
        anchor.parentNode.removeChild(anchor);
      }
    }, 100);
    return true;
  } catch (err) {
    console.error('Failed to open WhatsApp window safely:', err);
    return false;
  }
}

/**
 * Logs a WhatsApp share event in Firestore
 */
export async function logWhatsAppEvent(bill: Bill, targetPhone?: string): Promise<void> {
  try {
    const phoneToUse = targetPhone || bill.customerPhone || '';
    const sanitized = sanitizeWhatsAppPhone(phoneToUse);
    await addDoc(collection(db, 'whatsapp_logs'), {
      billId: bill.id,
      billNumber: bill.billNumber,
      customerId: bill.customerId || '',
      phone: sanitized || 'ANY',
      status: 'SENT',
      sentAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Error recording whatsapp log:', err);
  }
}

/**
 * Formats a clean, professional WhatsApp text receipt for a customer bill.
 * Accurately lists restaurant details, items, quantities, and totals.
 */
export function formatWhatsAppBillText(bill: Bill, settings: RestaurantSettings): string {
  const storeName = settings.restaurantName || 'Food Katta Restaurant';
  const billNo = bill.billNumber || 'BILL';
  const orderType = (bill.orderType || 'Order').toUpperCase();
  const dateStr = new Date(bill.createdAt || Date.now()).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const timeStr = new Date(bill.createdAt || Date.now()).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const lines: string[] = [];

  // Header
  lines.push(`🍽️ *${storeName.toUpperCase()}*`);
  if (settings.address) {
    lines.push(`📍 ${settings.address}`);
  }
  if (settings.phone) {
    lines.push(`📞 Ph: ${settings.phone}`);
  }
  lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`🧾 *TAX INVOICE / CASH BILL*`);
  lines.push(`*Invoice No:* ${billNo}`);
  lines.push(`*Date & Time:* ${dateStr}, ${timeStr}`);
  lines.push(`*Type:* ${orderType}${bill.tableName ? ` (Table: ${bill.tableName})` : ''}`);
  if (bill.customerName) {
    lines.push(`*Customer:* ${bill.customerName}`);
  }
  lines.push(`━━━━━━━━━━━━━━━━━━━━━`);

  // Items
  lines.push(`*ORDERED ITEMS:*`);
  bill.items.forEach((item, index) => {
    const qty = Number(item.quantity || 1);
    const price = Number(item.price || 0);
    const lineTotal = (qty * price).toFixed(2);
    lines.push(`${index + 1}. *${item.name}* (x${qty}) - ₹${lineTotal}`);
    if (item.modifiers && item.modifiers.length > 0) {
      lines.push(`   └ ${item.modifiers.join(', ')}`);
    }
  });

  lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`*Subtotal:* ₹${Number(bill.subtotal || 0).toFixed(2)}`);

  if (Number(bill.orderDiscount || 0) > 0) {
    lines.push(`*Discount:* -₹${Number(bill.orderDiscount || 0).toFixed(2)}`);
  }

  // If taxes apply (when configured)
  if (Number(bill.cgst || 0) > 0) {
    lines.push(`*CGST:* ₹${Number(bill.cgst || 0).toFixed(2)}`);
  }
  if (Number(bill.sgst || 0) > 0) {
    lines.push(`*SGST:* ₹${Number(bill.sgst || 0).toFixed(2)}`);
  }

  lines.push(`*TOTAL PAYABLE: ₹${Number(bill.grandTotal || 0).toFixed(2)}*`);

  // Payments
  if (bill.payments && bill.payments.length > 0) {
    const paymentsStr = bill.payments
      .map(p => `${p.method}: ₹${Number(p.amount || 0).toFixed(2)}`)
      .join(' + ');
    lines.push(`*Paid via:* ${paymentsStr}`);
  } else {
    lines.push(`*Paid via:* CASH`);
  }

  // Add digital invoice link for 1-tap PDF access on customer's phone
  if (typeof window !== 'undefined' && window.location.origin) {
    const billUrl = `${window.location.origin}/?billId=${bill.id}`;
    lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`📄 *Download Official PDF Bill:*`);
    lines.push(billUrl);
  }

  lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(settings.receiptFooter || 'Thank you for visiting! Please visit us again. 🙏');

  return lines.join('\n');
}

/**
 * Formats a clean message specifically designed for PDF Bill dispatch
 */
export function formatWhatsAppPdfMessage(bill: Bill, settings: RestaurantSettings): string {
  const storeName = settings.restaurantName || 'Food Katta Restaurant';
  const billNo = bill.billNumber || 'BILL';
  const total = Number(bill.grandTotal || 0).toFixed(2);
  const dateStr = new Date(bill.createdAt || Date.now()).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const lines: string[] = [];
  lines.push(`🍽️ *${storeName.toUpperCase()}*`);
  lines.push(`🧾 *OFFICIAL TAX INVOICE: ${billNo}*`);
  lines.push(`📅 *Date:* ${dateStr}`);
  lines.push(`💰 *Grand Total: ₹${total}*`);
  lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`📄 *Your official PDF bill has been generated.*`);
  
  if (typeof window !== 'undefined' && window.location.origin) {
    const billUrl = `${window.location.origin}/?billId=${bill.id}`;
    lines.push(`📲 *Tap here to view & download the original PDF invoice:*`);
    lines.push(billUrl);
  }

  lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(settings.receiptFooter || 'Thank you for dining with us! Visit again. 🙏');

  return lines.join('\n');
}

/**
 * Sanitizes phone numbers for WhatsApp URL (defaults to +91 country code for 10-digit Indian numbers).
 */
export function sanitizeWhatsAppPhone(phone: string): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';

  // 10 digits -> Indian mobile number
  if (digits.length === 10) {
    return `91${digits}`;
  }
  // If already starts with 91 and is 12 digits
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits;
  }
  return digits;
}

/**
 * Opens WhatsApp directly in the browser or mobile app safely.
 */
export function openWhatsAppBillDirect(
  bill: Bill,
  settings: RestaurantSettings,
  targetPhone?: string
): void {
  const phoneToUse = targetPhone || bill.customerPhone || '';
  const sanitized = sanitizeWhatsAppPhone(phoneToUse);
  const text = formatWhatsAppBillText(bill, settings);
  const encodedText = encodeURIComponent(text);

  let url: string;
  if (sanitized) {
    url = `https://wa.me/${sanitized}?text=${encodedText}`;
  } else {
    url = `https://wa.me/?text=${encodedText}`;
  }

  // Safe opening in a new tab/window without navigating current page
  safeOpenWhatsAppUrl(url);
  logWhatsAppEvent(bill, targetPhone);
}

/**
 * Sends/Shares the proper PDF bill directly to WhatsApp:
 * 1. Generates the authentic PDF file.
 * 2. If Web Share API Level 2 (with files) is supported (e.g. mobile Android/iOS), directly invokes native share with the PDF file attached!
 * 3. On desktop / fallback, downloads the formatted PDF bill locally, and safely opens WhatsApp Web with the PDF invoice message and digital PDF link!
 */
export async function shareBillPdfToWhatsApp(
  bill: Bill,
  settings: RestaurantSettings,
  targetPhone?: string
): Promise<{ success: boolean; method: 'native-share' | 'whatsapp-web' | 'download-only'; message?: string }> {
  try {
    const pdfFile = getBillPdfFile(bill, settings);

    // 1. Check if native Web Share with files is supported (all modern mobile devices where WhatsApp is installed)
    if (
      typeof navigator !== 'undefined' &&
      navigator.share &&
      navigator.canShare &&
      navigator.canShare({ files: [pdfFile] })
    ) {
      try {
        await navigator.share({
          files: [pdfFile],
          title: `Invoice ${bill.billNumber || ''} - ${settings.restaurantName || 'Food Katta'}`,
          text: `Official PDF Tax Invoice ${bill.billNumber || ''} from ${settings.restaurantName || 'Food Katta'}. Amount: ₹${Number(bill.grandTotal || 0).toFixed(2)}`,
        });
        logWhatsAppEvent(bill, targetPhone);
        return { success: true, method: 'native-share' };
      } catch (shareErr: any) {
        if (shareErr.name === 'AbortError') {
          // User closed the share sheet without picking an app
          return { success: false, method: 'native-share', message: 'Share cancelled by user' };
        }
        console.warn('Native share failed, falling back to download + WhatsApp Web:', shareErr);
      }
    }

    // 2. Desktop or unsupported file share fallback:
    // Generate and download the official PDF invoice immediately
    downloadBillPDF(bill, settings);

    // Safely open WhatsApp Web with invoice details and digital link
    const phoneToUse = targetPhone || bill.customerPhone || '';
    const sanitized = sanitizeWhatsAppPhone(phoneToUse);
    const message = formatWhatsAppPdfMessage(bill, settings);
    const encodedText = encodeURIComponent(message);
    const waUrl = sanitized
      ? `https://wa.me/${sanitized}?text=${encodedText}`
      : `https://wa.me/?text=${encodedText}`;

    safeOpenWhatsAppUrl(waUrl);
    logWhatsAppEvent(bill, targetPhone);

    return {
      success: true,
      method: 'whatsapp-web',
      message: `PDF Bill "${bill.billNumber || 'Bill'}.pdf" downloaded & WhatsApp opened!`,
    };
  } catch (err: any) {
    console.error('Error sharing PDF bill to WhatsApp:', err);
    // Safe ultimate fallback: download PDF
    downloadBillPDF(bill, settings);
    return { success: false, method: 'download-only', message: err.message || 'Error sharing PDF' };
  }
}
