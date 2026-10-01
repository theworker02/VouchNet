'use client';

import { RouteError } from '../components/route-boundary';

export default function DevelopersError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteError reset={reset} title="Developer resources could not be loaded" />;
}
