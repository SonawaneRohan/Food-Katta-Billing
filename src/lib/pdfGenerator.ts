import { jsPDF } from 'jspdf';
import { Bill, RestaurantSettings } from '../types/index.ts';

/**
 * Generates an HTML string optimized for standard 80mm or 58mm thermal receipt printers.
 */
export function generateReceiptHtml(bill: Bill, settings: RestaurantSettings): string {
  const widthMm = settings.thermalPrinterWidth === '58mm' || settings.printerType === 'thermal-58mm' ? '58mm' : '80mm';
  const currencySymbol = settings.currency || '₹';

  const subtotal = Number(bill.subtotal || 0);
  const orderDiscount = Number(bill.orderDiscount || 0);
  const itemDiscounts = Number(bill.itemDiscounts || 0);
  const totalDiscount = orderDiscount + itemDiscounts;
  const taxableAmount = Number(bill.taxableAmount || Math.max(0, subtotal - totalDiscount));
  const cgst = Number(bill.cgst || 0);
  const sgst = Number(bill.sgst || 0);
  const roundOff = Number(bill.roundOff || 0);
  const grandTotal = Number(bill.grandTotal || 0);

  const dateStr = bill.createdAt ? new Date(bill.createdAt).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN');
  const timeStr = bill.createdAt ? new Date(bill.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  const itemsHtml = (bill.items || []).map((item) => {
    const qty = Number(item.quantity || 1);
    const price = Number(item.price || 0);
    const amount = qty * price;
    return `
      <tr>
        <td style="text-align: left; padding: 2px 0; word-break: break-word;">
          <div style="font-weight: 600;">${item.name || 'Item'}</div>
          ${item.notes ? `<div style="font-size: 9px; color: #555;">* ${item.notes}</div>` : ''}
        </td>
        <td style="text-align: center; padding: 2px 4px; vertical-align: top;">${qty}</td>
        <td style="text-align: right; padding: 2px 4px; vertical-align: top;">${price.toFixed(2)}</td>
        <td style="text-align: right; padding: 2px 0; vertical-align: top; font-weight: 600;">${amount.toFixed(2)}</td>
      </tr>
    `;
  }).join('');

  const paymentsHtml = (bill.payments && bill.payments.length > 0)
    ? bill.payments.map(p => `${p.method}: ${currencySymbol}${Number(p.amount || 0).toFixed(2)}${p.referenceNumber ? ` (${p.referenceNumber})` : ''}`).join('<br>')
    : `CASH: ${currencySymbol}${grandTotal.toFixed(2)}`;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Receipt - ${bill.billNumber}</title>
        <style>
          @page {
            size: ${widthMm} auto;
            margin: 0mm;
          }
          @media print {
            body {
              margin: 0;
              padding: 4mm;
            }
          }
          body {
            font-family: 'Courier New', Courier, monospace, -apple-system, sans-serif;
            width: ${widthMm};
            max-width: ${widthMm};
            margin: 0 auto;
            padding: 4mm 3mm;
            color: #000;
            background: #fff;
            font-size: 11px;
            line-height: 1.25;
            box-sizing: border-box;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .font-bold { font-weight: 700; }
          .divider {
            border-top: 1px dashed #000;
            margin: 4px 0;
          }
          .double-divider {
            border-top: 2px solid #000;
            margin: 4px 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
          }
          th {
            border-bottom: 1px dashed #000;
            padding: 2px 0;
            font-weight: 700;
          }
          .totals-row td {
            padding: 1.5px 0;
          }
          .grand-total-box {
            border-top: 1px dashed #000;
            border-bottom: 1px dashed #000;
            padding: 4px 0;
            margin: 4px 0;
            font-size: 13px;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="text-center">
          <div style="font-size: 16px; font-weight: 900; letter-spacing: 0.5px;">${settings.restaurantName ? settings.restaurantName.toUpperCase() : 'FOOD KATTA'}</div>
          ${settings.tagline ? `<div style="font-size: 10px; margin-top: 1px;">${settings.tagline}</div>` : ''}
          <div style="font-size: 10px; margin-top: 2px;">${settings.address || ''}</div>
          <div style="font-size: 10px;">Ph: ${settings.phone || ''}</div>
          ${settings.gstin ? `<div style="font-size: 10px;">GSTIN: ${settings.gstin}</div>` : ''}
          ${settings.fssai ? `<div style="font-size: 10px;">FSSAI Lic: ${settings.fssai}</div>` : ''}
        </div>

        <div class="divider"></div>

        <div>
          <div style="display: flex; justify-content: space-between;">
            <span class="font-bold">BILL: ${bill.billNumber || 'FK-BILL'}</span>
            <span>${dateStr}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>Type: <b>${(bill.orderType || 'Dine-In').toUpperCase()}</b></span>
            <span>${timeStr}</span>
          </div>
          ${bill.tableName ? `<div>Table: <b>${bill.tableName}</b></div>` : ''}
          <div>Cashier: ${bill.cashierName || 'Staff'}</div>
          ${bill.customerName ? `<div>Customer: ${bill.customerName} ${bill.customerPhone ? `(${bill.customerPhone})` : ''}</div>` : ''}
        </div>

        <div class="divider"></div>

        <table>
          <thead>
            <tr>
              <th style="text-align: left;">ITEM</th>
              <th style="text-align: center; width: 26px;">QTY</th>
              <th style="text-align: right; width: 42px;">RATE</th>
              <th style="text-align: right; width: 46px;">AMT</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="divider"></div>

        <table>
          <tr class="totals-row">
            <td style="text-align: left;">Subtotal:</td>
            <td style="text-align: right;">${currencySymbol}${subtotal.toFixed(2)}</td>
          </tr>
          ${totalDiscount > 0 ? `
          <tr class="totals-row">
            <td style="text-align: left;">Discount:</td>
            <td style="text-align: right;">-${currencySymbol}${totalDiscount.toFixed(2)}</td>
          </tr>
          ` : ''}
          ${cgst > 0 ? `
          <tr class="totals-row">
            <td style="text-align: left;">CGST (${settings.cgstRate || 2.5}%):</td>
            <td style="text-align: right;">${currencySymbol}${cgst.toFixed(2)}</td>
          </tr>
          ` : ''}
          ${sgst > 0 ? `
          <tr class="totals-row">
            <td style="text-align: left;">SGST (${settings.sgstRate || 2.5}%):</td>
            <td style="text-align: right;">${currencySymbol}${sgst.toFixed(2)}</td>
          </tr>
          ` : ''}
          ${roundOff !== 0 ? `
          <tr class="totals-row">
            <td style="text-align: left;">Round Off:</td>
            <td style="text-align: right;">${roundOff > 0 ? '+' : ''}${roundOff.toFixed(2)}</td>
          </tr>
          ` : ''}
        </table>

        <div class="grand-total-box">
          <div style="display: flex; justify-content: space-between;">
            <span>TOTAL PAYABLE:</span>
            <span>${currencySymbol}${grandTotal.toFixed(2)}</span>
          </div>
        </div>

        <div style="font-size: 10px; margin-top: 3px;">
          <div class="font-bold">Payment Method:</div>
          <div>${paymentsHtml}</div>
          <div style="margin-top: 2px;">STATUS: <b>${bill.paymentStatus || 'PAID'}</b></div>
        </div>

        <div class="divider"></div>

        <div class="text-center" style="margin-top: 4px;">
          <div style="font-style: italic; font-size: 10px;">${settings.receiptFooter || 'Thank you for dining with us! Visit again!'}</div>
          <div style="font-size: 8px; color: #555; margin-top: 3px;">Powered by Food Katta Restaurant POS</div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Triggers instant native thermal receipt print via hidden iframe.
 * This completely bypasses browser popup blockers and works directly inside embedded environments.
 */
export function printReceiptThermal(bill: Bill, settings: RestaurantSettings): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      // Remove any existing print iframe to guarantee fresh content
      const existing = document.getElementById('pos-print-thermal-iframe');
      if (existing) {
        existing.remove();
      }

      const printIframe = document.createElement('iframe');
      printIframe.id = 'pos-print-thermal-iframe';
      printIframe.style.position = 'fixed';
      printIframe.style.right = '0';
      printIframe.style.bottom = '0';
      printIframe.style.width = '350px';
      printIframe.style.height = '600px';
      printIframe.style.opacity = '0.01';
      printIframe.style.pointerEvents = 'none';
      printIframe.style.zIndex = '-9999';
      document.body.appendChild(printIframe);

      const receiptHtml = generateReceiptHtml(bill, settings);
      const frameDoc = printIframe.contentWindow?.document;

      if (!frameDoc) {
        console.warn('Iframe contentWindow document inaccessible, falling back to window.print()');
        window.print();
        resolve(true);
        return;
      }

      frameDoc.open();
      frameDoc.write(receiptHtml);
      frameDoc.close();

      setTimeout(() => {
        try {
          printIframe.contentWindow?.focus();
          printIframe.contentWindow?.print();
          resolve(true);
        } catch (printErr) {
          console.warn('Thermal iframe print error, attempting window.print():', printErr);
          window.print();
          resolve(true);
        }
      }, 300);
    } catch (err) {
      console.error('Failed to trigger receipt printing:', err);
      try {
        window.print();
      } catch (e) {
        // ignore
      }
      resolve(false);
    }
  });
}

