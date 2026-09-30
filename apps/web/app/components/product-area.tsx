import Link from 'next/link';

/** Used only where no data model exists yet. It is intentionally explicit: no fake records,
 * metrics, or apparently-functional controls are shown to imply an implemented feature. */
export function ProductArea({
  eyebrow,
  title,
  detail,
  nextHref,
  nextLabel,
}: {
  eyebrow: string;
  title: string;
  detail: string;
  nextHref?: string;
  nextLabel?: string;
}) {
  return (
    <section className="empty">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p>{detail}</p>
      {nextHref === undefined || nextLabel === undefined ? null : (
        <Link className="secondary" href={nextHref}>
          {nextLabel}
        </Link>
      )}
    </section>
  );
}
