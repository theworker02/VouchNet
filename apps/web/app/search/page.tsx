import { Shell } from '../components/shell';
import Link from 'next/link';
import { getCurrentActor } from '../lib/identity';
import { searchPeople } from '../lib/people';
export default async function Search({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const query = (await searchParams).q?.trim();
  const actor = await getCurrentActor();
  const results =
    actor !== null && query !== undefined ? await searchPeople(actor.userId, query) : [];
  return (
    <Shell>
      <p className="eyebrow">Discover</p>
      <h1>Find professionals</h1>
      <form className="search-form">
        <label className="sr-only" htmlFor="q">
          Search people
        </label>
        <input id="q" name="q" defaultValue={query} placeholder="Name, skill, company, or school" />
        <button>Search</button>
      </form>
      {query === undefined ? (
        <section className="empty">
          <h2>Search respects profile privacy</h2>
          <p>
            Find people by name, headline, or location. Only discoverable profile information
            appears here.
          </p>
        </section>
      ) : results.length === 0 ? (
        <section className="empty">
          <h2>No people matched “{query}”</h2>
          <p>Try a name, headline, or location.</p>
        </section>
      ) : (
        <section className="empty-grid">
          {results.map((person) => (
            <article key={person.userId}>
              <h2>
                {person.firstName} {person.lastName}
              </h2>
              <p>{person.headline ?? 'VouchNet member'}</p>
              {person.location === null ? null : <p>{person.location}</p>}
              <Link href={`/in/${person.slug}`}>View profile</Link>
            </article>
          ))}
        </section>
      )}
    </Shell>
  );
}
