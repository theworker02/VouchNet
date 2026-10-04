'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useMemo, useState } from 'react';
import { InteractivePostFrame } from '../../components/experiences/interactive-post-frame';
import {
  experienceTemplates,
  interactiveRuntimeVersion,
  type InteractivePostContent,
} from './model';

type SourceTab = 'HTML' | 'CSS' | 'JAVASCRIPT';

function initialContent(): InteractivePostContent {
  return structuredClone(experienceTemplates[0].content);
}

export function ExperienceComposer() {
  const router = useRouter();
  const [caption, setCaption] = useState('I built an interactive experience.');
  const [content, setContent] = useState<InteractivePostContent>(initialContent);
  const [tab, setTab] = useState<SourceTab>('HTML');
  const [status, setStatus] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const sourceValue =
    tab === 'HTML' ? content.html : tab === 'CSS' ? content.css : content.javascript;
  const sourceLabel = tab === 'JAVASCRIPT' ? 'JavaScript' : tab;
  const preview = useMemo(() => content, [content]);

  function updateSource(value: string) {
    setContent((current) =>
      tab === 'HTML'
        ? { ...current, html: value }
        : tab === 'CSS'
          ? { ...current, css: value }
          : { ...current, javascript: value },
    );
  }

  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPublishing(true);
    setStatus(null);
    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          bodyMarkdown: caption,
          category: 'PROJECT',
          visibility: 'PUBLIC',
          codeSnippets: [],
          mediaUrls: [],
          mentionedUserIds: [],
          postType: 'INTERACTIVE',
          interactiveContent: content,
        }),
      });
      if (!response.ok) {
        setStatus('The Experience could not be published. Check the caption and source fields.');
        return;
      }
      router.push('/feed');
      router.refresh();
    } catch {
      setStatus('The network is unavailable. Your Experience was not published.');
    } finally {
      setIsPublishing(false);
    }
  }

  return (
    <main className="experience-composer-page">
      <header className="experience-composer-page__heading">
        <div>
          <p className="eyebrow">VouchNet Experiences · Runtime 1.0</p>
          <h1>Create an interactive post.</h1>
          <p>
            Your code is rendered inside an isolated browser document. It has no VouchNet session,
            network access, capabilities, or persistent data access.
          </p>
        </div>
        <Link className="secondary" href="/feed">
          Back to feed
        </Link>
      </header>
      <form className="experience-composer" onSubmit={(event) => void publish(event)}>
        <label className="experience-caption">
          <span>Post caption</span>
          <textarea
            value={caption}
            minLength={1}
            maxLength={12_000}
            onChange={(event) => setCaption(event.target.value)}
            required
          />
        </label>
        <div className="experience-template-row">
          <label>
            <span>Start from a template</span>
            <select
              aria-label="Experience template"
              defaultValue={experienceTemplates[0].id}
              onChange={(event) => {
                const selected = experienceTemplates.find(
                  (template) => template.id === event.target.value,
                );
                if (selected !== undefined) setContent(structuredClone(selected.content));
              }}
            >
              {experienceTemplates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.label}
                </option>
              ))}
            </select>
          </label>
          <p>
            More templates and a visual block builder arrive after the capability model is audited.
          </p>
        </div>
        <div className="experience-workspace">
          <section className="experience-source" aria-label="Experience source editor">
            <div className="experience-source__tabs" role="tablist" aria-label="Source type">
              {(['HTML', 'CSS', 'JAVASCRIPT'] as const).map((item) => (
                <button
                  aria-selected={tab === item}
                  className={tab === item ? 'active' : ''}
                  key={item}
                  onClick={() => setTab(item)}
                  role="tab"
                  type="button"
                >
                  {item === 'JAVASCRIPT' ? 'JavaScript' : item}
                </button>
              ))}
            </div>
            <label>
              <span className="sr-only">{sourceLabel} source</span>
              <textarea
                className="experience-source__editor"
                spellCheck={false}
                value={sourceValue}
                onChange={(event) => updateSource(event.target.value)}
              />
            </label>
          </section>
          <section className="experience-preview" aria-label="Live Experience preview">
            <div className="experience-preview__heading">
              <span>Live preview</span>
              <small>Hot-reloads in an opaque-origin sandbox</small>
            </div>
            <InteractivePostFrame content={preview} label="Draft Experience" preview />
          </section>
        </div>
        <section className="experience-permissions" aria-label="Experience permissions">
          <div>
            <p className="eyebrow">Runtime permissions</p>
            <h2>No ambient authority</h2>
          </div>
          <dl>
            <div>
              <dt>Network</dt>
              <dd>None</dd>
            </div>
            <div>
              <dt>VouchNet data & actions</dt>
              <dd>Unavailable</dd>
            </div>
            <div>
              <dt>Storage</dt>
              <dd>
                {content.manifest.storage === 'SESSION' ? 'Sandbox session only' : 'Disabled'}
              </dd>
            </div>
            <div>
              <dt>Runtime</dt>
              <dd>{interactiveRuntimeVersion}</dd>
            </div>
          </dl>
        </section>
        {status === null ? null : <p className="form-error">{status}</p>}
        <div className="experience-composer__actions">
          <p>
            Publishing makes this code available to feed viewers inside the same restricted runtime.
          </p>
          <button className="primary" disabled={isPublishing} type="submit">
            {isPublishing ? 'Publishing…' : 'Publish Experience'}
          </button>
        </div>
      </form>
    </main>
  );
}
