import { z } from 'zod';

export const organizationClaimRelationships = [
  'FOUNDER',
  'EXECUTIVE',
  'EMPLOYEE',
  'AUTHORIZED_REPRESENTATIVE',
] as const;

export const organizationClaimRequestSchema = z
  .object({
    relationship: z.enum(organizationClaimRelationships),
    statement: z.string().trim().min(20).max(2_400),
  })
  .strict();

export type OrganizationClaimRequestInput = z.infer<typeof organizationClaimRequestSchema>;

export const assignOrganizationRoleSchema = z
  .object({
    userId: z.uuid(),
    role: z.enum(['ADMIN', 'EDITOR', 'MEMBER']),
  })
  .strict();

export const reviewOrganizationClaimSchema = z
  .object({
    decision: z.enum(['APPROVE', 'REJECT']),
    reviewNote: z.string().trim().max(1_200).optional(),
  })
  .strict();
