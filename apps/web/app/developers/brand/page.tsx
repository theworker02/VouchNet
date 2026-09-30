import Link from 'next/link';

export default function BrandPage() {
  return (
    <>
      <Link className="quiet-link" href="/developers">
        ← Developer resources
      </Link>
      <p className="eyebrow">Brand kit</p>
      <h1>The VouchNet mark.</h1>
      <p className="developer-intro">
        Use the official wordmark and mark to identify VouchNet accurately. Do not imply
        endorsement, alter the mark, or use it beside deceptive or automated activity.
      </p>
      <section className="brand-preview">
        <img alt="VouchNet mark" height="120" src="/brand/vouchnet-mark.svg" width="120" />
        <div>
          <strong>VouchNet</strong>
          <span>Evidence over noise.</span>
        </div>
      </section>
      <div className="developer-link-list">
        <a download href="/brand/vouchnet-mark.svg">
          Download SVG mark
        </a>
        <a download href="/brand/vouchnet-mark.png">
          Download PNG mark
        </a>
        <a href="https://github.com/theworker02/VouchNet/blob/master/docs/BRAND.md">
          Read brand guidance
        </a>
      </div>
    </>
  );
}
