import { describe, expect, it } from 'vitest';
import { interactiveRuntimeVersion, type InteractivePostContent } from './model';
import { createSandboxDocument } from './sandbox-document';

const experience: InteractivePostContent = {
  html: '<main>Safe preview</main>',
  css: 'main { color: red; }',
  javascript: 'window.parent.postMessage({ attempt: true }, "*")',
  manifest: {
    name: 'Safe preview',
    height: 420,
    permissions: [],
    network: 'NONE',
    storage: 'NONE',
    theme: 'ADAPTIVE',
  },
  version: 1,
  runtimeVersion: interactiveRuntimeVersion,
};

describe('createSandboxDocument', () => {
  it('blocks networked and privileged browser capabilities with an internal CSP', () => {
    const document = createSandboxDocument(experience);
    expect(document).toContain("connect-src 'none'");
    expect(document).toContain("form-action 'none'");
    expect(document).toContain("worker-src 'none'");
    expect(document).toContain('<main>Safe preview</main>');
  });

  it('does not allow user source to close the host script or stylesheet wrapper', () => {
    const document = createSandboxDocument({
      ...experience,
      css: '</style><img src="https://untrusted.example">',
      javascript: '</script><img src="https://untrusted.example">',
    });
    expect(document).not.toContain('</style><img');
    expect(document).not.toContain('</script><img');
  });
});
