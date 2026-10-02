'use client';

import { useEffect, useId, useRef, useState } from 'react';

const repositoryUrl = 'https://github.com/theworker02/VouchNet';

/**
 * A persistent support affordance deliberately mounted outside dismissible notices and
 * authenticated shells. Its panel is absolutely positioned from a fixed anchor so opening it
 * never shifts page content or changes position as a route renders.
 */
export function ProjectFeedback() {
  const [isOpen, setIsOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    function closeOnOutsidePointer(event: PointerEvent) {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target))
        setIsOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false);
    }

    if (!isOpen) return;
    window.addEventListener('pointerdown', closeOnOutsidePointer);
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      window.removeEventListener('pointerdown', closeOnOutsidePointer);
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [isOpen]);

  return (
    <aside ref={rootRef} className="project-feedback" aria-label="VouchNet project feedback">
      <button
        aria-controls={panelId}
        aria-expanded={isOpen}
        className="project-feedback__trigger"
        type="button"
        onClick={() => setIsOpen((open) => !open)}
      >
        <svg aria-hidden="true" viewBox="0 0 20 20">
          <path d="M10 3.2a6.8 6.8 0 1 0 4.63 11.78L17 17.35v-4.1A6.8 6.8 0 0 0 10 3.2Z" />
          <path d="M7.2 9.8h5.6M7.2 12.6h3.4" />
        </svg>
        Feedback
      </button>
      {isOpen ? (
        <section
          id={panelId}
          className="project-feedback__panel"
          aria-label="Ways to improve VouchNet"
        >
          <div className="project-feedback__heading">
            <div>
              <p className="eyebrow">Help shape VouchNet</p>
              <h2>Send the right signal.</h2>
            </div>
            <button
              aria-label="Close feedback panel"
              className="project-feedback__close"
              type="button"
              onClick={() => setIsOpen(false)}
            >
              <svg aria-hidden="true" viewBox="0 0 16 16">
                <path d="m4 4 8 8M12 4l-8 8" />
              </svg>
            </button>
          </div>
          <p className="project-feedback__copy">
            Found a problem or have an idea? The repository is the fastest way to reach the team.
          </p>
          <div className="project-feedback__actions">
            <a
              className="project-feedback__primary-link"
              href={`${repositoryUrl}/issues/new?template=bug_report.yml`}
              rel="noreferrer"
              target="_blank"
            >
              Submit an issue <span aria-hidden="true">↗</span>
            </a>
            <a
              href={`${repositoryUrl}/issues/new?template=feature_request.yml`}
              rel="noreferrer"
              target="_blank"
            >
              Request a feature
            </a>
            <a href={repositoryUrl} rel="noreferrer" target="_blank">
              View repository
            </a>
          </div>
        </section>
      ) : null}
    </aside>
  );
}
