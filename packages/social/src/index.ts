import type { ActorType } from '@nexus/permissions';

export type ConnectionState =
  'PENDING' | 'ACCEPTED' | 'DECLINED' | 'WITHDRAWN' | 'REMOVED' | 'BLOCKED';
export type ConnectionCommand = 'send' | 'accept' | 'decline' | 'withdraw' | 'remove';
export function canRunConnectionCommand(
  actor: ActorType,
  command: ConnectionCommand,
  sameUser: boolean,
  blocked: boolean,
): boolean {
  if (actor !== 'HUMAN' && actor !== 'MODERATOR') return false;
  return !sameUser && !blocked && command !== undefined;
}
export function nextConnectionState(
  current: ConnectionState | null,
  command: ConnectionCommand,
): ConnectionState {
  const allowed: Record<string, Partial<Record<ConnectionCommand, ConnectionState>>> = {
    NONE: { send: 'PENDING' },
    PENDING: { accept: 'ACCEPTED', decline: 'DECLINED', withdraw: 'WITHDRAWN' },
    ACCEPTED: { remove: 'REMOVED' },
  };
  const next = allowed[current ?? 'NONE']?.[command];
  if (next === undefined) throw new Error('INVALID_CONNECTION_TRANSITION');
  return next;
}
export function canonicalPair(leftUserId: string, rightUserId: string): [string, string] {
  return leftUserId < rightUserId ? [leftUserId, rightUserId] : [rightUserId, leftUserId];
}
export function recommendationReasons(input: {
  mutual: number;
  sharedSkills: number;
  sharedOrganization: boolean;
}): string[] {
  return [
    input.mutual > 0 ? 'MUTUAL_CONNECTIONS' : null,
    input.sharedSkills > 0 ? 'SHARED_SKILLS' : null,
    input.sharedOrganization ? 'SHARED_ORGANIZATION' : null,
  ].filter((value): value is string => value !== null);
}
