'use client';

import { RouteError } from '../components/route-boundary';

export default function GamesError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteError reset={reset} title="Today’s game could not be loaded" />;
}
