import { describe, expect, it } from 'vitest';
import { canRunConnectionCommand, nextConnectionState } from './index.js';
describe('social graph invariants', () => {
  it('prevents non-human social commits', () =>
    expect(canRunConnectionCommand('MCP_CLIENT', 'send', false, false)).toBe(false));
  it('prevents self-connections and duplicate transitions', () => {
    expect(canRunConnectionCommand('HUMAN', 'send', true, false)).toBe(false);
    expect(() => nextConnectionState('ACCEPTED', 'send')).toThrow('INVALID_CONNECTION_TRANSITION');
  });
});
