/** A compact, dependency-free PDF receipt renderer for server routes. */
function pdfText(value: unknown) {
  return String(value ?? "")
    .replace(/[\\()]/g, "\\$&")
    .replace(/[^\x20-\x7E]/g, "?");
}

function wrap(value: unknown, length = 78) {
  const words = String(value ?? "").replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    if (`${line} ${word}`.trim().length > length && line) {
      lines.push(line);
      line = word;
    } else line = `${line} ${word}`.trim();
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

export function createAdventPayReceiptPdf(receipt: {
  receiptNumber: string;
  invoiceNumber: string;
  amount: number;
  receivedFromName: string;
  receivedFromEmail: string;
  description: string;
  paymentMethod: string;
  paidAt: string;
  reference?: string;
  note?: string;
}) {
  const rows: Array<[string, string]> = [
    ["Received from", [receipt.receivedFromName, receipt.receivedFromEmail].filter(Boolean).join(" — ")],
    ["For", receipt.description],
    ["Payment method", receipt.paymentMethod],
    ["Payment date", receipt.paidAt],
    ...(receipt.reference ? [["Payment reference", receipt.reference] as [string, string]] : []),
    ...(receipt.note ? [["Note", receipt.note] as [string, string]] : []),
  ];

  const commands = [
    "0.04 0.12 0.24 rg",
    "BT /F1 24 Tf 54 770 Td (AdventPay) Tj ET",
    "0.22 0.32 0.46 rg",
    "BT /F1 11 Tf 54 748 Td (PAYMENT RECEIPT) Tj ET",
    "0.04 0.12 0.24 rg",
    "BT /F1 11 Tf 405 770 Td (Receipt " + pdfText(receipt.receiptNumber) + ") Tj ET",
    "BT /F1 10 Tf 405 750 Td (Invoice " + pdfText(receipt.invoiceNumber) + ") Tj ET",
    "0.02 0.47 0.37 rg",
    "BT /F1 25 Tf 54 696 Td (KES " + Number(receipt.amount).toLocaleString("en-KE", { minimumFractionDigits: 2 }) + ") Tj ET",
    "0.04 0.12 0.24 rg",
  ];
  let y = 650;
  for (const [label, value] of rows) {
    const values = wrap(value);
    commands.push(`0.38 0.45 0.55 rg BT /F1 9 Tf 54 ${y} Td (${pdfText(label)}) Tj ET`);
    commands.push(`0.04 0.12 0.24 rg BT /F1 10 Tf 210 ${y} Td (${pdfText(values[0])}) Tj ET`);
    y -= 20;
    for (const continuation of values.slice(1)) {
      commands.push(`BT /F1 10 Tf 210 ${y} Td (${pdfText(continuation)}) Tj ET`);
      y -= 16;
    }
    y -= 8;
  }
  commands.push(`0.38 0.45 0.55 rg BT /F1 9 Tf 54 72 Td (Issued by AdventPay | https://adventskool.co.ke) Tj ET`);
  commands.push("BT /F1 9 Tf 54 56 Td (This receipt confirms the invoice above has been paid in full.) Tj ET");
  const stream = commands.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}
