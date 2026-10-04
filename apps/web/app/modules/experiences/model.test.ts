import { describe, expect, it } from 'vitest';
import { interactivePostContentSchema, interactiveRuntimeVersion } from './model';

const validExperience = {
  html: '<button>Interact</button>',
  css: '',
  javascript: '',
  manifest: {
    name: 'Test experience',
    height: 420,
    permissions: [],
    network: 'NONE',
    storage: 'NONE',
    theme: 'ADAPTIVE',
  },
  version: 1,
  runtimeVersion: interactiveRuntimeVersion,
};

describe('interactivePostContentSchema', () => {
  it('accepts only the first zero-capability runtime manifest', () => {
    expect(interactivePostContentSchema.parse(validExperience).manifest.permissions).toEqual([]);
  });

  it('rejects non-empty capability grants and network access', () => {
    expect(() =>
      interactivePostContentSchema.parse({
        ...validExperience,
        manifest: { ...validExperience.manifest, permissions: ['PROFILE_OPEN'] },
      }),
    ).toThrow();
    expect(() =>
      interactivePostContentSchema.parse({
        ...validExperience,
        manifest: { ...validExperience.manifest, network: 'PUBLIC' },
      }),
    ).toThrow();
  });
});
