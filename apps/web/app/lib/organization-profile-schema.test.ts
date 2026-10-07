import { describe, expect, it } from 'vitest';
import { organizationProfileSchema } from './organization-profile-schema';

const validProfile = {
  name: 'Example Systems',
  tagline: 'Reliable distributed systems',
  description: 'We build reliable distributed systems for developers and infrastructure teams.',
  headquarters: 'Remote-first',
  websiteUrl: 'https://example.com',
  careersUrl: 'https://example.com/careers',
  engineeringUrl: '',
  repositoryUrl: 'https://github.com/example',
  technologies: [
    {
      name: 'TypeScript',
      category: 'LANGUAGE',
      sourceUrl: 'https://example.com/engineering',
    },
  ],
};

describe('organizationProfileSchema', () => {
  it('normalizes optional public fields without accepting unknown input', () => {
    const result = organizationProfileSchema.parse(validProfile);
    expect(result.engineeringUrl).toBeNull();
    expect(result.tagline).toBe('Reliable distributed systems');
  });

  it('rejects duplicate technology signals and non-http URLs', () => {
    expect(
      organizationProfileSchema.safeParse({
        ...validProfile,
        technologies: [
          ...validProfile.technologies,
          { ...validProfile.technologies[0], name: 'typescript' },
        ],
      }).success,
    ).toBe(false);
    expect(
      organizationProfileSchema.safeParse({ ...validProfile, websiteUrl: 'javascript:alert(1)' })
        .success,
    ).toBe(false);
  });
});
