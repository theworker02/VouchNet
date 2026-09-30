import { describe, expect, it } from 'vitest';
import { approvalMatches, canActorExecute } from './index.js';

describe('human and machine principals', () => {
  it('does not allow MCP clients to commit social actions', () => {
    expect(canActorExecute('COMMIT', 'MCP_CLIENT')).toBe(false);
  });

  it('invalidates an approval if the payload changes', () => {
    const approval = {
      approvalId: 'a',
      userId: 'u',
      action: 'post.publish',
      payloadHash: 'original',
      sessionId: 's',
      nonce: 'n',
      expiresAt: new Date(Date.now() + 60_000),
    };
    expect(
      approvalMatches(approval, {
        userId: 'u',
        action: 'post.publish',
        payloadHash: 'altered',
        sessionId: 's',
      }),
    ).toBe(false);
  });
});
