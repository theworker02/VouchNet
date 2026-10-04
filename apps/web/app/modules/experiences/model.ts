import { z } from 'zod';

export const interactiveRuntimeVersion = '1.0';
export const interactiveStorageModes = ['NONE', 'SESSION'] as const;
export type InteractiveStorageMode = (typeof interactiveStorageModes)[number];

export interface InteractiveManifest {
  name: string;
  height: number;
  /** Capabilities are purposefully unavailable in the first runtime release. */
  /** `never[]` allows only an empty array while matching the validated transport shape. */
  permissions: never[];
  network: 'NONE';
  storage: InteractiveStorageMode;
  theme: 'ADAPTIVE' | 'LIGHT' | 'DARK';
}

export interface InteractivePostContent {
  html: string;
  css: string;
  javascript: string;
  manifest: InteractiveManifest;
  version: 1;
  runtimeVersion: typeof interactiveRuntimeVersion;
}

const sourceText = (limit: number) => z.string().max(limit).default('');

export const interactivePostContentSchema = z
  .object({
    html: sourceText(32_000),
    css: sourceText(32_000),
    javascript: sourceText(64_000),
    manifest: z
      .object({
        name: z.string().trim().min(2).max(80),
        height: z.number().int().min(160).max(900).default(420),
        permissions: z.array(z.never()).max(0).default([]),
        network: z.literal('NONE').default('NONE'),
        storage: z.enum(interactiveStorageModes).default('NONE'),
        theme: z.enum(['ADAPTIVE', 'LIGHT', 'DARK']).default('ADAPTIVE'),
      })
      .strict(),
    version: z.literal(1).default(1),
    runtimeVersion: z.literal(interactiveRuntimeVersion).default(interactiveRuntimeVersion),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.html.trim().length + value.css.trim().length + value.javascript.trim().length === 0)
      context.addIssue({
        code: 'custom',
        path: ['html'],
        message: 'An Experience needs HTML, CSS, or JavaScript to render.',
      });
  });

export const experienceTemplates = [
  {
    id: 'open-to-connect',
    label: 'Open to connect',
    description: 'A clear, accessible card for people who want to start a conversation.',
    content: {
      html: '<main><p class="eyebrow">Open to connect</p><h1>Let\'s build something useful.</h1><p>I\'m interested in thoughtful conversations about engineering, research, and early-stage products.</p><button id="interest">I\'m interested</button><p id="result" aria-live="polite"></p></main>',
      css: 'body{margin:0;padding:24px;background:#f5f8ff;color:#162545;font:16px/1.5 system-ui,sans-serif}main{max-width:540px;padding:28px;border:1px solid #cbd8ef;border-radius:16px;background:#fff;box-shadow:0 16px 34px rgba(25,53,107,.12)}.eyebrow{margin:0;color:#3666c5;font-size:12px;font-weight:800;letter-spacing:.09em;text-transform:uppercase}h1{margin:10px 0;font-size:30px;line-height:1.05}button{padding:10px 14px;border:0;border-radius:8px;color:#fff;background:#2457d6;font:inherit;font-weight:750;cursor:pointer}button:hover{background:#173fa2}',
      javascript:
        "document.getElementById('interest')?.addEventListener('click',()=>{document.getElementById('result').textContent='Thanks — this demo stays inside the Experience sandbox.'})",
      manifest: {
        name: 'Open to connect',
        height: 420,
        permissions: [],
        network: 'NONE',
        storage: 'NONE',
        theme: 'ADAPTIVE',
      },
      version: 1,
      runtimeVersion: interactiveRuntimeVersion,
    } satisfies InteractivePostContent,
  },
] as const;
