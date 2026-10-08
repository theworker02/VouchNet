import 'server-only';

import { createHash, randomUUID } from 'node:crypto';
import { createSqlClient } from '@nexus/db';
import type Stripe from 'stripe';
import { z } from 'zod';
import { buildStudioProjectSummaryPdf } from './studio-pdf';
import { isStudioPackageId, studioPackages, type StudioPackageId } from './studio-config';
import { sendStudioProjectEmail } from './email';

const maxFileSize = 10 * 1024 * 1024;
const maxTotalFileSize = 25 * 1024 * 1024;

const requestFieldsSchema = z
  .object({
    customerName: z.string().trim().min(2).max(120),
    contactEmail: z.string().trim().email().max(254),
    businessName: z.string().trim().max(160).optional(),
    websiteUrl: z.string().trim().url().max(500).optional(),
    serviceType: z.string().trim().min(3).max(120),
    packageId: z.string(),
    goals: z.string().trim().min(40).max(8_000),
    currentSiteProblems: z.string().trim().min(20).max(8_000),
    desiredPages: z.string().trim().min(20).max(8_000),
    functionality: z.string().trim().min(20).max(8_000),
    visualPreferences: z.string().trim().min(20).max(8_000),
    referenceWebsites: z.string().trim().max(2_000).optional(),
    preferredTechnologies: z.string().trim().max(2_000).optional(),
    requirements: z.string().trim().min(20).max(8_000),
    budget: z.string().trim().min(2).max(200),
    desiredCompletionDate: z.string().date().optional(),
    acceptanceCriteria: z.string().trim().min(40).max(8_000),
    additionalInstructions: z.string().trim().max(8_000).optional(),
  })
  .strict();

type StoredRequest = {
  id: string;
  ownerId: string;
  orderNumber: string;
  customerName: string;
  contactEmail: string;
  businessName: string | null;
  packageId: StudioPackageId;
  status: string;
  depositCents: number | null;
  quoteDescription: string | null;
  stripeCheckoutSessionId: string | null;
  stripePaymentIntentId: string | null;
  requirements: Record<string, unknown>;
};

function databaseUrl() {
  const value = process.env.DATABASE_URL;
  if (value === undefined) throw new Error('DATABASE_UNAVAILABLE');
  return value;
}

