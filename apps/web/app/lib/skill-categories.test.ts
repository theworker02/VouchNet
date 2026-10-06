import { describe, expect, it } from 'vitest';
import { categoryForSkill, milestoneFor, summarizeSkillCategories } from './skill-categories';

describe('skill categories and accolade milestones', () => {
  it('maps skills with a transparent keyword table', () => {
    expect(categoryForSkill('Rust')).toBe('SYSTEMS');
    expect(categoryForSkill('UI/UX')).toBe('DESIGN');
    expect(categoryForSkill('Project Leadership')).toBe('LEADERSHIP');
    expect(categoryForSkill('Technical Writing')).toBe('WRITING');
    expect(categoryForSkill('Open Source')).toBe('OPEN_SOURCE');
    expect(categoryForSkill('Software Engineering')).toBe('ENGINEERING');
    expect(categoryForSkill('Woodworking')).toBe('CRAFT');
  });

  it('levels milestones by distinct vouch count', () => {
    expect(milestoneFor(0)).toEqual({ tier: 0, label: 'Not yet vouched', next: 1 });
    expect(milestoneFor(1).tier).toBe(1);
    expect(milestoneFor(3)).toEqual({ tier: 2, label: 'Recognized', next: 7 });
    expect(milestoneFor(7).tier).toBe(3);
    expect(milestoneFor(40)).toEqual({ tier: 4, label: 'Exemplary', next: null });
  });

  it('counts distinct people per category, not skill mentions', () => {
    const summary = summarizeSkillCategories([
      { id: 'v1', authorId: 'a', skills: ['Rust', 'C++'] },
      { id: 'v2', authorId: 'b', skills: ['Rust', 'Technical Writing'] },
    ]);
    expect(summary[0]).toMatchObject({ id: 'SYSTEMS', count: 2, authorIds: ['a', 'b'] });
    expect(summary.find((item) => item.id === 'WRITING')?.count).toBe(1);
  });
});
