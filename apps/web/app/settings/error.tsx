'use client';

import { RouteError } from '../components/route-boundary';

export default function SettingsError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteError reset={reset} title="Settings could not be loaded" />;
}
