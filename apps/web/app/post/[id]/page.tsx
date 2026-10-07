import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getPublicPost } from '../../modules/posts/service';

const siteUrl = process.env.APP_URL?.trim() || 'https://vouchnet.dev';

type Props = { params: Promise<{ id: string }> };

function excerpt(body: string, length = 160) {
  const text = body
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > length ? `${text.slice(0, length - 1)}…` : text;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getPublicPost((await params).id).catch(() => null);
  if (post === null) return { title: 'Post not found' };
  return {
    title: `${post.authorName} on VouchNet`,
    description: excerpt(post.bodyMarkdown),
    openGraph: { type: 'article', url: `${siteUrl}/post/${post.id}` },
  };
}

function PublicMarkdownBody({ body }: { body: string }) {
  return (
    <div className="post-body">
      {body
        .split(/(```[\s\S]*?```)/g)
        .filter(Boolean)
        .map((block, index) =>
          block.startsWith('```') ? (
            <pre key={index}>
              <code>{block.replace(/^```[^\n]*\n?/, '').replace(/```$/, '')}</code>
            </pre>
          ) : (
            block
              .split(/\n{2,}/)
              .map((paragraph, paragraphIndex) => (
                <p key={`${index}-${paragraphIndex}`}>{paragraph}</p>
              ))
          ),
        )}
    </div>
  );
}

export default async function PublicPostPage({ params }: Props) {
  const post = await getPublicPost((await params).id).catch(() => null);
  if (post === null) notFound();
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: excerpt(post.bodyMarkdown, 110),
    datePublished: new Date(post.createdAt).toISOString(),
    author: {
      '@type': 'Person',
      name: post.authorName,
      url: `${siteUrl}/vouch/${post.authorSlug}`,
    },
    mainEntityOfPage: `${siteUrl}/post/${post.id}`,
  };
  return (
    <main className="public-post-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <article className="post-card public-post-card">
        <header className="post-header">
          <div className="post-avatar" aria-hidden="true">
            {post.authorName
              .split(' ')
              .map((part) => part[0])
              .join('')
              .slice(0, 2)}
          </div>
          <div>
            <Link href={`/vouch/${post.authorSlug}`}>{post.authorName}</Link>
            <p>
              {post.authorHeadline ?? 'VouchNet member'} · {post.category.toLowerCase()}
            </p>
            <time dateTime={new Date(post.createdAt).toISOString()}>
              {new Date(post.createdAt).toLocaleString()}
            </time>
          </div>
        </header>
        <PublicMarkdownBody body={post.bodyMarkdown} />
        {post.mediaUrls.length > 0 ? (
          <div className="post-media">
            {post.mediaUrls.map((url) => (
              <a key={url} href={url} rel="noopener noreferrer" target="_blank">
                {url}
              </a>
            ))}
          </div>
        ) : null}
      </article>
      <p className="public-post-cta">
        <Link href="/signup">Join VouchNet</Link> to follow {post.authorName.split(' ')[0]} and see
        more verified work.
      </p>
    </main>
  );
}
