import Link from 'next/link';

const columns = [
  {
    title: 'Network',
    links: [
      { href: '/explore', label: 'Explore people' },
      { href: '/discover', label: 'Discover' },
      { href: '/jobs', label: 'Jobs' },
      { href: '/opportunities', label: 'Opportunities' },
    ],
  },
  {
    title: 'Product',
    links: [
      { href: '/about', label: 'How VouchNet works' },
      { href: '/download', label: 'Desktop app' },
      { href: '/developers', label: 'Developers' },
      { href: '/games', label: 'Strategy games' },
    ],
  },
  {
    title: 'Company',
    links: [
      { href: 'https://github.com/theworker02/VouchNet', label: 'Repository', external: true },
      { href: '/privacy', label: 'Privacy' },
      { href: '/terms', label: 'Terms' },
    ],
  },
] as const;

export function PublicFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-grid">
        <div className="site-footer-brand">
          <span className="brand">VouchNet</span>
          <p>Humans participate. AI is an explicitly authorized tool.</p>
        </div>
        {columns.map((column) => (
          <nav
            aria-label={`${column.title} links`}
            className="site-footer-column"
            key={column.title}
          >
            <h2>{column.title}</h2>
            {column.links.map((link) =>
              'external' in link && link.external ? (
                <a href={link.href} key={link.href} rel="noreferrer" target="_blank">
                  {link.label} ↗
                </a>
              ) : (
                <Link href={link.href} key={link.href}>
                  {link.label}
                </Link>
              ),
            )}
          </nav>
        ))}
      </div>
      <div className="site-footer-base">
        <span>VouchNet — a professional network where proof travels with your work.</span>
      </div>
    </footer>
  );
}
