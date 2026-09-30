import { describe, expect, it } from 'vitest';
import { parseEnvironment } from './index.js';

describe('parseEnvironment', () => {
  it('rejects an insufficient session secret', () => {
    expect(() =>
      parseEnvironment({
        DATABASE_URL: 'postgresql://localhost/nexus',
        REDIS_URL: 'redis://localhost:6379',
        SESSION_SECRET: 'too-short',
      }),
    ).toThrow();
  });
});
