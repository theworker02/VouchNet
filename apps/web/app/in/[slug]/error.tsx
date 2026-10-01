'use client';

import { RouteError } from '../../components/route-boundary';

export default function ProfileError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteError reset={reset} title="This profile could not be loaded" />;
}
