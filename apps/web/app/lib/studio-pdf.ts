import 'server-only';

type StudioSummary = {
  orderNumber: string;
  customerName: string;
  contactEmail: string;
  businessName: string | null;
  packageName: string;
  amountPaidCents: number;
  stripePaymentReference: string | null;
  requirements: Record<string, unknown>;
};

function pdfEscape(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

/** Deliberately small, dependency-free PDF summary; no customer HTML is interpreted as PDF syntax. */
export function buildStudioProjectSummaryPdf(summary: StudioSummary): Buffer {
  const details = Object.entries(summary.requirements)
    .filter(([, value]) => typeof value === 'string' && value.length > 0)
    .flatMap(([key, value]) => [`${key}:`, String(value)])
    .flatMap((line) => line.match(/.{1,92}/g) ?? ['']);
  const lines = [
    'VouchNet Studio — Project summary',
    `Order: ${summary.orderNumber}`,
    `Customer: ${summary.customerName} <${summary.contactEmail}>`,
    `Business: ${summary.businessName ?? 'Not provided'}`,
    `Package: ${summary.packageName}`,
    `Deposit paid: $${(summary.amountPaidCents / 100).toFixed(2)} USD`,
    `Stripe reference: ${summary.stripePaymentReference ?? 'Pending'}`,
    '',
    'Submitted requirements',
    ...details,
  ];
  const stream = [
    'BT',
    '/F1 10 Tf',
    '50 760 Td',
    '14 TL',
    ...lines.map((line) => `(${pdfEscape(line)}) Tj T*`),
    'ET',
  ].join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}\nendstream`,
  ];
  let output = '%PDF-1.4\n';
  const offsets = [0];
  for (let index = 0; index < objects.length; index += 1) {
    offsets.push(Buffer.byteLength(output, 'utf8'));
    output += `${index + 1} 0 obj\n${objects[index]}\nendobj\n`;
  }
  const startXref = Buffer.byteLength(output, 'utf8');
  output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`)
    .join(
      '',
    )}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF`;
  return Buffer.from(output, 'utf8');
}
