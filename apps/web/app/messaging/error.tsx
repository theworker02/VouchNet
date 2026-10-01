'use client';

import { RouteError } from '../components/route-boundary';

export default function MessagingError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteError reset={reset} title="Messaging could not be loaded" />;
}
