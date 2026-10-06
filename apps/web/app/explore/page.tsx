import { redirect } from 'next/navigation';

/** Explore became Discover in the Build in Public release; keep old links working. */
export default function ExplorePage() {
  redirect('/discover');
}
