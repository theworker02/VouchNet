import { z } from 'zod';
import { employmentTypes, locationTypes, rateUnits } from './profile-catalog';

export const experienceSchema = z.object({
  title: z.string().trim().min(1).max(160),
  organization: z.string().trim().min(1).max(160),
  employmentType: z.enum(employmentTypes),
  location: z
    .string()
    .trim()
    .max(160)
    .transform((value) => (value === '' ? null : value))
    .optional()
    .default(''),
  locationType: z.enum(locationTypes).nullish().default(null),
  startMonth: z.number().int().min(1).max(12).nullish().default(null),
  startYear: z.number().int().min(1950).max(2100),
  endMonth: z.number().int().min(1).max(12).nullish().default(null),
  endYear: z.number().int().min(1950).max(2100).nullish().default(null),
  isCurrent: z.boolean().default(false),
  description: z
    .string()
    .trim()
    .max(4_000)
    .transform((value) => (value === '' ? null : value))
    .optional()
    .default(''),
});

export const serviceSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z
    .string()
    .trim()
    .max(2_000)
    .transform((value) => (value === '' ? null : value))
    .optional()
    .default(''),
  rateAmount: z.number().nonnegative().max(10_000_000).nullish().default(null),
  rateCurrency: z
    .string()
    .trim()
    .regex(/^[A-Z]{3}$/)
    .default('USD'),
  rateUnit: z.enum(rateUnits).default('HOURLY'),
  active: z.boolean().default(true),
});

export const serviceRequestSchema = z.object({
  providerUserId: z.string().uuid(),
  serviceId: z.string().uuid().nullish().default(null),
  message: z.string().trim().min(10).max(4_000),
});

export const rateSchema = z.object({
  amount: z.number().nonnegative().max(10_000_000).nullish().default(null),
  currency: z
    .string()
    .trim()
    .regex(/^[A-Z]{3}$/)
    .default('USD'),
  visible: z.boolean().default(false),
});
