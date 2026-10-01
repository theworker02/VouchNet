'use client';

import { RouteError } from '../components/route-boundary';

export default function FeedError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteError reset={reset} title="Your feed could not be loaded" />;
}
