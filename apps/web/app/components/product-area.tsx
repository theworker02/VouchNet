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
    <section className="product-area">
      <div className="product-area-status" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{detail}</p>
        <div className="product-area-actions">
          {nextHref === undefined || nextLabel === undefined ? null : (
            <Link className="secondary" href={nextHref}>
              {nextLabel}
            </Link>
          )}
          <Link className="quiet-link" href="/feed">
            Return to your feed
          </Link>
        </div>
      </div>
      <p className="product-area-note">
        VouchNet only opens a surface when its permissions, data model, and safety controls are in
        place.
      </p>
    </section>
  );
}