/**
 * Robust, safe PDF generator for receipts using jsPDF.
 * Guards against all undefined/null numbers to prevent `.toFixed()` TypeErrors.
 */
export function generateBillPDF(bill: Bill, settings: RestaurantSettings): jsPDF {
  const receiptWidth = 80;
  const itemCount = bill.items ? bill.items.length : 0;
  const estimatedHeight = Math.max(180, 120 + (itemCount * 10));

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [receiptWidth, estimatedHeight],
  });

  const currencySymbol = settings.currency || 'Rs.';

  let y = 8;
  const centerX = receiptWidth / 2;

  const subtotal = Number(bill.subtotal || 0);
  const orderDiscount = Number(bill.orderDiscount || 0);
  const itemDiscounts = Number(bill.itemDiscounts || 0);
  const totalDiscount = orderDiscount + itemDiscounts;
  const cgst = Number(bill.cgst || 0);
  const sgst = Number(bill.sgst || 0);
  const roundOff = Number(bill.roundOff || 0);
  const grandTotal = Number(bill.grandTotal || 0);

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text((settings.restaurantName || 'FOOD KATTA').toUpperCase(), centerX, y, { align: 'center' });
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(settings.tagline || 'Authentic Taste & Good Vibes', centerX, y, { align: 'center' });
  y += 4;

  if (settings.address) {
    const addressLines = doc.splitTextToSize(settings.address, receiptWidth - 10);
    doc.text(addressLines, centerX, y, { align: 'center' });
    y += (addressLines.length * 3.5) + 1;
  }

  if (settings.phone) {
    doc.text(`Phone: ${settings.phone}`, centerX, y, { align: 'center' });
    y += 3.5;
  }

  if (settings.gstin) {
    doc.text(`GSTIN: ${settings.gstin}`, centerX, y, { align: 'center' });
    y += 3.5;
  }
  if (settings.fssai) {
    doc.text(`FSSAI Lic: ${settings.fssai}`, centerX, y, { align: 'center' });
    y += 3.5;
  }

  // Divider line
  y += 1;
  doc.setLineWidth(0.3);
  doc.line(4, y, receiptWidth - 4, y);
  y += 4;

  // Bill metadata
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(`BILL: ${bill.billNumber || 'FK-BILL'}`, 4, y);
  const dateStr = bill.createdAt ? new Date(bill.createdAt).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN');
  doc.text(dateStr, receiptWidth - 4, y, { align: 'right' });
  y += 3.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  const timeStr = bill.createdAt ? new Date(bill.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';
  doc.text(`Time: ${timeStr}`, 4, y);
  doc.text(`Type: ${(bill.orderType || 'DINE-IN').toUpperCase()}`, receiptWidth - 4, y, { align: 'right' });
  y += 3.5;

  if (bill.tableName) {
    doc.text(`Table: ${bill.tableName}`, 4, y);
  }
  doc.text(`Cashier: ${bill.cashierName || 'Staff'}`, receiptWidth - 4, y, { align: 'right' });
  y += 3.5;

  if (bill.customerName) {
    doc.text(`Cust: ${bill.customerName} ${bill.customerPhone ? `(${bill.customerPhone})` : ''}`, 4, y);
    y += 3.5;
  }

  // Divider
  doc.line(4, y, receiptWidth - 4, y);
  y += 3.5;

  // Table header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('ITEM', 4, y);
  doc.text('QTY', 44, y, { align: 'center' });
  doc.text('RATE', 58, y, { align: 'right' });
  doc.text('AMT', receiptWidth - 4, y, { align: 'right' });
  y += 2;
  doc.setLineWidth(0.15);
  doc.line(4, y, receiptWidth - 4, y);
  y += 3.5;

  // Items
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);

  (bill.items || []).forEach(item => {
    const qty = Number(item.quantity || 1);
    const price = Number(item.price || 0);
    const itemTotal = price * qty;
    const nameLines = doc.splitTextToSize(item.name || 'Item', 38);
    doc.text(nameLines, 4, y);
    doc.text(String(qty), 44, y, { align: 'center' });
    doc.text(price.toFixed(2), 58, y, { align: 'right' });
    doc.text(itemTotal.toFixed(2), receiptWidth - 4, y, { align: 'right' });

    y += (nameLines.length * 3.2);

    if (item.notes) {
      doc.setFontSize(6);
      doc.setTextColor(90, 90, 90);
      doc.text(`* ${item.notes}`, 6, y);
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(7);
      y += 2.8;
    }
  });

  // Divider
  y += 1;
  doc.setLineWidth(0.3);
  doc.line(4, y, receiptWidth - 4, y);
  y += 4;

  // Totals calculations
  doc.setFontSize(7.5);
  doc.text('Subtotal:', 38, y);
  doc.text(`${currencySymbol} ${subtotal.toFixed(2)}`, receiptWidth - 4, y, { align: 'right' });
  y += 3.5;

  if (totalDiscount > 0) {
    doc.text('Discount:', 38, y);
    doc.text(`-${currencySymbol} ${totalDiscount.toFixed(2)}`, receiptWidth - 4, y, { align: 'right' });
    y += 3.5;
  }

  if (cgst > 0) {
    doc.text(`CGST (${settings.cgstRate || 2.5}%):`, 38, y);
    doc.text(`${currencySymbol} ${cgst.toFixed(2)}`, receiptWidth - 4, y, { align: 'right' });
    y += 3.5;
  }

  if (sgst > 0) {
    doc.text(`SGST (${settings.sgstRate || 2.5}%):`, 38, y);
    doc.text(`${currencySymbol} ${sgst.toFixed(2)}`, receiptWidth - 4, y, { align: 'right' });
    y += 3.5;
  }

  if (roundOff !== 0) {
    doc.text('Round off:', 38, y);
    doc.text(`${roundOff > 0 ? '+' : ''}${roundOff.toFixed(2)}`, receiptWidth - 4, y, { align: 'right' });
    y += 3.5;
  }

  // Grand Total Box
  y += 1;
  doc.setFillColor(245, 245, 245);
  doc.rect(4, y - 2, receiptWidth - 8, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('TOTAL PAYABLE:', 6, y + 2.5);
  doc.text(`${currencySymbol} ${grandTotal.toFixed(2)}`, receiptWidth - 6, y + 2.5, { align: 'right' });
  y += 8;

  // Payments
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  if (bill.payments && bill.payments.length > 0) {
    const paymentDesc = bill.payments
      .map(p => `${p.method}: ${currencySymbol}${Number(p.amount || 0).toFixed(2)}${p.referenceNumber ? ` (${p.referenceNumber})` : ''}`)
      .join(' | ');
    doc.text(`Payment: ${paymentDesc}`, 4, y);
    y += 4;
  }

  // Status
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text(`STATUS: ${bill.paymentStatus || 'PAID'}`, 4, y);
  y += 5;

  // Footer Message
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.text(settings.receiptFooter || 'Thank you for visiting Food Katta. Visit Again!', centerX, y, { align: 'center' });
  y += 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(100, 100, 100);
  doc.text('Powered by Food Katta POS', centerX, y, { align: 'center' });

  return doc;
}

export function downloadBillPDF(bill: Bill, settings: RestaurantSettings) {
  try {
    const doc = generateBillPDF(bill, settings);
    doc.save(`${bill.billNumber || 'Food_Katta_Bill'}.pdf`);
  } catch (err) {
    console.error('Failed to download Bill PDF:', err);
    // Fallback: trigger print receipt which allows saving as PDF in browser
    printReceiptThermal(bill, settings);
  }
}

/**
 * Universal print dialog trigger: performs direct thermal print, bypassing popup blockers.
 */
export function openPrintDialog(bill: Bill, settings: RestaurantSettings) {
  printReceiptThermal(bill, settings);
}
