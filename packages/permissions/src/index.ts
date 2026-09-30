/** Security vocabulary shared by every future endpoint and worker. */
export const actorTypes = [
  'HUMAN',
  'MCP_CLIENT',
  'API_CLIENT',
  'SYSTEM',
  'MODERATOR',
  'ORGANIZATION_AUTOMATION',
] as const;
export type ActorType = (typeof actorTypes)[number];

export const actionClasses = ['READ', 'PREPARE', 'COMMIT'] as const;
export type ActionClass = (typeof actionClasses)[number];

export function canActorExecute(actionClass: ActionClass, actorType: ActorType): boolean {
  if (actionClass === 'READ' || actionClass === 'PREPARE') return true;
  return actorType === 'HUMAN' || actorType === 'MODERATOR';
}

export interface ApprovalBinding {
  approvalId: string;
  userId: string;
  action: string;
  payloadHash: string;
  sessionId: string;
  expiresAt: Date;
  nonce: string;
}

export function approvalMatches(
  approval: ApprovalBinding,
  input: Pick<ApprovalBinding, 'userId' | 'action' | 'payloadHash' | 'sessionId'>,
  now = new Date(),
): boolean {
  return (
    approval.userId === input.userId &&
    approval.action === input.action &&
    approval.payloadHash === input.payloadHash &&
    approval.sessionId === input.sessionId &&
    approval.expiresAt > now
  );
}