function orderNumber() {
  return `VNS-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

function safeFileName(name: string) {
  const normalized = name
    .normalize('NFKC')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-');
  return normalized.slice(0, 160) || 'attachment';
}

function approvedMime(file: File, content: Buffer): string | null {
  const name = file.name.toLowerCase();
  if (
    file.type === 'application/pdf' &&
    name.endsWith('.pdf') &&
    content.subarray(0, 5).toString() === '%PDF-'
  )
    return file.type;
  if (
    file.type === 'image/png' &&
    name.endsWith('.png') &&
    content.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    return file.type;
  if (
    file.type === 'image/jpeg' &&
    (name.endsWith('.jpg') || name.endsWith('.jpeg')) &&
    content.subarray(0, 3).equals(Buffer.from([255, 216, 255]))
  )
    return file.type;
  if (
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' &&
    name.endsWith('.docx') &&
    content.subarray(0, 4).equals(Buffer.from([80, 75, 3, 4]))
  )
    return file.type;
  return null;
}

export async function createStudioRequest(userId: string, formData: FormData) {
  const raw = Object.fromEntries(
    [...formData.entries()].filter(([, value]) => typeof value === 'string'),
  );
  const parsed = requestFieldsSchema.safeParse(raw);
  if (!parsed.success)
    return { ok: false as const, error: 'VALIDATION_ERROR', details: parsed.error.flatten() };
  if (!isStudioPackageId(parsed.data.packageId))
    return { ok: false as const, error: 'INVALID_PACKAGE' };
  const files = formData
    .getAll('attachments')
    .filter((item): item is File => item instanceof File && item.size > 0);
  if (
    files.length > 5 ||
    files.some((file) => file.size > maxFileSize) ||
    files.reduce((total, file) => total + file.size, 0) > maxTotalFileSize
  )
    return { ok: false as const, error: 'UPLOAD_LIMIT_EXCEEDED' };
  const uploads = await Promise.all(
    files.map(async (file) => {
      const content = Buffer.from(await file.arrayBuffer());
      const mimeType = approvedMime(file, content);
      return mimeType === null
        ? null
        : {
            file,
            content,
            mimeType,
            safeName: safeFileName(file.name),
            sha256: createHash('sha256').update(content).digest('hex'),
          };
    }),
  );
  if (uploads.some((upload) => upload === null))
    return { ok: false as const, error: 'UNSUPPORTED_UPLOAD' };
  const packageId = parsed.data.packageId;
  const packageInfo = studioPackages[packageId];
  const status = packageId === 'CUSTOM' ? 'QUOTE_PENDING' : 'PAYMENT_PENDING';
  const sql = createSqlClient(databaseUrl());
  try {
    const request = await sql.begin(async (transaction) => {
      const rows = await transaction<{ id: string; order_number: string }[]>`
        INSERT INTO studio_requests (owner_id,order_number,customer_name,contact_email,business_name,website_url,service_type,package_id,requirements,budget,desired_completion_date,status,deposit_cents)
        VALUES (${userId},${orderNumber()},${parsed.data.customerName},${parsed.data.contactEmail.toLowerCase()},${parsed.data.businessName || null},${parsed.data.websiteUrl || null},${parsed.data.serviceType},${packageId},${JSON.stringify(parsed.data)}::jsonb,${parsed.data.budget},${parsed.data.desiredCompletionDate || null},${status},${packageInfo.depositCents})
        RETURNING id,order_number
      `;
      const created = rows[0];
      if (created === undefined) throw new Error('STUDIO_REQUEST_CREATION_FAILED');
      for (const upload of uploads) {
        if (upload === null) continue;
        await transaction`
          INSERT INTO studio_request_files (request_id,owner_id,original_name,safe_name,mime_type,file_size,sha256,content)
          VALUES (${created.id},${userId},${upload.file.name},${upload.safeName},${upload.mimeType},${upload.file.size},${upload.sha256},${upload.content})
        `;
      }
      await transaction`INSERT INTO studio_audit_events (request_id,actor_id,action,details) VALUES (${created.id},${userId},'REQUEST_CREATED',${JSON.stringify({ packageId, uploads: uploads.filter(Boolean).length })}::jsonb)`;
      return created;
    });
    return {
      ok: true as const,
      requestId: request.id,
      orderNumber: request.order_number,
      requiresQuote: packageId === 'CUSTOM',
    };
  } finally {
    await sql.end({ timeout: 1 });
  }
}

async function selectRequest(
  sql: ReturnType<typeof createSqlClient>,
  requestId: string,
): Promise<StoredRequest | null> {
  const rows = await sql<StoredRequest[]>`
    SELECT id,owner_id AS "ownerId",order_number AS "orderNumber",customer_name AS "customerName",contact_email AS "contactEmail",business_name AS "businessName",package_id AS "packageId",status,deposit_cents AS "depositCents",quote_description AS "quoteDescription",stripe_checkout_session_id AS "stripeCheckoutSessionId",stripe_payment_intent_id AS "stripePaymentIntentId",requirements
    FROM studio_requests WHERE id=${requestId}
  `;
  return rows[0] ?? null;
}

export async function getStudioRequestForOwner(userId: string, requestId: string) {
  const sql = createSqlClient(databaseUrl());
  try {
    const request = await selectRequest(sql, requestId);
    return request?.ownerId === userId ? request : null;
  } finally {
    await sql.end({ timeout: 1 });
  }
}

export async function listStudioRequestsForOwner(userId: string) {
  const sql = createSqlClient(databaseUrl());
  try {
    return await sql<
      {
        id: string;
        orderNumber: string;
        serviceType: string;
        packageId: string;
        status: string;
        depositCents: number | null;
        createdAt: Date;
      }[]
    >`
      SELECT id,order_number AS "orderNumber",service_type AS "serviceType",package_id AS "packageId",status,deposit_cents AS "depositCents",created_at AS "createdAt"
      FROM studio_requests WHERE owner_id=${userId} ORDER BY created_at DESC
    `;
  } finally {
    await sql.end({ timeout: 1 });
  }
}

export async function listStudioRequestsForAdmin() {
  const sql = createSqlClient(databaseUrl());
  try {
    return await sql<
      {
        id: string;
        orderNumber: string;
        customerName: string;
        contactEmail: string;
        serviceType: string;
        packageId: string;
        status: string;
        depositCents: number | null;
        createdAt: Date;
      }[]
    >`
      SELECT id,order_number AS "orderNumber",customer_name AS "customerName",contact_email AS "contactEmail",service_type AS "serviceType",package_id AS "packageId",status,deposit_cents AS "depositCents",created_at AS "createdAt"
      FROM studio_requests ORDER BY created_at DESC LIMIT 200
    `;
  } finally {
    await sql.end({ timeout: 1 });
  }
}

export async function recordStudioCheckout(
  requestId: string,
  userId: string,
  session: Stripe.Checkout.Session,
) {
  const sql = createSqlClient(databaseUrl());
  try {
    const updated = await sql<{ id: string }[]>`
      UPDATE studio_requests SET stripe_checkout_session_id=${session.id},updated_at=now()
      WHERE id=${requestId} AND owner_id=${userId} AND stripe_checkout_session_id IS NULL AND status IN ('PAYMENT_PENDING','QUOTE_APPROVED') RETURNING id
    `;
    if (updated[0] === undefined) throw new Error('STUDIO_REQUEST_NOT_PAYABLE');
    await sql`INSERT INTO studio_audit_events (request_id,actor_id,action,details) VALUES (${requestId},${userId},'CHECKOUT_CREATED',${JSON.stringify({ sessionId: session.id })}::jsonb)`;
  } finally {
    await sql.end({ timeout: 1 });
  }
}

export async function approveStudioQuote(
  adminId: string,
  requestId: string,
  depositCents: number,
  description: string,
) {
  const sql = createSqlClient(databaseUrl());
  try {
    const rows = await sql<{ id: string }[]>`
      UPDATE studio_requests SET deposit_cents=${depositCents},quote_description=${description},status='QUOTE_APPROVED',updated_at=now()
      WHERE id=${requestId} AND status='QUOTE_PENDING' RETURNING id
    `;
    if (rows[0] === undefined) return false;
    await sql`INSERT INTO studio_audit_events (request_id,actor_id,action,details) VALUES (${requestId},${adminId},'QUOTE_APPROVED',${JSON.stringify({ depositCents })}::jsonb)`;
    return true;
  } finally {
    await sql.end({ timeout: 1 });
  }
}

export async function updateStudioStatus(adminId: string, requestId: string, status: string) {
  const valid = ['UNDER_REVIEW', 'IN_PROGRESS', 'AWAITING_FEEDBACK', 'COMPLETED', 'CANCELLED'];
  if (!valid.includes(status)) return false;
  const sql = createSqlClient(databaseUrl());
  try {
    const rows = await sql<
      { id: string }[]
    >`UPDATE studio_requests SET status=${status},updated_at=now() WHERE id=${requestId} AND status NOT IN ('PAYMENT_PENDING','QUOTE_PENDING') RETURNING id`;
    if (rows[0] === undefined) return false;
    await sql`INSERT INTO studio_audit_events (request_id,actor_id,action,details) VALUES (${requestId},${adminId},'STATUS_UPDATED',${JSON.stringify({ status })}::jsonb)`;
    return true;
  } finally {
    await sql.end({ timeout: 1 });
  }
}

/** Signed Stripe events are deduplicated before state changes; delivery work remains retryable. */
export async function confirmStudioPayment(eventId: string, session: Stripe.Checkout.Session) {
  const requestId = session.metadata?.studioRequestId;
  if (requestId === undefined || session.payment_status !== 'paid') return false;
  const sql = createSqlClient(databaseUrl());
  try {
    return await sql.begin(async (transaction) => {
      const inserted = await transaction<{ stripe_event_id: string }[]>`
        INSERT INTO studio_payment_events (stripe_event_id,request_id,event_type) VALUES (${eventId},${requestId},'${'CHECKOUT_PAID'}')
        ON CONFLICT (stripe_event_id) DO NOTHING RETURNING stripe_event_id
      `;
      if (inserted[0] !== undefined) {
        await transaction`
          UPDATE studio_requests SET status='PAID',paid_at=now(),stripe_payment_intent_id=${typeof session.payment_intent === 'string' ? session.payment_intent : (session.payment_intent?.id ?? null)},updated_at=now()
          WHERE id=${requestId} AND stripe_checkout_session_id=${session.id}
        `;
        await transaction`INSERT INTO studio_audit_events (request_id,action,details) VALUES (${requestId},'PAYMENT_CONFIRMED',${JSON.stringify({ sessionId: session.id })}::jsonb)`;
      }
      await transaction`INSERT INTO studio_email_deliveries (request_id,delivery_type) VALUES (${requestId},'ADMIN_PROJECT_SUMMARY'),(${requestId},'CUSTOMER_CONFIRMATION') ON CONFLICT (request_id,delivery_type) DO NOTHING`;
      return true;
    });
  } finally {
    await sql.end({ timeout: 1 });
  }
}

export async function deliverStudioPaymentEmails(requestId: string) {
  const adminEmail = process.env.STUDIO_ADMIN_EMAIL?.trim();
  if (adminEmail === undefined || adminEmail.length === 0)
    throw new Error('STUDIO_ADMIN_EMAIL_UNCONFIGURED');
  const sql = createSqlClient(databaseUrl());
  try {
    const request = await selectRequest(sql, requestId);
    if (request === null || request.depositCents === null || request.status === 'PAYMENT_PENDING')
      return;
    const pdf = buildStudioProjectSummaryPdf({
      orderNumber: request.orderNumber,
      customerName: request.customerName,
      contactEmail: request.contactEmail,
      businessName: request.businessName,
      packageName: studioPackages[request.packageId].name,
      amountPaidCents: request.depositCents,
      stripePaymentReference: request.stripePaymentIntentId,
      requirements: request.requirements,
    });
    const deliver = async (type: 'ADMIN_PROJECT_SUMMARY' | 'CUSTOMER_CONFIRMATION', to: string) => {
      const locked = await sql<
        { id: string }[]
      >`UPDATE studio_email_deliveries SET status='SENDING',attempts=attempts+1,updated_at=now() WHERE request_id=${requestId} AND delivery_type=${type} AND status IN ('PENDING','FAILED') RETURNING id`;
      if (locked[0] === undefined) return;
      try {
        await sendStudioProjectEmail({
          to,
          orderNumber: request.orderNumber,
          customerName: request.customerName,
          isAdmin: type === 'ADMIN_PROJECT_SUMMARY',
          attachment: { filename: `${request.orderNumber}-project-summary.pdf`, content: pdf },
        });
        await sql`UPDATE studio_email_deliveries SET status='SENT',sent_at=now(),last_error=NULL,updated_at=now() WHERE id=${locked[0].id}`;
      } catch (error) {
        await sql`UPDATE studio_email_deliveries SET status='FAILED',last_error=${error instanceof Error ? error.message.slice(0, 500) : 'EMAIL_DELIVERY_FAILED'},updated_at=now() WHERE id=${locked[0].id}`;
        throw error;
      }
    };
    await deliver('ADMIN_PROJECT_SUMMARY', adminEmail);
    await deliver('CUSTOMER_CONFIRMATION', request.contactEmail);
  } finally {
    await sql.end({ timeout: 1 });
  }
}

export async function getStudioFileForOwner(userId: string, requestId: string, fileId: string) {
  const sql = createSqlClient(databaseUrl());
  try {
    const rows = await sql<{ safe_name: string; mime_type: string; content: Buffer }[]>`
      SELECT f.safe_name,f.mime_type,f.content FROM studio_request_files f JOIN studio_requests r ON r.id=f.request_id
      WHERE f.id=${fileId} AND f.request_id=${requestId} AND r.owner_id=${userId}
    `;
    return rows[0] ?? null;
  } finally {
    await sql.end({ timeout: 1 });
  }
}

export async function getStudioConversation(
  userId: string,
  requestId: string,
  administrator: boolean,
) {
  const sql = createSqlClient(databaseUrl());
  try {
    const permitted = administrator
      ? true
      : (
          await sql<
            { id: string }[]
          >`SELECT id FROM studio_requests WHERE id=${requestId} AND owner_id=${userId}`
        )[0] !== undefined;
    if (!permitted) return null;
    const [messages, deliverables] = await Promise.all([
      sql<
        { id: string; body: string; authorRole: string; createdAt: Date }[]
      >`SELECT id,body,author_role AS "authorRole",created_at AS "createdAt" FROM studio_project_messages WHERE request_id=${requestId} ORDER BY created_at`,
      sql<
        { id: string; fileName: string; mimeType: string; createdAt: Date }[]
      >`SELECT id,file_name AS "fileName",mime_type AS "mimeType",created_at AS "createdAt" FROM studio_deliverables WHERE request_id=${requestId} ORDER BY created_at`,
    ]);
    return { messages, deliverables };
  } finally {
    await sql.end({ timeout: 1 });
  }
}

export async function addStudioMessage(
  userId: string,
  requestId: string,
  body: string,
  administrator: boolean,
) {
  const sql = createSqlClient(databaseUrl());
  try {
    const allowed =
      administrator ||
      (
        await sql<
          { id: string }[]
        >`SELECT id FROM studio_requests WHERE id=${requestId} AND owner_id=${userId}`
      )[0] !== undefined;
    if (!allowed) return false;
    await sql`INSERT INTO studio_project_messages (request_id,author_id,author_role,body) VALUES (${requestId},${userId},${administrator ? 'ADMIN' : 'CUSTOMER'},${body})`;
    await sql`INSERT INTO studio_audit_events (request_id,actor_id,action) VALUES (${requestId},${userId},'MESSAGE_ADDED')`;
    return true;
  } finally {
    await sql.end({ timeout: 1 });
  }
}
