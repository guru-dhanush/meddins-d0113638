import { formatPrice } from "@/lib/currency";

/** Generate a printable invoice in a new window */
export function openInvoice(data: {
  bookingId: string;
  transactionId: string;
  providerName: string;
  patientName: string;
  date: string;
  time: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  paidAt: string;
  convertedAmount?: number;
  convertedCurrency?: string;
}) {
  const mainPrice = formatPrice(data.amount, data.currency);
  const convertedLine = data.convertedAmount && data.convertedCurrency && data.convertedCurrency !== data.currency
    ? `<div class="row"><span class="label">Converted Amount</span><span class="value">${formatPrice(data.convertedAmount, data.convertedCurrency)}</span></div>`
    : "";

  const html = `<!DOCTYPE html>
<html>
<head>
  <title>Invoice - ${data.transactionId}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; color: #1a1a1a; max-width: 700px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 2px solid #0ea5e9; padding-bottom: 20px; }
    .header h1 { font-size: 28px; color: #0ea5e9; }
    .header .meta { text-align: right; font-size: 13px; color: #666; }
    .section { margin-bottom: 24px; }
    .section h3 { font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #888; margin-bottom: 8px; }
    .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; font-size: 14px; }
    .row .label { color: #666; }
    .row .value { font-weight: 500; }
    .total { display: flex; justify-content: space-between; padding: 16px 0; border-top: 2px solid #1a1a1a; margin-top: 16px; font-size: 18px; font-weight: 700; }
    .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #aaa; }
    .badge { display: inline-block; background: #dcfce7; color: #166534; padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>Invoice</h1>
      <p style="color:#666;font-size:13px;margin-top:4px">Meddin Health Platform</p>
    </div>
    <div class="meta">
      <p><strong>Invoice #</strong> ${data.transactionId}</p>
      <p>Date: ${data.paidAt}</p>
      <p><span class="badge">Paid</span></p>
    </div>
  </div>

  <div class="section">
    <h3>Appointment Details</h3>
    <div class="row"><span class="label">Booking ID</span><span class="value">#${data.bookingId.slice(0, 8)}</span></div>
    <div class="row"><span class="label">Provider</span><span class="value">${data.providerName}</span></div>
    <div class="row"><span class="label">Patient</span><span class="value">${data.patientName}</span></div>
    <div class="row"><span class="label">Date</span><span class="value">${data.date}</span></div>
    <div class="row"><span class="label">Time</span><span class="value">${data.time}</span></div>
  </div>

  <div class="section">
    <h3>Payment Details</h3>
    <div class="row"><span class="label">Payment Method</span><span class="value">${data.paymentMethod}</span></div>
    <div class="row"><span class="label">Transaction ID</span><span class="value">${data.transactionId}</span></div>
    ${convertedLine}
    <div class="total"><span>Total Paid</span><span>${mainPrice}</span></div>
  </div>

  <div class="footer">
    <p>Thank you for using Meddin. This is a computer-generated invoice.</p>
  </div>

  <script>window.onload = () => window.print();</script>
</body>
</html>`;

  const w = window.open("", "_blank");
  if (w) {
    w.document.write(html);
    w.document.close();
  }
}
