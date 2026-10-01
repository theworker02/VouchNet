'use client';

import { RouteError } from '../../components/route-boundary';

export default function CompanyError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteError reset={reset} title="This organization could not be loaded" />;
}
