import { z } from 'zod';

const httpUrl = z
  .string()
  .trim()
  .max(2048)
  .url()
  .refine((value) => /^https?:\/\//i.test(value), 'URL must use http or https');

const optionalText = (maximum: number) =>
  z
    .string()
    .trim()
    .max(maximum)
    .transform((value) => value || null);

const optionalUrl = z
  .string()
  .trim()
  .max(2048)
  .transform((value) => value || null)
  .pipe(z.union([httpUrl, z.null()]));

export const organizationTechnologyCategories = [
  'LANGUAGE',
  'FRAMEWORK',
  'PLATFORM',
  'INFRASTRUCTURE',
  'DATA',
  'PRACTICE',
] as const;

export type OrganizationTechnologyCategory = (typeof organizationTechnologyCategories)[number];

export const organizationProfileSchema = z
  .object({
    name: z.string().trim().min(2).max(160),
    tagline: optionalText(240),
    description: z.string().trim().min(20).max(6000),
    headquarters: optionalText(160),
    websiteUrl: httpUrl,
    careersUrl: optionalUrl,
    engineeringUrl: optionalUrl,
    repositoryUrl: optionalUrl,
    technologies: z
      .array(
        z
          .object({
            name: z.string().trim().min(1).max(80),
            category: z.enum(organizationTechnologyCategories),
            sourceUrl: httpUrl,
          })
          .strict(),
      )
      .max(30)
      .superRefine((values, context) => {
        const seen = new Set<string>();
        values.forEach((value, index) => {
          const key = value.name.toLocaleLowerCase();
          if (seen.has(key))
            context.addIssue({
              code: 'custom',
              message: 'Technology names must be unique.',
              path: [index, 'name'],
            });
          seen.add(key);
        });
      }),
  })
  .strict();

export type OrganizationProfileInput = z.infer<typeof organizationProfileSchema>;
