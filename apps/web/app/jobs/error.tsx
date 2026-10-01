'use client';

import { RouteError } from '../components/route-boundary';

export default function JobsError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteError reset={reset} title="Jobs could not be loaded" />;
}
