import { z } from 'zod';

const environmentSchema = z.object({
  DATABASE_URL: z.url(),
  REDIS_URL: z.url(),
  NEXUS_ENV: z.enum(['development', 'test', 'production']).default('development'),
  SESSION_SECRET: z.string().min(32),
  RESEND_API_KEY: z.string().startsWith('re_').optional(),
  EMAIL_FROM: z.string().min(3).max(320).optional(),
  APP_URL: z.url().optional(),
});

export type NexusEnvironment = z.infer<typeof environmentSchema>;

export function parseEnvironment(environment: NodeJS.ProcessEnv): NexusEnvironment {
  return environmentSchema.parse(environment);
}

export const rateLimitPolicies = {
  publicRead: { windowSeconds: 60, maxRequests: 120 },
  authenticatedRead: { windowSeconds: 60, maxRequests: 240 },
  sensitiveWrite: { windowSeconds: 60, maxRequests: 30 },
  credentialManagement: { windowSeconds: 3600, maxRequests: 10 },
} as const;

export type RateLimitPolicyName = keyof typeof rateLimitPolicies;
