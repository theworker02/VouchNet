import 'server-only';
import { createSqlClient } from '@nexus/db';

/**
 * Structured profile content: work experience entries, offered services with rates, and
 * formal service requests. Experiences use the pre-existing `experiences` table; services
 * and requests come from migration 0032.
 */

function sql() {
  const url = process.env.DATABASE_URL;
  if (url === undefined) throw new Error('DATABASE_UNAVAILABLE');
  return createSqlClient(url);
}

export {
  employmentTypeLabels,
  employmentTypes,
  locationTypeLabels,
  locationTypes,
  rateUnitLabels,
  rateUnits,
} from './profile-catalog';
import type { EmploymentType, LocationType, RateUnit } from './profile-catalog';

export interface ExperienceInput {
  title: string;
  organization: string;
  employmentType: EmploymentType;
  location: string | null;
  locationType: LocationType | null;
  startMonth: number | null;
  startYear: number;
  endMonth: number | null;
  endYear: number | null;
  isCurrent: boolean;
  description: string | null;
}

export interface ExperienceEntry extends ExperienceInput {
  id: string;
}

interface ExperienceRow {
  id: string;
  title: string;
  organization: string;
  employment_type: string;
  location: string | null;
  location_type: string | null;
  start_month: number | null;
  start_year: number;
  end_month: number | null;
  end_year: number | null;
  is_current: boolean;
  description: string | null;
}

function mapExperience(row: ExperienceRow): ExperienceEntry {
  return {
    id: row.id,
    title: row.title,
    organization: row.organization,
    employmentType: row.employment_type as EmploymentType,
    location: row.location,
    locationType: (row.location_type as LocationType | null) ?? null,
    startMonth: row.start_month,
    startYear: row.start_year,
    endMonth: row.end_month,
    endYear: row.end_year,
    isCurrent: row.is_current,
    description: row.description,
  };
}

export async function listExperiences(userId: string): Promise<ExperienceEntry[]> {
  const client = sql();
  try {
    const rows = await client<ExperienceRow[]>`
      SELECT id,title,organization,employment_type,location,location_type,
             start_month,start_year,end_month,end_year,is_current,description
      FROM experiences WHERE user_id=${userId}
      ORDER BY is_current DESC, start_year DESC, start_month DESC NULLS LAST, created_at DESC
    `;
    return rows.map(mapExperience);
  } finally {
    await client.end({ timeout: 1 });
  }
}

export async function createExperience(
  userId: string,
  input: ExperienceInput,
): Promise<ExperienceEntry> {
  const client = sql();
  try {
    const rows = await client<ExperienceRow[]>`
      INSERT INTO experiences
        (user_id,title,organization,employment_type,location,location_type,
         start_month,start_year,end_month,end_year,is_current,description)
      VALUES (${userId},${input.title},${input.organization},${input.employmentType},
              ${input.location},${input.locationType},${input.startMonth},${input.startYear},
              ${input.endMonth},${input.endYear},${input.isCurrent},${input.description})
      RETURNING id,title,organization,employment_type,location,location_type,
                start_month,start_year,end_month,end_year,is_current,description
    `;
    return mapExperience(rows[0]!);
  } finally {
    await client.end({ timeout: 1 });
  }
}

export async function updateExperience(
  userId: string,
  experienceId: string,
  input: ExperienceInput,
): Promise<ExperienceEntry | null> {
  const client = sql();
  try {
    const rows = await client<ExperienceRow[]>`
      UPDATE experiences SET
        title=${input.title},organization=${input.organization},
        employment_type=${input.employmentType},location=${input.location},
        location_type=${input.locationType},start_month=${input.startMonth},
        start_year=${input.startYear},end_month=${input.endMonth},end_year=${input.endYear},
        is_current=${input.isCurrent},description=${input.description},updated_at=now()
      WHERE id=${experienceId} AND user_id=${userId}
      RETURNING id,title,organization,employment_type,location,location_type,
                start_month,start_year,end_month,end_year,is_current,description
    `;
    return rows[0] === undefined ? null : mapExperience(rows[0]);
  } finally {
    await client.end({ timeout: 1 });
  }
}

export async function deleteExperience(userId: string, experienceId: string): Promise<boolean> {
  const client = sql();
  try {
    const rows = await client<{ id: string }[]>`
      DELETE FROM experiences WHERE id=${experienceId} AND user_id=${userId} RETURNING id
    `;
    return rows.length === 1;
  } finally {
    await client.end({ timeout: 1 });
  }
}

