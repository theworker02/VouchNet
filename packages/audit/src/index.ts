import type { ActorType } from '@nexus/permissions';

export interface AuditEventInput {
  actorType: ActorType;
  actorId: string | null;
  userId: string | null;
  operation: string;
  resourceType: string;
  resourceId: string | null;
  requestId: string;
  result: 'ALLOWED' | 'DENIED' | 'FAILED';
  policyDecision: string;
}

/** Payloads and credentials are intentionally absent from the append-only event contract. */
export interface AuditWriter {
  append(event: AuditEventInput): Promise<void>;
}
