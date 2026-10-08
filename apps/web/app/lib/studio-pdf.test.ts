import { describe, expect, it } from 'vitest';
import { buildStudioProjectSummaryPdf } from './studio-pdf';

describe('Studio project summary PDF', () => {
  it('creates a valid PDF without interpreting submitted text as PDF commands', () => {
    const document = buildStudioProjectSummaryPdf({
      orderNumber: 'VNS-20261007-TEST1234',
      customerName: 'A (test) customer',
      contactEmail: 'customer@example.com',
      businessName: null,
      packageName: 'Foundation site',
      amountPaidCents: 35000,
      stripePaymentReference: 'pi_test',
      requirements: { goals: 'Build a safer (and clearer) product site.' },
    });
    expect(document.subarray(0, 8).toString()).toBe('%PDF-1.4');
    expect(document.toString()).toContain('A \\(test\\) customer');
    expect(document.toString()).toContain('%%EOF');
  });
});
