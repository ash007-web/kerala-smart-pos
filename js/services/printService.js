/**
 * ═══════════════════════════════════════════════════════
 * QUICKBILL POS — PRINT RECEIPT SERVICE
 * js/services/printService.js
 * ═══════════════════════════════════════════════════════
 * Generates a clean, professional print layout using
 * window.print() in a popup window.
 */

export function printReceipt(tx) {
  const win = window.open("", "PRINT", "height=700,width=450");
  if (!win) {
    throw new Error("Popup blocked by browser. Please allow popups for this site.");
  }

  win.document.write(`
    <html>
      <head>
        <title>Receipt - ${tx.billId || 'Current'}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
          @page { size: 80mm auto; margin: 8mm; }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: 'Inter', system-ui, sans-serif;
            width: 100%;
            max-width: 320px;
            margin: 0 auto;
            padding: 12px;
            color: #111827;
            background: #fff;
            font-size: 13px;
            line-height: 1.5;
          }
          /* Header */
          .receipt-header {
            text-align: center;
            padding-bottom: 14px;
            border-bottom: 2px dashed #e5e7eb;
            margin-bottom: 14px;
          }
          .store-name {
            font-size: 20px;
            font-weight: 700;
            color: #5211d4;
            letter-spacing: -0.5px;
          }
          .store-subtitle {
            font-size: 11px;
            color: #6b7280;
            margin-top: 2px;
          }
          .store-address {
            font-size: 11px;
            color: #6b7280;
            margin-top: 4px;
          }
          /* Meta */
          .receipt-meta {
            display: flex;
            justify-content: space-between;
            font-size: 11px;
            color: #6b7280;
            margin-bottom: 14px;
          }
          .bill-id {
            font-weight: 600;
            color: #374151;
          }
          /* Divider */
          .divider { border: none; border-top: 1px dashed #e5e7eb; margin: 12px 0; }
          /* Items */
          .items-label {
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 0.08em;
            color: #9ca3af;
            text-transform: uppercase;
            margin-bottom: 8px;
          }
          table { width: 100%; border-collapse: collapse; }
          th {
            text-align: left;
            font-size: 10px;
            font-weight: 600;
            color: #9ca3af;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            padding: 4px 0;
            border-bottom: 1px solid #f3f4f6;
          }
          th:last-child { text-align: right; }
          td { padding: 7px 0; vertical-align: top; border-bottom: 1px solid #f9fafb; }
          td:last-child { text-align: right; font-weight: 600; }
          .item-name { font-weight: 500; }
          .item-unit { font-size: 11px; color: #9ca3af; }
          /* Totals */
          .totals { margin-top: 12px; }
          .total-row {
            display: flex;
            justify-content: space-between;
            padding: 4px 0;
            font-size: 12px;
            color: #6b7280;
          }
          .total-row.grand {
            font-size: 16px;
            font-weight: 700;
            color: #111827;
            border-top: 2px solid #111827;
            margin-top: 8px;
            padding-top: 8px;
          }
          .total-row.grand span:last-child { color: #5211d4; }
          /* Payment badge */
          .payment-badge {
            display: inline-block;
            background: #e9ddff;
            color: #5211d4;
            font-size: 11px;
            font-weight: 700;
            padding: 3px 10px;
            border-radius: 999px;
            margin-top: 10px;
            letter-spacing: 0.06em;
          }
          /* Footer */
          .receipt-footer {
            text-align: center;
            margin-top: 18px;
            padding-top: 14px;
            border-top: 2px dashed #e5e7eb;
            font-size: 11px;
            color: #9ca3af;
          }
          .receipt-footer strong {
            display: block;
            color: #374151;
            font-size: 12px;
            margin-bottom: 4px;
          }
          .powered-by {
            margin-top: 8px;
            font-size: 10px;
            color: #d1d5db;
          }
        </style>
      </head>
      <body>
        ${generateReceiptHTML(tx)}
      </body>
    </html>
  `);

  win.document.close();
  win.focus();

  // Short delay to ensure rendering + Google Fonts load
  setTimeout(() => {
    win.print();
    win.close();
  }, 500);
}

function generateReceiptHTML(tx) {
  // Store name from settings (localStorage) or default
  const storeName    = localStorage.getItem('ksp-shop-name')  || 'QuickBill POS';
  const storeAddress = localStorage.getItem('ksp-shop-address') || 'Your Store Address';
  const storePhone   = localStorage.getItem('ksp-shop-phone')  || '';

  const dateStr = tx.timestamp
    ? new Date(tx.timestamp).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : new Date().toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });

  // Build items HTML
  const itemsHTML = (tx.items || []).map(i => {
    const lineTotal = i.lineTotal != null
      ? parseFloat(i.lineTotal).toFixed(2)
      : (i.price * i.qty).toFixed(2);
    return `
      <tr>
        <td>
          <div class="item-name">${i.name}</div>
        </td>
        <td style="text-align:center;font-size:12px;color:#6b7280;">${i.qty}</td>
        <td style="text-align:right;font-size:12px;color:#6b7280;">₹${parseFloat(i.price).toFixed(2)}</td>
        <td style="text-align:right;font-weight:600;">₹${lineTotal}</td>
      </tr>`;
  }).join('');

  const subtotal = tx.subtotal != null
    ? parseFloat(tx.subtotal).toFixed(2)
    : (parseFloat(tx.total) - parseFloat(tx.tax || 0)).toFixed(2);
  const tax      = tx.tax != null ? parseFloat(tx.tax).toFixed(2) : '0.00';
  const method   = (tx.paymentMethod || 'cash').toUpperCase();

  return `
    <div class="receipt-header">
      <div class="store-name">${storeName}</div>
      <div class="store-subtitle">Point of Sale Receipt</div>
      ${storeAddress ? `<div class="store-address">${storeAddress}${storePhone ? ' · ' + storePhone : ''}</div>` : ''}
    </div>

    <div class="receipt-meta">
      <div><span class="bill-id">Bill #${tx.billId || '—'}</span></div>
      <div>${dateStr}</div>
    </div>

    <div class="items-label">Items Purchased</div>
    <table>
      <thead>
        <tr>
          <th style="width:45%">Item</th>
          <th style="width:15%;text-align:center">Qty</th>
          <th style="width:20%;text-align:right">Unit ₹</th>
          <th style="width:20%;text-align:right">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHTML || '<tr><td colspan="4" style="color:#9ca3af;font-size:12px;">No items</td></tr>'}
      </tbody>
    </table>

    <div class="totals">
      <div class="total-row">
        <span>Subtotal</span>
        <span>₹${subtotal}</span>
      </div>
      ${parseFloat(tax) > 0 ? `
      <div class="total-row">
        <span>GST / Tax</span>
        <span>₹${tax}</span>
      </div>` : ''}
      <div class="total-row grand">
        <span>Total</span>
        <span>₹${parseFloat(tx.total).toFixed(2)}</span>
      </div>
    </div>

    <div style="text-align:center;">
      <span class="payment-badge">Paid via ${method}</span>
    </div>

    <div class="receipt-footer">
      <strong>Thank you for shopping with us!</strong>
      Please retain this receipt for your records.
      <div class="powered-by">Powered by QuickBill POS</div>
    </div>`;
}
