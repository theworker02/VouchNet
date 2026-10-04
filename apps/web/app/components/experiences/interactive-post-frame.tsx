'use client';

import { useMemo } from 'react';
import type { InteractivePostContent } from '../../modules/experiences/model';
import { createSandboxDocument } from '../../modules/experiences/sandbox-document';

export function InteractivePostFrame({
  content,
  label,
  preview = false,
}: {
  content: InteractivePostContent;
  label?: string;
  preview?: boolean;
}) {
  const document = useMemo(() => createSandboxDocument(content), [content]);
  return (
    <section className={preview ? 'experience-frame experience-frame-preview' : 'experience-frame'}>
      <div className="experience-frame__chrome">
        <span>VouchNet Experience</span>
        <strong>{label ?? content.manifest.name}</strong>
        <small>Isolated runtime · no network</small>
      </div>
      <iframe
        className="experience-frame__content"
        sandbox="allow-scripts"
        referrerPolicy="no-referrer"
        scrolling="no"
        srcDoc={document}
        style={{ height: content.manifest.height }}
        title={`${label ?? content.manifest.name} interactive experience`}
      />
    </section>
  );
}