export interface ProfileService {
  id: string;
  title: string;
  description: string | null;
  rateAmount: string | null;
  rateCurrency: string;
  rateUnit: RateUnit;
  active: boolean;
}

interface ServiceRow {
  id: string;
  title: string;
  description: string | null;
  rate_amount: string | null;
  rate_currency: string;
  rate_unit: string;
  active: boolean;
}

function mapService(row: ServiceRow): ProfileService {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    rateAmount: row.rate_amount,
    rateCurrency: row.rate_currency,
    rateUnit: row.rate_unit as RateUnit,
    active: row.active,
  };
}

export interface ServiceInput {
  title: string;
  description: string | null;
  rateAmount: number | null;
  rateCurrency: string;
  rateUnit: RateUnit;
  active: boolean;
}

export async function listProfileServices(
  userId: string,
  includeInactive = false,
): Promise<ProfileService[]> {
  const client = sql();
  try {
    const rows = await client<ServiceRow[]>`
      SELECT id,title,description,rate_amount,rate_currency,rate_unit,active
      FROM profile_services WHERE user_id=${userId}
        ${includeInactive ? client`` : client`AND active`}
      ORDER BY display_order,created_at
    `;
    return rows.map(mapService);
  } finally {
    await client.end({ timeout: 1 });
  }
}

export async function createService(userId: string, input: ServiceInput): Promise<ProfileService> {
  const client = sql();
  try {
    const rows = await client<ServiceRow[]>`
      INSERT INTO profile_services
        (user_id,title,description,rate_amount,rate_currency,rate_unit,active)
      VALUES (${userId},${input.title},${input.description},${input.rateAmount},
              ${input.rateCurrency},${input.rateUnit},${input.active})
      RETURNING id,title,description,rate_amount,rate_currency,rate_unit,active
    `;
    return mapService(rows[0]!);
  } finally {
    await client.end({ timeout: 1 });
  }
}

export async function updateService(
  userId: string,
  serviceId: string,
  input: ServiceInput,
): Promise<ProfileService | null> {
  const client = sql();
  try {
    const rows = await client<ServiceRow[]>`
      UPDATE profile_services SET
        title=${input.title},description=${input.description},rate_amount=${input.rateAmount},
        rate_currency=${input.rateCurrency},rate_unit=${input.rateUnit},active=${input.active},
        updated_at=now()
      WHERE id=${serviceId} AND user_id=${userId}
      RETURNING id,title,description,rate_amount,rate_currency,rate_unit,active
    `;
    return rows[0] === undefined ? null : mapService(rows[0]);
  } finally {
    await client.end({ timeout: 1 });
  }
}

export async function deleteService(userId: string, serviceId: string): Promise<boolean> {
  const client = sql();
  try {
    const rows = await client<{ id: string }[]>`
      DELETE FROM profile_services WHERE id=${serviceId} AND user_id=${userId} RETURNING id
    `;
    return rows.length === 1;
  } finally {
    await client.end({ timeout: 1 });
  }
}

export interface ProfileRate {
  amount: string | null;
  currency: string;
  visible: boolean;
}

export async function getProfileRate(userId: string): Promise<ProfileRate> {
  const client = sql();
  try {
    const rows = await client<
      { hourly_rate_amount: string | null; hourly_rate_currency: string; rate_visible: boolean }[]
    >`
      SELECT hourly_rate_amount,hourly_rate_currency,rate_visible
      FROM profiles WHERE user_id=${userId}
    `;
    const row = rows[0];
    return {
      amount: row?.hourly_rate_amount ?? null,
      currency: row?.hourly_rate_currency ?? 'USD',
      visible: row?.rate_visible ?? false,
    };
  } finally {
    await client.end({ timeout: 1 });
  }
}

export async function setProfileRate(
  userId: string,
  rate: { amount: number | null; currency: string; visible: boolean },
): Promise<void> {
  const client = sql();
  try {
    await client`
      UPDATE profiles
      SET hourly_rate_amount=${rate.amount},hourly_rate_currency=${rate.currency},
          rate_visible=${rate.visible},updated_at=now()
      WHERE user_id=${userId}
    `;
  } finally {
    await client.end({ timeout: 1 });
  }
}

