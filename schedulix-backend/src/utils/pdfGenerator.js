import puppeteer from "puppeteer";

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatDateTime = (value) =>
  new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));

const formatMoney = (amount = 0, currency = "INR") => {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: Number(amount) % 1 === 0 ? 0 : 2
    }).format(Number(amount) || 0);
  } catch {
    return `${currency} ${Number(amount || 0).toFixed(2)}`;
  }
};

const pdfHtml = (booking, documentType = "appointment") => {
  const title = booking.appointmentTypeId?.title || "Appointment";
  const providerName =
    booking.providerId?.name ||
    booking.appointmentTypeId?.organiserId?.name ||
    "Provider";
  const customerName = booking.customerId?.name || "Customer";
  const venue = booking.appointmentTypeId?.venue || "Online";
  const amount = formatMoney(
    booking.priceAmount || 0,
    booking.currency || booking.appointmentTypeId?.currency || "INR"
  );
  const documentLabel =
    documentType === "payment" ? "Payment Receipt" : "Booking Confirmation";
  const statusLabel =
    documentType === "payment"
      ? booking.paymentStatus || "paid"
      : booking.status || "confirmed";

  const rows = [
    { label: "Booking ID", value: booking._id },
    { label: "Service name", value: title },
    { label: "Provider name", value: providerName },
    { label: "Customer name", value: customerName },
    { label: "Date and time", value: formatDateTime(booking.startTime) },
    { label: "Venue", value: venue },
    { label: "Status", value: statusLabel },
    { label: documentType === "payment" ? "Amount paid" : "Amount", value: amount }
  ];

  if (documentType === "payment") {
    rows.push({
      label: "Payment method",
      value: booking.paymentMethod || "manual"
    });
    rows.push({
      label: "Paid at",
      value: booking.paidAt ? formatDateTime(booking.paidAt) : "Pending"
    });
  }

  return `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>Schedulix ${escapeHtml(documentLabel)}</title>
        <style>
          :root {
            color-scheme: light;
          }
          * {
            box-sizing: border-box;
          }
          body {
            margin: 0;
            font-family: Arial, Helvetica, sans-serif;
            background: #f6f3ee;
            color: #231b24;
          }
          .page {
            width: 210mm;
            min-height: 297mm;
            margin: 0 auto;
            padding: 18mm 16mm;
          }
          .card {
            background: #ffffff;
            border: 1px solid #eaded2;
            border-radius: 24px;
            overflow: hidden;
            box-shadow: 0 12px 34px rgba(35, 27, 36, 0.08);
          }
          .hero {
            padding: 28px 32px 24px;
            background: linear-gradient(135deg, #fff7f7 0%, #fff1f4 100%);
            border-bottom: 1px solid #f0e2e3;
          }
          .eyebrow {
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.16em;
            color: #9a6f76;
          }
          h1 {
            margin: 14px 0 0;
            font-size: 30px;
            line-height: 1.15;
          }
          .intro {
            margin: 12px 0 0;
            max-width: 520px;
            font-size: 14px;
            line-height: 1.7;
            color: #5e5860;
          }
          .meta {
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
            margin-top: 20px;
          }
          .meta-pill {
            padding: 10px 14px;
            border-radius: 999px;
            background: rgba(255, 255, 255, 0.9);
            border: 1px solid #eedfe0;
            font-size: 12px;
            font-weight: 700;
            color: #6e5560;
          }
          .content {
            padding: 28px 32px 32px;
          }
          .grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 14px;
          }
          .item {
            padding: 16px 18px;
            border-radius: 18px;
            border: 1px solid #eee4db;
            background: #fcfaf8;
          }
          .label {
            margin: 0 0 6px;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: #8b7f74;
          }
          .value {
            margin: 0;
            font-size: 16px;
            line-height: 1.55;
            font-weight: 600;
            color: #231b24;
            word-break: break-word;
          }
          .footer {
            margin-top: 22px;
            padding-top: 18px;
            border-top: 1px solid #f0e6dd;
            font-size: 12px;
            line-height: 1.7;
            color: #7a7076;
          }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="card">
            <div class="hero">
              <div class="eyebrow">Schedulix</div>
              <h1>${escapeHtml(documentLabel)}</h1>
              <p class="intro">
                ${escapeHtml(
                  documentType === "payment"
                    ? "This receipt confirms the payment recorded against the booking."
                    : "This document confirms the scheduled service, provider, and current booking state."
                )}
              </p>
              <div class="meta">
                <span class="meta-pill">${escapeHtml(title)}</span>
                <span class="meta-pill">${escapeHtml(statusLabel)}</span>
              </div>
            </div>
            <div class="content">
              <div class="grid">
                ${rows
                  .map(
                    (row) => `
                      <div class="item">
                        <p class="label">${escapeHtml(row.label)}</p>
                        <p class="value">${escapeHtml(row.value)}</p>
                      </div>
                    `
                  )
                  .join("")}
              </div>
              <div class="footer">
                Generated by Schedulix on ${escapeHtml(formatDateTime(new Date()))}.
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
};

export const generateBookingPDF = async (booking, documentType = "appointment") => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  try {
    const page = await browser.newPage();
    await page.setContent(pdfHtml(booking, documentType), {
      waitUntil: "networkidle0"
    });

    return await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "0",
        right: "0",
        bottom: "0",
        left: "0"
      }
    });
  } finally {
    await browser.close();
  }
};
