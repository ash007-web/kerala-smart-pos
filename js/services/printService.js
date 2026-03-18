export function printReceipt(tx) {
  const win = window.open("", "PRINT", "height=600,width=400");
  if (!win) {
    throw new Error("Popup blocked by browser. Please allow popups for this site.");
  }

  win.document.write(`
    <html>
      <head>
        <title>Receipt - ${tx.billId || 'Current'}</title>
        <style>
          @page { margin: 0; }
          body { 
            font-family: monospace; 
            width: 280px; 
            margin: 0; 
            padding: 10px; 
            color: #000;
            background: #fff;
            font-size: 12px;
            line-height: 1.4;
          }
          h3 { margin: 0 0 5px 0; font-size: 16px; text-align: center; }
          p { margin: 2px 0; }
          .center { text-align: center; }
          .right { text-align: right; }
          hr { border: none; border-top: 1px dashed #000; margin: 8px 0; }
          table { width: 100%; border-collapse: collapse; }
          th, td { text-align: left; padding: 2px 0; vertical-align: top; }
          th:last-child, td:last-child { text-align: right; }
          .bold { font-weight: bold; }
        </style>
      </head>
      <body>
        ${generateReceiptHTML(tx)}
      </body>
    </html>
  `);

  win.document.close();
  win.focus();

  // Short delay to ensure rendering completes before printing
  setTimeout(() => {
    win.print();
    win.close();
  }, 250);
}

function generateReceiptHTML(tx) {
  const dateStr = tx.timestamp 
    ? new Date(tx.timestamp).toLocaleString() 
    : new Date().toLocaleString();

  // Ensure lineTotal exists for each item
  const itemsHTML = (tx.items || []).map(i => {
    const lineTotal = i.lineTotal != null ? i.lineTotal : (i.price * i.qty).toFixed(2);
    return `
      <tr>
        <td>${i.name}</td>
        <td>x${i.qty}</td>
        <td>₹${lineTotal}</td>
      </tr>
    `;
  }).join("");

  const subtotal = tx.subtotal != null ? tx.subtotal : (tx.total - (tx.tax || 0)).toFixed(2);
  const tax = tx.tax != null ? tx.tax : '0.00';
  const method = (tx.paymentMethod || 'cash').toUpperCase();

  return `
    <div class="center">
      <h3>QuickBill POS</h3>
      <p>Thank you for your visit!</p>
    </div>
    <hr/>
    <p>Bill ID: ${tx.billId || '—'}</p>
    <p>Date: ${dateStr}</p>
    <hr/>
    <table>
      <thead>
        <tr>
          <th>Item</th>
          <th>Qty</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHTML}
      </tbody>
    </table>
    <hr/>
    <table>
      <tr>
        <td>Subtotal</td>
        <td class="bold">₹${subtotal}</td>
      </tr>
      <tr>
        <td>Tax</td>
        <td class="bold">₹${tax}</td>
      </tr>
      <tr>
        <td class="bold" style="font-size: 14px; padding-top: 4px;">Total</td>
        <td class="bold" style="font-size: 14px; padding-top: 4px;">₹${tx.total}</td>
      </tr>
    </table>
    <hr/>
    <p>Payment Mode: ${method}</p>
    <hr/>
    <p class="center">Please retain this receipt for<br/>your records.</p>
  `;
}