export type ServiceRequestStatus = 'OPEN' | 'ACCEPTED' | 'DECLINED' | 'WITHDRAWN';

export interface ServiceRequest {
  id: string;
  serviceTitle: string | null;
  providerUserId: string;
  requesterUserId: string;
  requesterName: string;
  requesterSlug: string;
  message: string;
  status: ServiceRequestStatus;
  createdAt: Date;
}

interface RequestRow {
  id: string;
  service_title: string | null;
  provider_user_id: string;
  requester_user_id: string;
  requester_name: string;
  requester_slug: string;
  message: string;
  status: string;
  created_at: Date;
}

function mapRequest(row: RequestRow): ServiceRequest {
  return {
    id: row.id,
    serviceTitle: row.service_title,
    providerUserId: row.provider_user_id,
    requesterUserId: row.requester_user_id,
    requesterName: row.requester_name,
    requesterSlug: row.requester_slug,
    message: row.message,
    status: row.status as ServiceRequestStatus,
    createdAt: row.created_at,
  };
}

/** Creates a formal service request. Only to active services or open-rate profiles. */
export async function createServiceRequest(
  requesterUserId: string,
  providerUserId: string,
  serviceId: string | null,
  message: string,
): Promise<ServiceRequest | 'SELF' | null> {
  if (requesterUserId === providerUserId) return 'SELF';
  const client = sql();
  try {
    const rows = await client<RequestRow[]>`
      INSERT INTO service_requests (service_id,provider_user_id,requester_user_id,message)
      SELECT ${serviceId},${providerUserId},${requesterUserId},${message}
      WHERE EXISTS (SELECT 1 FROM profiles WHERE user_id=${providerUserId})
        AND (${serviceId}::uuid IS NULL OR EXISTS (
          SELECT 1 FROM profile_services
          WHERE id=${serviceId} AND user_id=${providerUserId} AND active
        ))
      RETURNING id,NULL AS service_title,provider_user_id,requester_user_id,
             '' AS requester_name,'' AS requester_slug,message,status,created_at
    `;
    return rows[0] === undefined ? null : mapRequest(rows[0]);
  } finally {
    await client.end({ timeout: 1 });
  }
}

export async function listServiceRequests(
  userId: string,
  direction: 'received' | 'sent',
): Promise<ServiceRequest[]> {
  const client = sql();
  try {
    const rows =
      direction === 'received'
        ? await client<RequestRow[]>`
            SELECT r.id,s.title AS service_title,r.provider_user_id,r.requester_user_id,
                   p.first_name || ' ' || p.last_name AS requester_name,p.slug AS requester_slug,
                   r.message,r.status,r.created_at
            FROM service_requests r
            JOIN profiles p ON p.user_id=r.requester_user_id
            LEFT JOIN profile_services s ON s.id=r.service_id
            WHERE r.provider_user_id=${userId}
            ORDER BY r.created_at DESC LIMIT 100
          `
        : await client<RequestRow[]>`
            SELECT r.id,s.title AS service_title,r.provider_user_id,r.requester_user_id,
                   p.first_name || ' ' || p.last_name AS requester_name,p.slug AS requester_slug,
                   r.message,r.status,r.created_at
            FROM service_requests r
            JOIN profiles p ON p.user_id=r.provider_user_id
            LEFT JOIN profile_services s ON s.id=r.service_id
            WHERE r.requester_user_id=${userId}
            ORDER BY r.created_at DESC LIMIT 100
          `;
    return rows.map(mapRequest);
  } finally {
    await client.end({ timeout: 1 });
  }
}

export async function updateServiceRequestStatus(
  userId: string,
  requestId: string,
  status: ServiceRequestStatus,
): Promise<boolean> {
  const client = sql();
  try {
    // Providers accept/decline; requesters withdraw their own open request.
    const rows = await client<{ id: string }[]>`
      UPDATE service_requests SET status=${status},updated_at=now()
      WHERE id=${requestId}
        AND (
          (provider_user_id=${userId} AND status='OPEN' AND ${status} IN ('ACCEPTED','DECLINED'))
          OR (requester_user_id=${userId} AND status='OPEN' AND ${status}='WITHDRAWN')
        )
      RETURNING id
    `;
    return rows.length === 1;
  } finally {
    await client.end({ timeout: 1 });
  }
}
