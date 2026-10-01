const repositoryUrl = 'https://github.com/theworker02/VouchNet';

/**
 * A persistent feedback affordance deliberately mounted outside dismissible notices and
 * authenticated shells, so every visitor can report a problem or view project source.
 */
export function ProjectFeedback() {
  return (
    <details className="project-feedback">
      <summary>
        <svg aria-hidden="true" viewBox="0 0 20 20">
          <path d="M10 3.2a6.8 6.8 0 1 0 4.63 11.78L17 17.35v-4.1A6.8 6.8 0 0 0 10 3.2Z" />
          <path d="M7.2 9.8h5.6M7.2 12.6h3.4" />
        </svg>
        Feedback
      </summary>
      <nav aria-label="VouchNet project feedback">
        <p>Help improve VouchNet.</p>
        <a
          href={`${repositoryUrl}/issues/new?template=bug_report.yml`}
          rel="noreferrer"
          target="_blank"
        >
          Submit an issue
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
      </nav>
    </details>
  );
}
